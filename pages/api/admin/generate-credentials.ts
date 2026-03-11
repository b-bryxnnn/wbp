import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

function generateUsername(prefix: string, index: number): string {
  const slug = prefix.replace(/[^a-zA-Z0-9ก-๙]/g, "").slice(0, 10);
  const rand = randomBytes(2).toString("hex");
  return `${slug}-${rand}`;
}

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let pw = "";
  const bytes = randomBytes(8);
  for (let i = 0; i < 8; i++) pw += chars[bytes[i] % chars.length];
  return pw;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const control = await prisma.controlState.findUnique({ where: { id: 1 } });
  const loginMode = control?.loginMode || "PER_SCHOOL";
  const results: { name: string; username: string; password: string; type: string }[] = [];

  if (loginMode === "PER_SCHOOL") {
    const schools = await prisma.school.findMany({ orderBy: { id: "asc" } });
    for (const school of schools) {
      const username = generateUsername(school.name, school.id);
      const password = generatePassword();
      const hash = await bcrypt.hash(password, 10);
      await prisma.school.update({
        where: { id: school.id },
        data: { username, passwordHash: hash },
      });
      results.push({ name: school.name, username, password, type: "school" });
    }
  } else {
    const users = await prisma.user.findMany({ include: { school: true }, orderBy: { id: "asc" } });
    for (const user of users) {
      const username = generateUsername(user.name, user.id);
      const password = generatePassword();
      const hash = await bcrypt.hash(password, 10);
      const qrToken = randomBytes(16).toString("hex");
      await prisma.user.update({
        where: { id: user.id },
        data: { username, passwordHash: hash, loginQrToken: qrToken },
      });
      results.push({ name: `${user.name} (${user.school.name})`, username, password, type: "user" });
    }
  }

  return res.status(200).json({ credentials: results, loginMode });
}

