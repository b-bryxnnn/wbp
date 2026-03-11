// Socket.io server for admin control, voting, online tracking, session enforcement
import type { NextApiRequest, NextApiResponse } from "next";
import { Server } from "socket.io";
import prisma from "../../lib/prisma";
import { verifyAuthToken, type AuthPayload } from "../../lib/auth";

// noinspection JSUnusedGlobalSymbols — consumed by Next.js API route runtime
export const config = { api: { bodyParser: false } };

type VoteChoice = "AGREE" | "DISAGREE" | "ABSTAIN" | "ACKNOWLEDGE" | "RESOLUTION";
type SchoolDto = { id: number; name: string; loginToken?: string; logoUrl?: string };
type MotionDto = { id: number; title: string; description: string; isActive: boolean; allowedChoices?: string[] };
type VoteDetailItem = { schoolName: string; userName: string; choice: string };

type State = {
  motions: MotionDto[];
  votes: Record<number, Record<string, number>>;
  voteDetails: Record<number, VoteDetailItem[]>;
  attendance: Record<number, boolean>;
  bigScreenMessage: string;
  votingOpen: boolean;
  activeMotionId: number | null;
  countdownEnd: number | null;
  schools: SchoolDto[];
  auditLogs: { action: string; detail?: string; ip?: string; at: number }[];
  onlineSchools: number[];
};

// In-memory online tracking with heartbeat
const onlineSockets = new Map<string, { schoolId: number; sessionToken: string; lastSeen: number }>();

// Countdown auto-close timer
let countdownTimer: ReturnType<typeof setTimeout> | null = null;
// Heartbeat stale-check interval
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

function getOnlineSchoolIds(): number[] {
  const ids = new Set<number>();
  const now = Date.now();
  onlineSockets.forEach((v, sid) => {
    // Only count as online if heartbeat within last 25 seconds
    if (now - v.lastSeen < 25000) ids.add(v.schoolId);
  });
  return Array.from(ids);
}

function getSocketIp(socket: any): string {
  try {
    const forwarded = socket.handshake?.headers?.["x-forwarded-for"];
    if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
    return socket.handshake?.address || "unknown";
  } catch { return "unknown"; }
}


const buildState = async (): Promise<State> => {
  const [control, schools, motions, voteAgg, voteDetails, attendance, auditLogs] = await Promise.all([
    prisma.controlState.upsert({ where: { id: 1 }, update: {}, create: {} }),
    prisma.school.findMany({ orderBy: { id: "asc" }, select: { id: true, name: true, loginToken: true, logoUrl: true } }),
    prisma.motion.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.vote.groupBy({ by: ["motionId", "choice"], _count: { _all: true } }),
    prisma.vote.findMany({ include: { user: true, school: true }, orderBy: { createdAt: "asc" } }),
    prisma.attendance.findMany({ where: { checkedIn: true }, select: { schoolId: true } }),
    prisma.auditLog.findMany({ orderBy: { timestamp: "desc" }, take: 100 }),
  ]);

  const votes: State["votes"] = {};
  voteAgg.forEach((row) => {
    const m = row.motionId;
    if (!votes[m]) votes[m] = {};
    votes[m][row.choice] = row._count._all;
  });

  // Build vote details per motion
  const voteDetailsMap: State["voteDetails"] = {};
  voteDetails.forEach((v) => {
    if (!voteDetailsMap[v.motionId]) voteDetailsMap[v.motionId] = [];
    voteDetailsMap[v.motionId].push({ schoolName: v.school.name, userName: v.user.name, choice: v.choice });
  });

  const attendanceMap: Record<number, boolean> = {};
  attendance.forEach((a) => { attendanceMap[a.schoolId] = true; });

  return {
    motions: motions.map((m) => {
      let allowedChoices: string[] | undefined;
      try { allowedChoices = m.allowedChoices ? JSON.parse(m.allowedChoices) : undefined; } catch { allowedChoices = undefined; }
      return { id: m.id, title: m.title, description: m.description, isActive: m.isActive, allowedChoices };
    }),
    votes,
    voteDetails: voteDetailsMap,
    attendance: attendanceMap,
    bigScreenMessage: control.bigScreenMessage,
    votingOpen: control.votingOpen,
    activeMotionId: control.activeMotionId,
    countdownEnd: control.countdownEnd ? control.countdownEnd.getTime() : null,
    schools: schools.map((s) => ({ id: s.id, name: s.name, loginToken: s.loginToken, logoUrl: s.logoUrl || undefined })),
    auditLogs: auditLogs.map((a: any) => ({ action: a.action, detail: a.details || undefined, ip: a.ipAddress || undefined, at: a.timestamp.getTime() })),
    onlineSchools: getOnlineSchoolIds(),
  };
};

const broadcast = async (io: Server) => {
  try {
    const state = await buildState();
    io.emit("state:update", state);
  } catch (err) {
    console.error("broadcast error:", err);
  }
};

