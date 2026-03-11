// Socket.io server for admin control, voting, online tracking, session enforcement
import type { NextApiRequest, NextApiResponse } from "next";
import { Server } from "socket.io";
import prisma from "../../lib/prisma";
import { verifyAuthToken, type AuthPayload } from "../../lib/auth";

export const config = { api: { bodyParser: false } };

type VoteChoice = "AGREE" | "DISAGREE" | "ABSTAIN";
type SchoolDto = { id: number; name: string; loginToken?: string; logoUrl?: string };
type MotionDto = { id: number; title: string; description: string; isActive: boolean };

type State = {
  motions: MotionDto[];
  votes: Record<number, Record<VoteChoice, number>>;
  attendance: Record<number, boolean>;
  bigScreenMessage: string;
  votingOpen: boolean;
  activeMotionId: number | null;
  countdownEnd: number | null;
  schools: SchoolDto[];
  auditLogs: { action: string; detail?: string; at: number }[];
  onlineSchools: number[];
};

// In-memory online tracking
const onlineSockets = new Map<string, { schoolId: number; sessionToken: string }>();

function getOnlineSchoolIds(): number[] {
  const ids = new Set<number>();
  onlineSockets.forEach((v) => ids.add(v.schoolId));
  return Array.from(ids);
}

const buildState = async (): Promise<State> => {
  const [control, schools, motions, voteAgg, attendance, auditLogs] = await Promise.all([
    prisma.controlState.upsert({ where: { id: 1 }, update: {}, create: {} }),
    prisma.school.findMany({ orderBy: { id: "asc" }, select: { id: true, name: true, loginToken: true, logoUrl: true } }),
    prisma.motion.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.vote.groupBy({ by: ["motionId", "choice"], _count: { _all: true } }),
    prisma.attendance.findMany({ where: { checkedIn: true }, select: { schoolId: true } }),
    prisma.auditLog.findMany({ orderBy: { timestamp: "desc" }, take: 50 }),
  ]);

  const votes: State["votes"] = {};
  voteAgg.forEach((row) => {
    const m = row.motionId;
    votes[m] = votes[m] || { AGREE: 0, DISAGREE: 0, ABSTAIN: 0 };
    votes[m][row.choice as VoteChoice] = row._count._all;
  });

  const attendanceMap: Record<number, boolean> = {};
  attendance.forEach((a) => {
    attendanceMap[a.schoolId] = true;
  });

  return {
    motions: motions.map((m) => ({ id: m.id, title: m.title, description: m.description, isActive: m.isActive })),
    votes,
    attendance: attendanceMap,
    bigScreenMessage: control.bigScreenMessage,
    votingOpen: control.votingOpen,
    activeMotionId: control.activeMotionId,
    countdownEnd: control.countdownEnd ? control.countdownEnd.getTime() : null,
    schools: schools.map((s) => ({ id: s.id, name: s.name, loginToken: s.loginToken, logoUrl: s.logoUrl || undefined })),
    auditLogs: auditLogs.map((a) => ({ action: a.action, detail: a.details || undefined, at: a.timestamp.getTime() })),
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

const addAudit = async (userId: number | null, action: string, details?: string) => {
  try {
    await prisma.auditLog.create({ data: { userId: userId || 1, action, details } });
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
      // Use polling only for reliability behind reverse proxies (Coolify/Traefik)
      transports: ["polling"],
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

      // Client identifies itself after login
      socket.on("auth:identify", async (payload: { schoolId: number; sessionToken: string }) => {
        if (!payload.schoolId || !payload.sessionToken) return;

        // Verify session token against DB
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

          onlineSockets.set(socket.id, { schoolId: payload.schoolId, sessionToken: payload.sessionToken });
          await broadcast(io);
        } catch (err) {
          console.error("auth:identify error:", err);
        }
      });

      socket.on("disconnect", async () => {
        const wasTracked = onlineSockets.has(socket.id);
        onlineSockets.delete(socket.id);
        if (wasTracked) {
          try { await broadcast(io); } catch {}
        }
      });

      socket.on("admin:add-motion", async (payload: { title: string; description: string; userId?: number }) => {
        try {
          const motion = await prisma.motion.create({ data: { title: payload.title, description: payload.description } });
          await addAudit(payload.userId || null, "add-motion", motion.title);
          await broadcast(io);
        } catch (err) {
          console.error("add-motion error:", err);
        }
      });

      socket.on("admin:screen-control", async (data: { message: string; userId?: number }) => {
        try {
          await prisma.controlState.upsert({ where: { id: 1 }, update: { bigScreenMessage: data.message }, create: { bigScreenMessage: data.message } });
          await addAudit(data.userId || null, "screen-message", data.message);
          io.emit("bigscreen:update", { message: data.message });
          await broadcast(io);
        } catch (err) {
          console.error("screen-control error:", err);
        }
      });

      socket.on("admin:toggle-vote", async (data: { open: boolean; motionId: number | null; userId?: number }) => {
        try {
          await prisma.controlState.upsert({
            where: { id: 1 },
            update: { votingOpen: data.open, activeMotionId: data.motionId },
            create: { votingOpen: data.open, activeMotionId: data.motionId },
          });
          if (data.motionId) {
            await prisma.motion.updateMany({ data: { isActive: false } });
            await prisma.motion.update({ where: { id: data.motionId }, data: { isActive: data.open } });
          }
          await addAudit(data.userId || null, data.open ? "vote-open" : "vote-close", `motion: ${data.motionId}`);
          await broadcast(io);
        } catch (err) {
          console.error("toggle-vote error:", err);
        }
      });

      socket.on("admin:set-countdown", async (data: { seconds: number; userId?: number }) => {
        try {
          const end = new Date(Date.now() + data.seconds * 1000);
          await prisma.controlState.upsert({ where: { id: 1 }, update: { countdownEnd: end }, create: { countdownEnd: end } });
          await addAudit(data.userId || null, "countdown", `${data.seconds}s`);
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
          await addAudit(payload.userId || null, "attendance", school.name);
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
            await addAudit(userId, "vote", `${school.name} -> ${payload.choice}`);
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
  res.end();
}
