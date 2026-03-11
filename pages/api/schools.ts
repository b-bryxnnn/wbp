import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../lib/prisma";
import { verifyAdmin } from "../../lib/adminAuth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!verifyAdmin(req, res)) return;

  try {
    const schools = await prisma.school.findMany({
      orderBy: { id: "asc" },
      select: { id: true, name: true, loginToken: true, logoUrl: true },
    });
    res.status(200).json({ schools });
  } catch (err: any) {
    console.error("GET /api/schools error:", err);
    // Return empty array instead of 500 so the UI still renders
    res.status(200).json({ schools: [], _dbError: true });
  }
}
