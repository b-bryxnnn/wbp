import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { authCookieName, signAuthToken } from "../../../lib/auth";
import bcrypt from "bcryptjs";
import cookie from "cookie";
import { randomBytes } from "crypto";
import { isWithinRadius } from "../../../lib/geo";

function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { username, password, lat, lng } = req.body;
  if (!username || !password) return res.status(400).json({ error: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน" });

  const clientIp = getClientIp(req);
  const control = await prisma.controlState.findUnique({ where: { id: 1 } });
  const geoCheckEnabled = control?.geoCheckEnabled ?? true;

  // Geolocation check — mandatory when enabled
  if (geoCheckEnabled) {
    if (lat === undefined || lng === undefined) {
      return res.status(403).json({ error: "กรุณาเปิดการเข้าถึงตำแหน่งที่ตั้งก่อนเข้าสู่ระบบ" });
    }
    const geo = isWithinRadius(Number(lat), Number(lng));
    if (!geo.allowed) {
      return res.status(403).json({
        error: `ไม่สามารถเข้าสู่ระบบได้ — คุณอยู่นอกพื้นที่ที่อนุญาต (ห่าง ${geo.distanceKm.toFixed(1)} กม. จากจุดจัดงาน, อนุญาตไม่เกิน 5 กม.)`,
      });
    }
  }

  const loginMode = control?.loginMode || "PER_SCHOOL";

  if (loginMode === "PER_SCHOOL") {
    const school = await prisma.school.findUnique({ where: { username }, include: { users: true } });
    if (!school || !school.passwordHash) return res.status(401).json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });

    const valid = await bcrypt.compare(password, school.passwordHash);
    if (!valid) return res.status(401).json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });

    const sessionToken = randomBytes(32).toString("hex");
    await prisma.school.update({
      where: { id: school.id },
      data: { loginIp: clientIp, sessionToken } as any,
    });

    const user = school.users[0] || (await prisma.user.create({ data: { name: `${school.name} ผู้แทน`, schoolId: school.id } }));
    const jwt = await signAuthToken({ userId: user.id, schoolId: school.id, name: user.name });

    try {
      await prisma.auditLog.create({
        data: { userId: user.id, action: "login", details: `${school.name} (IP: ${clientIp})`, ipAddress: clientIp },
      });
    } catch {}

    res.setHeader("Set-Cookie", cookie.serialize(authCookieName, jwt, {
      httpOnly: true, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 12,
    }));

    return res.status(200).json({
      user: { id: user.id, name: user.name, schoolId: user.schoolId },
      school: { id: school.id, name: school.name },
      token: jwt,
      sessionToken,
    });
  }

  // PER_INDIVIDUAL
  const user = await prisma.user.findUnique({ where: { username }, include: { school: true } });
  if (!user || !user.passwordHash) return res.status(401).json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });

  const sessionToken = randomBytes(32).toString("hex");
  await prisma.school.update({
    where: { id: user.schoolId },
    data: { loginIp: clientIp, sessionToken } as any,
  });

  const jwt = await signAuthToken({ userId: user.id, schoolId: user.schoolId, name: user.name });

  try {
    await prisma.auditLog.create({
      data: { userId: user.id, action: "login", details: `${user.name} — ${user.school.name} (IP: ${clientIp})`, ipAddress: clientIp },
    });
  } catch {}

  res.setHeader("Set-Cookie", cookie.serialize(authCookieName, jwt, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 12,
  }));

  return res.status(200).json({
    user: { id: user.id, name: user.name, schoolId: user.schoolId },
    school: { id: user.school.id, name: user.school.name },
    token: jwt,
    sessionToken,
  });
}