const addAudit = async (userId: number | null, action: string, details?: string, ipAddress?: string) => {
  try {
    await prisma.auditLog.create({ data: { userId: userId || 1, action, details, ipAddress } });
  } catch (err) {
    console.error("audit log error:", err);
  }
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // @ts-ignore
  if (!(res.socket as any).server.io) {
    // @ts-ignore
    const io = new Server((res.socket as any).server, {
      path: "/api/socket",
      addTrailingSlash: false,
      transports: ["websocket", "polling"],
      allowEIO3: true,
      cors: { origin: "*", methods: ["GET", "POST"] },
      cookie: false,
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    io.on("connection", async (socket) => {
      try {
        socket.emit("state:update", await buildState());
      } catch (err) {
        console.error("initial state error:", err);
      }

      const socketIp = getSocketIp(socket);

      // Client identifies itself after login
      socket.on("auth:identify", async (payload: { schoolId: number; sessionToken: string }) => {
        if (!payload.schoolId || !payload.sessionToken) return;
        try {
          const school: any = await prisma.school.findUnique({ where: { id: payload.schoolId } });
          if (!school || school.sessionToken !== payload.sessionToken) {
            socket.emit("session:invalid", { reason: "มีการเข้าสู่ระบบจากเครื่องอื่น" });
            return;
          }
          // Kick other sockets with same schoolId but different sessionToken
          onlineSockets.forEach((info, sid) => {
            if (info.schoolId === payload.schoolId && sid !== socket.id) {
              const otherSocket = io.sockets.sockets.get(sid);
              if (otherSocket) {
                otherSocket.emit("session:invalid", { reason: "มีการเข้าสู่ระบบจากเครื่องอื่น" });
                otherSocket.disconnect(true);
              }
              onlineSockets.delete(sid);
            }
          });
          onlineSockets.set(socket.id, { schoolId: payload.schoolId, sessionToken: payload.sessionToken, lastSeen: Date.now() });
          await broadcast(io);
        } catch (err) {
          console.error("auth:identify error:", err);
        }
      });

      // Heartbeat — client sends every 10s to stay "online"
      socket.on("client:heartbeat", () => {
        const entry = onlineSockets.get(socket.id);
        if (entry) entry.lastSeen = Date.now();
      });

      socket.on("disconnect", async () => {
        const wasTracked = onlineSockets.has(socket.id);
        onlineSockets.delete(socket.id);
        if (wasTracked) {
          try { await broadcast(io); } catch {}
        }
      });

      socket.on("admin:add-motion", async (payload: { title: string; description: string; allowedChoices?: string[]; userId?: number }) => {
        try {
          const choices = payload.allowedChoices && payload.allowedChoices.length > 0 ? JSON.stringify(payload.allowedChoices) : null;
          const motion = await prisma.motion.create({ data: { title: payload.title, description: payload.description, allowedChoices: choices } });
          await addAudit(payload.userId || null, "เพิ่มญัตติ", motion.title, socketIp);
          socket.emit("admin:action-result", { success: true, action: "เพิ่มญัตติสำเร็จ", detail: motion.title });
          await broadcast(io);
        } catch (err) {
          console.error("add-motion error:", err);
          socket.emit("admin:action-result", { success: false, action: "เพิ่มญัตติไม่สำเร็จ" });
        }
      });

      socket.on("admin:delete-motion", async (payload: { motionId: number }) => {
        try {
          await prisma.vote.deleteMany({ where: { motionId: payload.motionId } });
          await prisma.auditLog.deleteMany({ where: { motionId: payload.motionId } });
          await prisma.motion.delete({ where: { id: payload.motionId } });
          await addAudit(null, "ลบญัตติ", `id: ${payload.motionId}`, socketIp);
          socket.emit("admin:action-result", { success: true, action: "ลบญัตติสำเร็จ" });
          await broadcast(io);
        } catch (err) {
          console.error("delete-motion error:", err);
        }
      });

      socket.on("admin:screen-control", async (data: { message: string; userId?: number }) => {
        try {
          await prisma.controlState.upsert({ where: { id: 1 }, update: { bigScreenMessage: data.message }, create: { bigScreenMessage: data.message } });
          await addAudit(data.userId || null, "อัปเดตข้อความจอ", data.message, socketIp);
          socket.emit("admin:action-result", { success: true, action: "อัปเดตข้อความจอสำเร็จ" });
          io.emit("bigscreen:update", { message: data.message });
          await broadcast(io);
        } catch (err) {
          console.error("screen-control error:", err);
        }
      });

      socket.on("admin:toggle-vote", async (data: { open: boolean; motionId: number | null; userId?: number }) => {
        try {
          if (!data.open) {
            if (countdownTimer) { clearTimeout(countdownTimer); countdownTimer = null; }
          }
          const updateData = data.open
            ? { votingOpen: true, activeMotionId: data.motionId, countdownEnd: null }
            : { votingOpen: false, activeMotionId: null, countdownEnd: null };

          await prisma.controlState.upsert({
            where: { id: 1 },
            update: updateData,
            create: updateData,
          });
          if (data.motionId) {
            await prisma.motion.updateMany({ data: { isActive: false } });
            await prisma.motion.update({ where: { id: data.motionId }, data: { isActive: data.open } });
          }
          await addAudit(data.userId || null, data.open ? "เปิดรับโหวต" : "ปิดรับโหวต", `ญัตติ: ${data.motionId}`, socketIp);
          await broadcast(io);
        } catch (err) {
          console.error("toggle-vote error:", err);
        }
      });

      socket.on("admin:set-countdown", async (data: { seconds: number; userId?: number }) => {
        try {
          const end = new Date(Date.now() + data.seconds * 1000);
          await prisma.controlState.upsert({ where: { id: 1 }, update: { countdownEnd: end }, create: { countdownEnd: end } });
          await addAudit(data.userId || null, "ตั้งเวลา", `${data.seconds} วินาที`, socketIp);

          // Auto-close voting when countdown ends
          if (countdownTimer) clearTimeout(countdownTimer);
          countdownTimer = setTimeout(async () => {
            try {
              await prisma.controlState.update({ where: { id: 1 }, data: { votingOpen: false, countdownEnd: null } });
              await addAudit(null, "ปิดรับโหวตอัตโนมัติ", "หมดเวลา");
              await broadcast(io);
            } catch (err) {
              console.error("auto-close error:", err);
            }
          }, data.seconds * 1000);

          await broadcast(io);
        } catch (err) {
          console.error("set-countdown error:", err);
        }
      });

      socket.on("attendance:check-in", async (payload: { schoolId: number; userId?: number }) => {
        try {
          const school = await prisma.school.findUnique({ where: { id: payload.schoolId }, include: { users: true } });
          if (!school) return;
          const user = school.users[0] || (await prisma.user.create({ data: { name: `${school.name} ผู้แทน`, schoolId: school.id } }));
          await prisma.attendance.upsert({
            where: { schoolId_userId: { schoolId: school.id, userId: user.id } },
            update: { checkedIn: true, checkedInAt: new Date() },
            create: { schoolId: school.id, userId: user.id, checkedIn: true, checkedInAt: new Date() },
          });
          await addAudit(payload.userId || null, "เช็คชื่อ", school.name, socketIp);
          await broadcast(io);
        } catch (err) {
          console.error("check-in error:", err);
        }
      });

      // Force kick a school's session (admin action)
      socket.on("admin:kick-session", async (payload: { schoolId: number }) => {
        try {
          await prisma.school.update({
            where: { id: payload.schoolId },
            data: { sessionToken: null } as any,
          });
          onlineSockets.forEach((info, sid) => {
            if (info.schoolId === payload.schoolId) {
              const s = io.sockets.sockets.get(sid);
              if (s) {
                s.emit("session:invalid", { reason: "ผู้ดูแลระบบบังคับออกจากระบบ" });
                s.disconnect(true);
              }
              onlineSockets.delete(sid);
            }
          });
          await addAudit(null, "บังคับออก", `schoolId: ${payload.schoolId}`, socketIp);
          await broadcast(io);
        } catch (err) {
          console.error("kick-session error:", err);
        }
      });

      socket.on(
        "vote:cast",
        async (payload: { motionId: number; choice: VoteChoice; authToken?: string; schoolId?: number; voter?: string }) => {
          try {
            const control = await prisma.controlState.findUnique({ where: { id: 1 } });
            if (!control?.votingOpen || control.activeMotionId !== payload.motionId) return;

            // Validate allowed choices for this motion
            const motion = await prisma.motion.findUnique({ where: { id: payload.motionId } });
            if (!motion) return;
            if (motion.allowedChoices) {
              try {
                const allowed: string[] = JSON.parse(motion.allowedChoices);
                if (!allowed.includes(payload.choice)) return;
              } catch {}
            }

            let auth: AuthPayload | null = null;
            if (payload.authToken) auth = await verifyAuthToken(payload.authToken);

            let schoolId = payload.schoolId;
            let userId: number | null = null;

            if (auth) {
              schoolId = auth.schoolId;
              userId = auth.userId;
            }

            if (!schoolId) return;

            const school = await prisma.school.findUnique({ where: { id: schoolId }, include: { users: true } });
            if (!school) return;

            if (!userId) {
              const user = await prisma.user.create({ data: { name: payload.voter || `${school.name} ผู้แทน`, schoolId: school.id } });
              userId = user.id;
            }

            await prisma.vote.upsert({
              where: { userId_motionId: { userId, motionId: payload.motionId } },
              update: { choice: payload.choice },
              create: { userId, motionId: payload.motionId, schoolId: school.id, choice: payload.choice },
            });
            await addAudit(userId, "ลงมติ", `${school.name} → ${payload.choice}`, socketIp);
            await broadcast(io);
          } catch (err) {
            console.error("vote:cast error:", err);
          }
        }
      );
    });

    // @ts-ignore
    (res.socket as any).server.io = io;
  }
  res.status(200).json({ ok: true });
}
