import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { verifyAdmin } from "../../../lib/adminAuth";

// English-only username: school1_ab3f, school2_c4d1, etc.
function generateUsername(prefix: string, index: number): string {
  const rand = randomBytes(2).toString("hex");
  return `${prefix}${index}_${rand}`;
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
  if (!(await verifyAdmin(req, res))) return;

  try {
    const control = await prisma.controlState.findUnique({ where: { id: 1 } });
    const loginMode = control?.loginMode || "PER_SCHOOL";
    const results: { name: string; username: string; password: string; type: string; qrToken: string }[] = [];

    if (loginMode === "PER_SCHOOL") {
      const schools = await prisma.school.findMany({ orderBy: { id: "asc" } });
      for (const school of schools) {
        const username = generateUsername("school", school.id);
        const password = generatePassword();
        const hash = await bcrypt.hash(password, 10);
        // Also regenerate loginToken for QR code
        const loginToken = randomBytes(12).toString("hex");
        await prisma.school.update({
          where: { id: school.id },
          data: { username, passwordHash: hash, loginToken },
        });
        results.push({ name: school.name, username, password, type: "school", qrToken: loginToken });
      }
    } else {
      const users = await prisma.user.findMany({ include: { school: true }, orderBy: { id: "asc" } });
      for (const user of users) {
        const username = generateUsername("user", user.id);
        const password = generatePassword();
        const hash = await bcrypt.hash(password, 10);
        const qrToken = randomBytes(16).toString("hex");
        await prisma.user.update({
          where: { id: user.id },
          data: { username, passwordHash: hash, loginQrToken: qrToken },
        });
        results.push({ name: `${user.name} (${user.school.name})`, username, password, type: "user", qrToken });
      }
    }

    return res.status(200).json({ credentials: results, loginMode });
  } catch (err: any) {
    console.error("generate-credentials error:", err);
    return res.status(500).json({ error: "สร้างข้อมูลล็อกอินไม่สำเร็จ", detail: err.message });
  }
}
