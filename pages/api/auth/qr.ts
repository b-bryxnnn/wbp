import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { authCookieName, signAuthToken } from "../../../lib/auth";
import cookie from "cookie";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();
  const token = req.query.token as string;
  if (!token) return res.status(400).json({ error: "missing token" });

  const control = await prisma.controlState.findUnique({ where: { id: 1 } });
  const loginMode = control?.loginMode || "PER_SCHOOL";

  if (loginMode === "PER_INDIVIDUAL") {
    const user = await prisma.user.findUnique({ where: { loginQrToken: token }, include: { school: true } });
    if (!user) return res.status(401).json({ error: "invalid token" });

    const jwt = signAuthToken({ userId: user.id, schoolId: user.schoolId, name: user.name });

    res.setHeader(
      "Set-Cookie",
      cookie.serialize(authCookieName, jwt, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 12,
      })
    );

    return res.status(200).json({
      user: { id: user.id, name: user.name, schoolId: user.schoolId },
      school: { id: user.school.id, name: user.school.name },
      token: jwt,
    });
  }

  // PER_SCHOOL (default)
  const school = await prisma.school.findFirst({ where: { loginToken: token }, include: { users: true } });
  if (!school) return res.status(401).json({ error: "invalid token" });

  const user = school.users[0] || (await prisma.user.create({ data: { name: `${school.name} Delegate`, schoolId: school.id } }));
  const jwt = signAuthToken({ userId: user.id, schoolId: school.id, name: user.name });

  res.setHeader(
    "Set-Cookie",
    cookie.serialize(authCookieName, jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12,
    })
  );

  return res.status(200).json({
    user: { id: user.id, name: user.name, schoolId: user.schoolId },
    school: { id: school.id, name: school.name },
    token: jwt,
  });
}
