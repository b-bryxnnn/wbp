import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { authCookieName, signAuthToken } from "../../../lib/auth";
import bcrypt from "bcryptjs";
import cookie from "cookie";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน" });

  const control = await prisma.controlState.findUnique({ where: { id: 1 } });
  const loginMode = control?.loginMode || "PER_SCHOOL";

  if (loginMode === "PER_SCHOOL") {
    const school = await prisma.school.findUnique({ where: { username }, include: { users: true } });
    if (!school || !school.passwordHash) return res.status(401).json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });

    const valid = await bcrypt.compare(password, school.passwordHash);
    if (!valid) return res.status(401).json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });

    const user = school.users[0] || (await prisma.user.create({ data: { name: `${school.name} ผู้แทน`, schoolId: school.id } }));
    const jwt = signAuthToken({ userId: user.id, schoolId: school.id, name: user.name });

    res.setHeader("Set-Cookie", cookie.serialize(authCookieName, jwt, {
      httpOnly: true, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 12,
    }));

    return res.status(200).json({
      user: { id: user.id, name: user.name, schoolId: user.schoolId },
      school: { id: school.id, name: school.name },
      token: jwt,
    });
  }

  // PER_INDIVIDUAL
  const user = await prisma.user.findUnique({ where: { username }, include: { school: true } });
  if (!user || !user.passwordHash) return res.status(401).json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });

  const jwt = signAuthToken({ userId: user.id, schoolId: user.schoolId, name: user.name });

  res.setHeader("Set-Cookie", cookie.serialize(authCookieName, jwt, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 12,
  }));

  return res.status(200).json({
    user: { id: user.id, name: user.name, schoolId: user.schoolId },
    school: { id: user.school.id, name: user.school.name },
    token: jwt,
  });
}

