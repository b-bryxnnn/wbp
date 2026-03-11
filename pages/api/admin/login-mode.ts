import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const control = await prisma.controlState.findUnique({ where: { id: 1 } });
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
}
