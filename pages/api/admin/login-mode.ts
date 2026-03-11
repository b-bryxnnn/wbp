import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { verifyAdmin } from "../../../lib/adminAuth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // GET is public (needed by vote page to check geoCheckEnabled)
  // PUT requires admin auth
  if (req.method === "PUT") {
    if (!(await verifyAdmin(req, res))) return;
  }

  try {
    if (req.method === "GET") {
      let control: any = null;
      try {
        control = await prisma.controlState.findUnique({ where: { id: 1 } });
      } catch {
        // DB not ready — return default
      }
      return res.status(200).json({
        loginMode: control?.loginMode || "PER_SCHOOL",
        geoCheckEnabled: control?.geoCheckEnabled ?? true,
      });
    }
    if (req.method === "PUT") {
      const { loginMode, geoCheckEnabled } = req.body;
      const data: any = {};
      if (loginMode && ["PER_SCHOOL", "PER_INDIVIDUAL"].includes(loginMode)) {
        data.loginMode = loginMode;
      }
      if (typeof geoCheckEnabled === "boolean") {
        data.geoCheckEnabled = geoCheckEnabled;
      }
      if (Object.keys(data).length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }
      const updated = await prisma.controlState.upsert({ where: { id: 1 }, update: data, create: data });
      return res.status(200).json({
        loginMode: updated.loginMode,
        geoCheckEnabled: updated.geoCheckEnabled,
      });
    }
    return res.status(405).end();
  } catch (err: any) {
    console.error("login-mode error:", err);
    return res.status(200).json({ loginMode: "PER_SCHOOL", geoCheckEnabled: true, _dbError: true });
  }
}
