import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { verifyAdmin } from "../../../lib/adminAuth";

function mapSchool(s: Record<string, any>) {
  return {
    id: s.id,
    name: s.name,
    username: s.username,
    hasCredentials: !!s.username,
    loginToken: s.loginToken,
    logoUrl: s.logoUrl,
    loginIp: s.loginIp || null,
    isOnline: !!s.sessionToken,
    createdAt: s.createdAt,
  };
}

function mapUser(u: Record<string, any>) {
  return {
    id: u.id,
    name: u.name,
    schoolName: u.schoolName,
    username: u.username,
    hasCredentials: !!u.username,
    loginIp: u.loginIp || null,
    createdAt: u.createdAt,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!(await verifyAdmin(req, res))) return;

  // GET - list all school accounts with credentials
  if (req.method === "GET") {
    try {
      const control = await prisma.controlState.findUnique({ where: { id: 1 } });
      const loginMode = control?.loginMode || "PER_SCHOOL";

      if (loginMode === "PER_SCHOOL") {
        // Use raw query to access all fields including loginIp/sessionToken
        const schools = await prisma.$queryRaw<Record<string, any>[]>`
          SELECT id, name, username, "loginToken", "logoUrl", "loginIp", "sessionToken", "createdAt"
          FROM "School" ORDER BY id ASC
        `;
        return res.status(200).json({ loginMode, accounts: schools.map(mapSchool) });
      } else {
        const rawUsers = await prisma.$queryRaw<Record<string, any>[]>`
          SELECT u.id, u.name, u.username, u."createdAt",
                 s.name as "schoolName", s."loginIp"
          FROM "User" u JOIN "School" s ON u."schoolId" = s.id
          ORDER BY u.id ASC
        `;
        return res.status(200).json({ loginMode, accounts: rawUsers.map(mapUser) });
      }
    } catch (err: any) {
      console.error("GET accounts error:", err);
      return res.status(500).json({ error: "ไม่สามารถโหลดข้อมูลบัญชีได้" });
    }
  }

  // DELETE - delete/reset a school's credentials
  if (req.method === "DELETE") {
    try {
      const { id, type } = req.body;
      if (!id) return res.status(400).json({ error: "ต้องระบุ id" });

      if (type === "user") {
        await prisma.user.update({
          where: { id: Number(id) },
          data: { username: null, passwordHash: null, loginQrToken: null },
        });
      } else {
        // Reset school credentials including session fields
        await prisma.$executeRaw`
          UPDATE "School" 
          SET username = NULL, "passwordHash" = NULL, "sessionToken" = NULL, "loginIp" = NULL 
          WHERE id = ${Number(id)}
        `;
      }
      return res.status(200).json({ ok: true });
    } catch (err: any) {
      console.error("DELETE account error:", err);
      return res.status(500).json({ error: "ลบบัญชีไม่สำเร็จ" });
    }
  }

  return res.status(405).end();
}
