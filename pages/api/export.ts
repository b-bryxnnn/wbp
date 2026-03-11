import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../lib/prisma";
import { verifyAdmin } from "../../lib/adminAuth";

export const config = { api: { responseLimit: false } };

async function buildData() {
  const motions = await prisma.motion.findMany({
    include: { votes: { include: { user: true, school: true } } },
    orderBy: { createdAt: "asc" },
  });
  const attendance = await prisma.attendance.findMany({
    where: { checkedIn: true },
    include: { user: true, school: true },
  });
  const schools = await prisma.school.findMany({ orderBy: { id: "asc" } });
  return { motions, attendance, schools };
}

/** Escape a value for CSV (handle commas, quotes, newlines) */
function csvEscape(val: string | number | null | undefined): string {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function csvRow(cells: (string | number | null | undefined)[]): string {
  return cells.map(csvEscape).join(",");
}

function exportCsv(data: Awaited<ReturnType<typeof buildData>>) {
  const BOM = "\uFEFF"; // UTF-8 BOM for Excel to detect Thai encoding
  const lines: string[] = [];

  // Sheet 1: Summary
  lines.push(csvRow(["ญัตติ", "รายละเอียด", "เห็นด้วย", "ไม่เห็นด้วย", "งดออกเสียง", "รวม", "ผลลัพธ์"]));
  data.motions.forEach((m) => {
    const c = { AGREE: 0, DISAGREE: 0, ABSTAIN: 0 } as Record<string, number>;
    m.votes.forEach((v) => c[v.choice]++);
    const total = c.AGREE + c.DISAGREE + c.ABSTAIN;
    const result = c.AGREE > c.DISAGREE ? "ผ่าน" : c.AGREE < c.DISAGREE ? "ไม่ผ่าน" : "เท่ากัน";
    lines.push(csvRow([m.title, m.description, c.AGREE, c.DISAGREE, c.ABSTAIN, total, result]));
  });

  lines.push("");
  lines.push(csvRow(["--- รายละเอียดการโหวต ---"]));
  lines.push(csvRow(["ญัตติ", "โรงเรียน", "ผู้โหวต", "เลือก", "เวลา"]));
  data.motions.forEach((m) => {
    m.votes.forEach((v) => {
      const choice = v.choice === "AGREE" ? "เห็นด้วย" : v.choice === "DISAGREE" ? "ไม่เห็นด้วย" : "งดออกเสียง";
      lines.push(csvRow([m.title, v.school.name, v.user.name, choice, v.createdAt.toISOString()]));
    });
  });

  lines.push("");
  lines.push(csvRow(["--- การเข้าร่วม ---"]));
  lines.push(csvRow(["โรงเรียน", "ผู้แทน", "เวลาเช็คชื่อ"]));
  data.attendance.forEach((a) => {
    lines.push(csvRow([a.school.name, a.user.name, a.checkedInAt?.toISOString() ?? ""]));
  });

  lines.push("");
  lines.push(csvRow(["--- IP Log ---"]));
  lines.push(csvRow(["โรงเรียน", "IP Address"]));
  (data.schools as any[]).forEach((s) => {
    lines.push(csvRow([s.name, s.loginIp || "-"]));
  });

  return BOM + lines.join("\r\n");
}

function exportText(data: Awaited<ReturnType<typeof buildData>>) {
  const lines: string[] = [];
  lines.push("=== สรุปผลมติ — สหวิทยาเขตวชิรบูรพา ===");
  lines.push("");
  data.motions.forEach((m) => {
    const c = { AGREE: 0, DISAGREE: 0, ABSTAIN: 0 } as Record<string, number>;
    m.votes.forEach((v) => c[v.choice]++);
    lines.push(`ญัตติ: ${m.title}`);
    lines.push(`รายละเอียด: ${m.description}`);
    lines.push(`เห็นด้วย: ${c.AGREE}, ไม่เห็นด้วย: ${c.DISAGREE}, งดออกเสียง: ${c.ABSTAIN}`);
    lines.push(`ผล: ${c.AGREE > c.DISAGREE ? "ผ่าน" : c.AGREE < c.DISAGREE ? "ไม่ผ่าน" : "เท่ากัน"}`);
    m.votes.forEach((v) => {
      lines.push(`  - ${v.school.name} (${v.user.name}): ${v.choice}`);
    });
    lines.push("");
  });
  lines.push("=== การเข้าร่วม ===");
  data.attendance.forEach((a) => {
    lines.push(`- ${a.school.name} (${a.user.name}) เวลา ${a.checkedInAt?.toISOString() ?? ""}`);
  });
  return lines.join("\n");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!(await verifyAdmin(req, res))) return;

  try {
    const { type } = req.query;
    const data = await buildData();

    if (type === "excel" || type === "csv") {
      // CSV with BOM — opens correctly in Excel with Thai text
      const csv = exportCsv(data);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=report.csv");
      return res.status(200).send(csv);
    }

    if (type === "pdf" || type === "text") {
      const text = exportText(data);
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=report.txt");
      return res.status(200).send(text);
    }

    return res.status(400).json({ error: "Invalid export type. Use ?type=excel or ?type=text" });
  } catch (err: any) {
    console.error("Export error:", err);
    return res.status(500).json({ error: "ส่งออกข้อมูลไม่สำเร็จ: " + err.message });
  }
}
