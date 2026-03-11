import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { verifyAdmin } from "../../../lib/adminAuth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!(await verifyAdmin(req, res))) return;
  if (req.method !== "POST") return res.status(405).end();

  try {
    // Delete in order due to foreign key constraints
    await prisma.vote.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.attendance.deleteMany({});
    await prisma.motion.deleteMany({});

    // Reset control state
    await prisma.controlState.upsert({
      where: { id: 1 },
      update: {
        bigScreenMessage: "ขอต้อนรับเข้าสู่ระบบโหวต",
        votingOpen: false,
        activeMotionId: null,
        countdownEnd: null,
      },
      create: {
        bigScreenMessage: "ขอต้อนรับเข้าสู่ระบบโหวต",
        votingOpen: false,
      },
    });

    // Reset all school sessions
    await prisma.$executeRaw`UPDATE "School" SET "sessionToken" = NULL, "loginIp" = NULL`;

    return res.status(200).json({ ok: true, message: "รีเซ็ตระบบสำเร็จ" });
  } catch (err: any) {
    console.error("Reset error:", err);
    return res.status(500).json({ error: "รีเซ็ตระบบไม่สำเร็จ: " + err.message });
  }
}

