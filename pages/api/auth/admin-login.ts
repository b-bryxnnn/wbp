import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookie from "cookie";

const ADMIN_SECRET = process.env.JWT_SECRET || "dev-secret";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    try {
      const { password } = req.body;
      if (!password) return res.status(400).json({ error: "กรุณากรอกรหัสผ่าน" });

      let control: any = null;
      try {
        control = await prisma.controlState.findUnique({ where: { id: 1 } });
      } catch {
        // Table might not exist yet — create it
        try {
          control = await prisma.controlState.create({ data: {} });
        } catch { /* ignore */ }
      }

      // If no admin password set yet, use env variable or default "admin1234"
      const envAdminPassword = process.env.ADMIN_PASSWORD || "admin1234";

      if (control?.adminPasswordHash) {
        // Verify against stored hash
        const valid = await bcrypt.compare(password, control.adminPasswordHash);
        if (!valid) return res.status(401).json({ error: "รหัสผ่านไม่ถูกต้อง" });
      } else {
        // No hash stored — check against env/default, then store it
        if (password !== envAdminPassword) {
          return res.status(401).json({ error: "รหัสผ่านไม่ถูกต้อง" });
        }
        try {
          const hash = await bcrypt.hash(password, 10);
          await prisma.controlState.upsert({
            where: { id: 1 },
            update: { adminPasswordHash: hash },
            create: { adminPasswordHash: hash },
          });
        } catch { /* ignore hash store failure on first login */ }
      }

      const token = jwt.sign({ role: "admin" }, ADMIN_SECRET, { expiresIn: "12h" });

      res.setHeader(
        "Set-Cookie",
        cookie.serialize("admin_token", token, {
          httpOnly: true,
          secure: false,
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 12,
        })
      );

      return res.status(200).json({ ok: true, token });
    } catch (err: any) {
      console.error("Admin login error:", err);
      return res.status(500).json({ error: "เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง" });
    }
  }

  // GET — verify current admin session
  if (req.method === "GET") {
    const token = req.cookies.admin_token;
    if (!token) return res.status(401).json({ ok: false });
    try {
      jwt.verify(token, ADMIN_SECRET);
      return res.status(200).json({ ok: true });
    } catch {
      return res.status(401).json({ ok: false });
    }
  }

  // PUT — change admin password
  if (req.method === "PUT") {
    const token = req.cookies.admin_token;
    if (!token) return res.status(401).json({ error: "ไม่ได้เข้าสู่ระบบ" });
    try {
      jwt.verify(token, ADMIN_SECRET);
    } catch {
      return res.status(401).json({ error: "session หมดอายุ" });
    }

    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ error: "รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร" });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.controlState.upsert({
      where: { id: 1 },
      update: { adminPasswordHash: hash },
      create: { adminPasswordHash: hash },
    });

    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}

