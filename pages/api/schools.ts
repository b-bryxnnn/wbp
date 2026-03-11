import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const schools = await prisma.school.findMany({
      orderBy: { id: "asc" },
      select: { id: true, name: true, loginToken: true, logoUrl: true },
    });
    res.status(200).json({ schools });
  } catch (err: any) {
    console.error("GET /api/schools error:", err);
    res.status(500).json({ error: "ไม่สามารถโหลดรายชื่อโรงเรียนได้", detail: err.message });
  }
}
