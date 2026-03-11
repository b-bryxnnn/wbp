import type { NextApiRequest, NextApiResponse } from "next";
import { jwtVerify } from "jose";

const ADMIN_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret");

/**
 * ตรวจสอบ admin token จาก cookie
 * คืนค่า true ถ้าผ่าน, false ถ้าไม่ผ่าน (พร้อม respond 401)
 */
export async function verifyAdmin(req: NextApiRequest, res: NextApiResponse): Promise<boolean> {
  const token = req.cookies.admin_token;
  if (!token) {
    res.status(401).json({ error: "ไม่ได้เข้าสู่ระบบ" });
    return false;
  }
  try {
    await jwtVerify(token, ADMIN_SECRET);
    return true;
  } catch {
    res.status(401).json({ error: "session หมดอายุ กรุณาเข้าสู่ระบบใหม่" });
    return false;
  }
}
