import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { authCookieName, signAuthToken } from "../../../lib/auth";
import cookie from "cookie";
import { randomBytes } from "crypto";
import { isWithinRadius } from "../../../lib/geo";

function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();
  const token = req.query.token as string;
  if (!token) return res.status(400).json({ error: "missing token" });

  const clientIp = getClientIp(req);
  const control = await prisma.controlState.findUnique({ where: { id: 1 } });
  const geoCheckEnabled = control?.geoCheckEnabled ?? true;

  // Geolocation check — mandatory when enabled
  const lat = req.query.lat ? Number(req.query.lat) : undefined;
  const lng = req.query.lng ? Number(req.query.lng) : undefined;
  if (geoCheckEnabled) {
    if (lat === undefined || lng === undefined) {
      return res.status(403).json({ error: "กรุณาเปิดการเข้าถึงตำแหน่งที่ตั้งก่อนเข้าสู่ระบบ" });
    }
    const geo = isWithinRadius(lat, lng);
    if (!geo.allowed) {
      return res.status(403).json({
        error: `ไม่สามารถเข้าสู่ระบบได้ — คุณอยู่นอกพื้นที่ที่อนุญาต (ห่าง ${geo.distanceKm.toFixed(1)} กม.)`,
      });
    }
  }

  const loginMode = control?.loginMode || "PER_SCHOOL";

  if (loginMode === "PER_INDIVIDUAL") {
    const user = await prisma.user.findUnique({ where: { loginQrToken: token }, include: { school: true } });
    if (!user) return res.status(401).json({ error: "invalid token" });

    const sessionToken = randomBytes(32).toString("hex");
    await prisma.school.update({
      where: { id: user.schoolId },
      data: { loginIp: clientIp, sessionToken } as any,
    });

    const jwt = await signAuthToken({ userId: user.id, schoolId: user.schoolId, name: user.name });

    try {
      await prisma.auditLog.create({
        data: { userId: user.id, action: "login-qr", details: `${user.name} — ${user.school.name} (IP: ${clientIp})`, ipAddress: clientIp },
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

  // PER_SCHOOL (default)
  const school = await prisma.school.findFirst({ where: { loginToken: token }, include: { users: true } });
  if (!school) return res.status(401).json({ error: "invalid token" });

  const sessionToken = randomBytes(32).toString("hex");
  await prisma.school.update({
    where: { id: school.id },
    data: { loginIp: clientIp, sessionToken } as any,
  });

  const user = school.users[0] || (await prisma.user.create({ data: { name: `${school.name} ผู้แทน`, schoolId: school.id } }));
  const jwt = await signAuthToken({ userId: user.id, schoolId: school.id, name: user.name });

  try {
    await prisma.auditLog.create({
      data: { userId: user.id, action: "login-qr", details: `${school.name} (IP: ${clientIp})`, ipAddress: clientIp },
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
