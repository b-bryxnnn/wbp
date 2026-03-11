import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { verifyAdmin } from "../../../lib/adminAuth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!(await verifyAdmin(req, res))) return;

  try {
    if (req.method === "GET") {
      let control: any = null;
      try {
        control = await prisma.controlState.findUnique({ where: { id: 1 } });
      } catch {
        // DB not ready — return default
      }
      return res.status(200).json({ loginMode: control?.loginMode || "PER_SCHOOL" });
    }
    if (req.method === "PUT") {
      const { loginMode } = req.body;
      if (!["PER_SCHOOL", "PER_INDIVIDUAL"].includes(loginMode)) {
        return res.status(400).json({ error: "Invalid loginMode" });
      }
      await prisma.controlState.upsert({ where: { id: 1 }, update: { loginMode }, create: { loginMode } });
      return res.status(200).json({ loginMode });
    }
    return res.status(405).end();
  } catch (err: any) {
    console.error("login-mode error:", err);
    return res.status(200).json({ loginMode: "PER_SCHOOL", _dbError: true });
  }
}
