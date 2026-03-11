import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../lib/prisma";
import { verifyAdmin } from "../../lib/adminAuth";

export const config = { api: { responseLimit: false } };

const CHOICE_LABELS: Record<string, string> = {
  AGREE: "เห็นด้วย", DISAGREE: "ไม่เห็นด้วย", ABSTAIN: "งดออกเสียง",
  ACKNOWLEDGE: "รับทราบ", RESOLUTION: "มติ",
};

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

function csvEscape(val: string | number | null | undefined): string {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
function csvRow(cells: (string | number | null | undefined)[]): string {
  return cells.map(csvEscape).join(",");
}

function exportCsv(data: Awaited<ReturnType<typeof buildData>>) {
  const BOM = "\uFEFF";
  const lines: string[] = [];
  lines.push(csvRow(["ญัตติ", "รายละเอียด", "เห็นด้วย", "ไม่เห็นด้วย", "งดออกเสียง", "รับทราบ", "มติ", "รวม", "ผลลัพธ์"]));
  data.motions.forEach((m) => {
    const c: Record<string, number> = {};
    m.votes.forEach((v) => { c[v.choice] = (c[v.choice] || 0) + 1; });
    const total = Object.values(c).reduce((s, n) => s + n, 0);
    const agree = c.AGREE || 0; const disagree = c.DISAGREE || 0;
    const result = agree > disagree ? "ผ่าน" : agree < disagree ? "ไม่ผ่าน" : total > 0 ? "เท่ากัน" : "-";
    lines.push(csvRow([m.title, m.description, c.AGREE || 0, c.DISAGREE || 0, c.ABSTAIN || 0, c.ACKNOWLEDGE || 0, c.RESOLUTION || 0, total, result]));
  });
  lines.push("");
  lines.push(csvRow(["--- รายละเอียดการโหวต ---"]));
  lines.push(csvRow(["ญัตติ", "โรงเรียน", "ผู้โหวต", "เลือก", "เวลา"]));
  data.motions.forEach((m) => {
    m.votes.forEach((v) => {
      lines.push(csvRow([m.title, v.school.name, v.user.name, CHOICE_LABELS[v.choice] || v.choice, v.createdAt.toISOString()]));
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
    const c: Record<string, number> = {};
    m.votes.forEach((v) => { c[v.choice] = (c[v.choice] || 0) + 1; });
    const agree = c.AGREE || 0; const disagree = c.DISAGREE || 0;
    lines.push(`ญัตติ: ${m.title}`);
    lines.push(`รายละเอียด: ${m.description}`);
    lines.push(`เห็นด้วย: ${agree}, ไม่เห็นด้วย: ${disagree}, งดออกเสียง: ${c.ABSTAIN || 0}, รับทราบ: ${c.ACKNOWLEDGE || 0}, มติ: ${c.RESOLUTION || 0}`);
    lines.push(`ผล: ${agree > disagree ? "ผ่าน" : agree < disagree ? "ไม่ผ่าน" : "เท่ากัน"}`);
    m.votes.forEach((v) => {
      lines.push(`  - ${v.school.name} (${v.user.name}): ${CHOICE_LABELS[v.choice] || v.choice}`);
    });
    lines.push("");
  });
  lines.push("=== การเข้าร่วม ===");
  data.attendance.forEach((a) => {
    lines.push(`- ${a.school.name} (${a.user.name}) เวลา ${a.checkedInAt?.toISOString() ?? ""}`);
  });
  return lines.join("\n");
}

function exportPdfHtml(data: Awaited<ReturnType<typeof buildData>>) {
  const motionRows = data.motions.map((m) => {
    const c: Record<string, number> = {};
    m.votes.forEach((v) => { c[v.choice] = (c[v.choice] || 0) + 1; });
    const total = Object.values(c).reduce((s, n) => s + n, 0);
    const agree = c.AGREE || 0; const disagree = c.DISAGREE || 0;
    const result = agree > disagree ? "ผ่าน" : agree < disagree ? "ไม่ผ่าน" : total > 0 ? "เท่ากัน" : "-";
    const resultClass = agree > disagree ? "pass" : agree < disagree ? "fail" : "tie";
    return `<tr>
      <td>${m.title}</td>
      <td class="num">${agree}</td><td class="num">${disagree}</td><td class="num">${c.ABSTAIN || 0}</td>
      <td class="num">${c.ACKNOWLEDGE || 0}</td><td class="num">${c.RESOLUTION || 0}</td>
      <td class="num">${total}</td><td class="result ${resultClass}">${result}</td>
    </tr>`;
  }).join("");

  const detailRows = data.motions.flatMap((m) =>
    m.votes.map((v) => `<tr><td>${m.title}</td><td>${v.school.name}</td><td>${v.user.name}</td><td>${CHOICE_LABELS[v.choice] || v.choice}</td><td>${new Date(v.createdAt).toLocaleString("th-TH")}</td></tr>`)
  ).join("");

  const attendanceRows = data.attendance.map((a) =>
    `<tr><td>${a.school.name}</td><td>${a.user.name}</td><td>${a.checkedInAt ? new Date(a.checkedInAt).toLocaleString("th-TH") : "-"}</td></tr>`
  ).join("");

  return `<!DOCTYPE html><html lang="th"><head><meta charset="utf-8">
<title>รายงานผลมติ — สหวิทยาเขตวชิรบูรพา</title>
<style>
  @page { size: A4; margin: 15mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Sarabun', 'Noto Sans Thai', sans-serif; font-size: 11px; color: #2d2312; line-height: 1.5; }
  .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #c8a24e; padding-bottom: 15px; }
  .header h1 { font-size: 20px; color: #2d2312; margin-bottom: 4px; }
  .header h2 { font-size: 14px; color: #8b6914; font-weight: 600; }
  .header p { font-size: 10px; color: #666; margin-top: 4px; }
  h3 { font-size: 13px; margin: 18px 0 8px; color: #8b6914; border-left: 3px solid #c8a24e; padding-left: 8px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 10px; }
  th { background: #f8f3e3; color: #4a3a20; padding: 6px 8px; text-align: left; border: 1px solid #e0d5b8; font-weight: 700; }
  td { padding: 5px 8px; border: 1px solid #e0d5b8; }
  tr:nth-child(even) td { background: #fdfbf5; }
  .num { text-align: center; font-weight: 600; }
  .result { text-align: center; font-weight: 700; }
  .pass { color: #16a34a; }
  .fail { color: #dc2626; }
  .tie { color: #ca8a04; }
  .footer { text-align: center; margin-top: 20px; padding-top: 10px; border-top: 1px solid #e0d5b8; font-size: 9px; color: #999; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
<div class="header">
  <h1>รายงานผลการลงมติ</h1>
  <h2>สภานักเรียน — สหวิทยาเขตวชิรบูรพา</h2>
  <p>อบรมโครงการส่งเสริมภาวะผู้นำและศักยภาพสภานักเรียน ณ โรงเรียนรัตนโกสินทร์สมโภชลาดกระบัง</p>
  <p>วันที่ออกรายงาน: ${new Date().toLocaleString("th-TH")}</p>
</div>

<h3>สรุปผลมติ</h3>
<table><thead><tr><th>ญัตติ</th><th class="num">เห็นด้วย</th><th class="num">ไม่เห็นด้วย</th><th class="num">งดออกเสียง</th><th class="num">รับทราบ</th><th class="num">มติ</th><th class="num">รวม</th><th>ผลลัพธ์</th></tr></thead><tbody>${motionRows}</tbody></table>

<h3>รายละเอียดการโหวต</h3>
<table><thead><tr><th>ญัตติ</th><th>โรงเรียน</th><th>ผู้โหวต</th><th>เลือก</th><th>เวลา</th></tr></thead><tbody>${detailRows}</tbody></table>

<h3>รายชื่อเข้าร่วม</h3>
<table><thead><tr><th>โรงเรียน</th><th>ผู้แทน</th><th>เวลาเช็คชื่อ</th></tr></thead><tbody>${attendanceRows}</tbody></table>

<div class="footer">เอกสารนี้สร้างโดยระบบสภานักเรียน สหวิทยาเขตวชิรบูรพา</div>
</body></html>`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!(await verifyAdmin(req, res))) return;

  try {
    const { type } = req.query;
    const data = await buildData();

    if (type === "excel" || type === "csv") {
      const csv = exportCsv(data);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=report.csv");
      return res.status(200).send(csv);
    }

    if (type === "pdf") {
      const html = exportPdfHtml(data);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Content-Disposition", 'inline; filename="report.html"');
      return res.status(200).send(html);
    }

    if (type === "text") {
      const text = exportText(data);
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=report.txt");
      return res.status(200).send(text);
    }

    return res.status(400).json({ error: "Invalid export type. Use ?type=csv, ?type=pdf, or ?type=text" });
  } catch (err: any) {
    console.error("Export error:", err);
    return res.status(500).json({ error: "ส่งออกข้อมูลไม่สำเร็จ: " + err.message });
  }
}
