import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../lib/prisma";
import XLSX from "xlsx";
import PDFDocument from "pdfkit";
import { Readable } from "stream";

export const config = {
  api: {
    responseLimit: false,
  },
};

async function buildData() {
  const motions = await prisma.motion.findMany({ include: { votes: { include: { user: true, school: true } } }, orderBy: { createdAt: "asc" } });
  const attendance = await prisma.attendance.findMany({ where: { checkedIn: true }, include: { user: true, school: true } });
  return { motions, attendance };
}

function exportExcel(data: Awaited<ReturnType<typeof buildData>>) {
  const wb = XLSX.utils.book_new();

  const motionRows = data.motions.flatMap((m) =>
    m.votes.map((v) => ({ Motion: m.title, Choice: v.choice, School: v.school.name, Voter: v.user.name, At: v.createdAt }))
  );
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(motionRows), "Votes");

  const attendanceRows = data.attendance.map((a) => ({ School: a.school.name, User: a.user.name, CheckedInAt: a.checkedInAt }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(attendanceRows), "Attendance");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

function exportPdf(data: Awaited<ReturnType<typeof buildData>>) {
  const doc = new PDFDocument({ margin: 40 });
  const stream = new Readable({ read() {} });
  doc.pipe(stream);

  doc.fontSize(18).text("รายงานผลการประชุม/ลงมติ", { underline: true });
  doc.moveDown();

  data.motions.forEach((m) => {
    doc.fontSize(14).text(`ญัตติ: ${m.title}`);
    doc.fontSize(12).text(`รายละเอียด: ${m.description}`);
    const counts = { AGREE: 0, DISAGREE: 0, ABSTAIN: 0 } as Record<string, number>;
    m.votes.forEach((v) => counts[v.choice]++);
    doc.text(`สรุป: เห็นด้วย ${counts.AGREE}, ไม่เห็นด้วย ${counts.DISAGREE}, งดออกเสียง ${counts.ABSTAIN}`);
    doc.moveDown(0.5);
    m.votes.forEach((v) => doc.text(`- ${v.school.name} (${v.user.name}): ${v.choice}`));
    doc.moveDown();
  });

  doc.addPage();
  doc.fontSize(16).text("เช็คชื่อ (Attendance)", { underline: true });
  data.attendance.forEach((a) => {
    doc.fontSize(12).text(`- ${a.school.name} (${a.user.name}) เวลา ${a.checkedInAt?.toISOString() ?? ""}`);
  });

  doc.end();

  return stream;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { type } = req.query; // pdf | excel
  const data = await buildData();

  if (type === "excel") {
    const buffer = exportExcel(data);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=report.xlsx");
    return res.status(200).send(buffer);
  }

  if (type === "pdf") {
    const pdfStream = exportPdf(data);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=report.pdf");
    pdfStream.pipe(res);
    return;
  }

  return res.status(400).json({ error: "Invalid export type" });
}
