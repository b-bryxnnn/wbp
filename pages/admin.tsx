import React, { useEffect, useState, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import dynamic from "next/dynamic";
import {
  Settings, Monitor, Vote, Plus, Radio, Timer,
  ThumbsUp, ThumbsDown, Hand, QrCode, FileText, FileSpreadsheet,
  ScrollText, CheckCircle, School, Key, Printer, RefreshCw,
  Lock, LogIn, ShieldCheck, KeyRound, Eye, EyeOff, LogOut, Inbox,
  Trash2, Globe, Users, Wifi, WifiOff, BookCheck, FileCheck2, ChevronDown, ChevronUp, FileDown,
  MapPin, RotateCcw, AlertTriangle, XCircle, CheckCircle2, Navigation, Info,
} from "lucide-react";

const QRCode = dynamic(() => import("react-qr-code"), { ssr: false });

const CHOICE_OPTIONS = [
  { key: "AGREE", label: "เห็นด้วย", Icon: ThumbsUp },
  { key: "DISAGREE", label: "ไม่เห็นด้วย", Icon: ThumbsDown },
  { key: "ABSTAIN", label: "งดออกเสียง", Icon: Hand },
  { key: "ACKNOWLEDGE", label: "รับทราบ", Icon: BookCheck },
  { key: "RESOLUTION", label: "มติ", Icon: FileCheck2 },
];

const CHOICE_LABELS: Record<string, string> = {
  AGREE: "เห็นด้วย", DISAGREE: "ไม่เห็นด้วย", ABSTAIN: "งดออกเสียง",
  ACKNOWLEDGE: "รับทราบ", RESOLUTION: "มติ",
};

type Motion = { id: number; title: string; description: string; isActive: boolean; allowedChoices?: string[] };
type SchoolT = { id: number; name: string; loginToken?: string; logoUrl?: string; username?: string | null };
type VoteDetailItem = { schoolName: string; userName: string; choice: string };
type Toast = { id: number; type: "success" | "error" | "info"; message: string };

type State = {
  motions: Motion[];
  votes: Record<number, Record<string, number>>;
  voteDetails: Record<number, VoteDetailItem[]>;
  attendance: Record<number, boolean>;
  bigScreenMessage: string;
  votingOpen: boolean;
  activeMotionId: number | null;
  countdownEnd: number | null;
  schools: SchoolT[];
  auditLogs: { action: string; detail?: string; ip?: string; at: number }[];
  onlineSchools: number[];
};

type Credential = { name: string; username: string; password: string; type: string; qrToken: string };
type Account = {
  id: number; name: string; username?: string; hasCredentials: boolean;
  loginToken?: string; logoUrl?: string; loginIp?: string; isOnline?: boolean;
  schoolName?: string;
};

export default function Admin() {
  const [authed, setAuthed] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [adminPw, setAdminPw] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changePwMsg, setChangePwMsg] = useState("");
  const [changePwError, setChangePwError] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  const [socket, setSocket] = useState<Socket | null>(null);
  const [state, setState] = useState<State>({
    motions: [], votes: {}, voteDetails: {}, attendance: {}, bigScreenMessage: "",
    votingOpen: false, activeMotionId: null, countdownEnd: null, schools: [], auditLogs: [], onlineSchools: [],
  });
  const [message, setMessage] = useState("");
  const [motionTitle, setMotionTitle] = useState("");
  const [motionDescription, setMotionDescription] = useState("");
  const [motionChoices, setMotionChoices] = useState<string[]>(["AGREE", "DISAGREE", "ABSTAIN"]);
  const [selectedMotion, setSelectedMotion] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(60);
  const [schools, setSchools] = useState<SchoolT[]>([]);
  const [loginMode, setLoginMode] = useState<string>("PER_SCHOOL");
  const [geoCheckEnabled, setGeoCheckEnabled] = useState(true);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("main");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [expandedMotion, setExpandedMotion] = useState<number | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [resetting, setResetting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const toastIdRef = useRef(0);

  // Toast helper
  const showToast = useCallback((type: "success" | "error" | "info", message: string) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  // Check if already authenticated
  useEffect(() => {
    fetch("/api/auth/admin-login")
      .then((r) => { if (r.ok) setAuthed(true); })
      .finally(() => setAuthChecking(false));
  }, []);

  const handleAdminLogin = async () => {
    setAdminError(""); setAdminLoading(true);
    try {
      const res = await fetch("/api/auth/admin-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: adminPw }) });
      const data = await res.json();
      if (!res.ok) { setAdminError(data.error || "เข้าสู่ระบบไม่สำเร็จ"); return; }
      setAuthed(true);
    } catch { setAdminError("เกิดข้อผิดพลาดในการเชื่อมต่อ"); } finally { setAdminLoading(false); }
  };

  const handleChangePassword = async () => {
    setChangePwMsg(""); setChangePwError("");
    if (!newPassword || newPassword.length < 4) { setChangePwError("รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร"); return; }
    if (newPassword !== confirmPassword) { setChangePwError("รหัสผ่านไม่ตรงกัน"); return; }
    setChangingPw(true);
    try {
      const res = await fetch("/api/auth/admin-login", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ newPassword }) });
      const data = await res.json();
      if (!res.ok) { setChangePwError(data.error || "เปลี่ยนรหัสผ่านไม่สำเร็จ"); return; }
      setChangePwMsg("เปลี่ยนรหัสผ่านสำเร็จแล้ว"); setNewPassword(""); setConfirmPassword("");
      showToast("success", "เปลี่ยนรหัสผ่านสำเร็จ");
    } catch { setChangePwError("เกิดข้อผิดพลาดในการเชื่อมต่อ"); } finally { setChangingPw(false); }
  };

  useEffect(() => {
    if (!authed) return;
    fetch("/api/socket").then(() => {
      const s = io({ path: "/api/socket", transports: ["websocket", "polling"] });
      setSocket(s);
      s.on("state:update", (data: State) => setState(data));
      // Listen for action results
      s.on("admin:action-result", (data: { success: boolean; action: string; detail?: string }) => {
        showToast(data.success ? "success" : "error", data.action + (data.detail ? ` — ${data.detail}` : ""));
      });
      s.io.on("error", () => showToast("error", "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้"));
      s.on("connect_error", () => showToast("error", "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้"));
    });
  }, [authed, showToast]);

  useEffect(() => {
    if (!authed) return;
    fetch("/api/schools")
      .then((r) => { if (r.status === 401) { setAuthed(false); throw new Error("Unauthorized"); } if (!r.ok) throw new Error(r.statusText); return r.json(); })
      .then((data) => setSchools(data.schools || []))
      .catch((e) => console.error("Failed to load schools:", e));
    fetch("/api/admin/login-mode")
      .then((r) => { if (r.status === 401) { setAuthed(false); throw new Error("Unauthorized"); } if (!r.ok) throw new Error(r.statusText); return r.json(); })
      .then((data) => { setLoginMode(data.loginMode); setGeoCheckEnabled(data.geoCheckEnabled ?? true); })
      .catch((e) => console.error("Failed to load login-mode:", e));
  }, [authed]);

  const loadAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const res = await fetch("/api/admin/accounts");
      if (res.ok) { const data = await res.json(); setAccounts(data.accounts || []); }
    } catch (e) { console.error(e); } finally { setLoadingAccounts(false); }
  };

  useEffect(() => { if (authed && activeTab === "accounts") void loadAccounts(); }, [authed, activeTab]);

  // Refresh schools when switching to QR tab
  useEffect(() => {
    if (!authed || activeTab !== "qr") return;
    fetch("/api/schools")
      .then((r) => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
      .then((data) => setSchools(data.schools || []))
      .catch(() => {});
  }, [authed, activeTab]);

  const sendMessage = () => {
    showToast("info", "ส่งคำสั่งไปยังจอใหญ่แล้ว");
    socket?.emit("admin:screen-control", { message });
  };
  const addMotion = () => {
    if (!motionTitle) return;
    showToast("info", "ส่งคำขอเพิ่มญัตติแล้ว");
    socket?.emit("admin:add-motion", { title: motionTitle, description: motionDescription, allowedChoices: motionChoices });
    setMotionTitle(""); setMotionDescription(""); setMotionChoices(["AGREE", "DISAGREE", "ABSTAIN"]);
  };
  const deleteMotion = (motionId: number) => {
    if (!confirm("ต้องการลบญัตตินี้หรือไม่?")) return;
    showToast("info", "กำลังลบญัตติ...");
    socket?.emit("admin:delete-motion", { motionId });
  };
  const toggleVote = (open: boolean) => {
    showToast("info", open ? "ส่งคำสั่งเปิดรับโหวต" : "ส่งคำสั่งปิดรับโหวต");
    socket?.emit("admin:toggle-vote", { open, motionId: selectedMotion });
  };
  const setCountdownTimer = () => {
    showToast("info", "ตั้งเวลาแล้ว ส่งคำสั่ง...");
    socket?.emit("admin:set-countdown", { seconds: countdown });
  };
  const changeLoginMode = async (mode: string) => {
    await fetch("/api/admin/login-mode", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ loginMode: mode }) });
    setLoginMode(mode);
    showToast("success", `เปลี่ยนโหมดเป็น ${mode === "PER_SCHOOL" ? "รายโรงเรียน" : "รายบุคคล"}`);
  };

  const toggleGeoCheck = async () => {
    const newVal = !geoCheckEnabled;
    try {
      showToast("info", "กำลังบันทึกการตั้งค่า GPS...");
      const res = await fetch("/api/admin/login-mode", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ geoCheckEnabled: newVal }) });
      if (res.ok) {
        setGeoCheckEnabled(newVal);
        showToast("success", newVal ? "เปิดระบบตรวจสอบตำแหน่ง" : "ปิดระบบตรวจสอบตำแหน่ง");
      }
    } catch { showToast("error", "เกิดข้อผิดพลาด"); }
  };

  const handleResetSystem = async () => {
    if (!confirm("⚠️ ยืนยันการรีเซ็ตระบบ?\n\nจะลบข้อมูลทั้งหมด:\n- ผลการลงมติ\n- บันทึกการทำงาน\n- การเช็คชื่อ\n- ญัตติทั้งหมด\n\nข้อมูลโรงเรียนและบัญชีจะไม่ถูกลบ")) return;
    if (!confirm("ยืนยันอีกครั้ง: คุณแน่ใจว่าต้องการรีเซ็ตข้อมูลทั้งหมด?")) return;
    setResetting(true);
    try {
      showToast("info", "กำลังรีเซ็ตระบบ...");
      const res = await fetch("/api/admin/reset", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        showToast("success", "รีเซ็ตระบบสำเร็จ");
      } else {
        showToast("error", data.error || "รีเซ็ตไม่สำเร็จ");
      }
    } catch { showToast("error", "เกิดข้อผิดพลาดในการเชื่อมต่อ"); } finally { setResetting(false); }
  };

  const generateCredentials = async () => {
    setGenerating(true);
    try {
      showToast("info", "กำลังสร้างบัญชีและ QR...");
      const res = await fetch("/api/admin/generate-credentials", { method: "POST" });
      if (!res.ok) { const err = await res.json().catch(() => ({ error: "เกิดข้อผิดพลาด" })); showToast("error", err.error || "สร้างข้อมูลล็อกอินไม่สำเร็จ"); return; }
      const data = await res.json();
      setCredentials(data.credentials || []);
      showToast("success", `สร้างบัญชีสำเร็จ ${(data.credentials || []).length} รายการ`);
      const schoolsRes = await fetch("/api/schools");
      if (schoolsRes.ok) { const sd = await schoolsRes.json(); setSchools(sd.schools || []); }
    } catch (e: any) { showToast("error", "เชื่อมต่อ server ไม่ได้: " + e.message); } finally { setGenerating(false); }
  };

  const deleteAccount = async (id: number, type: string) => {
    if (!confirm("ต้องการลบข้อมูลบัญชีนี้หรือไม่? QR Code จะถูกยกเลิกด้วย")) return;
    try {
      showToast("info", "กำลังลบบัญชี...");
      const res = await fetch("/api/admin/accounts", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, type }) });
      if (res.ok) {
        showToast("success", "ลบบัญชีสำเร็จ");
        await loadAccounts();
        const schoolsRes = await fetch("/api/schools");
        if (schoolsRes.ok) { const sd = await schoolsRes.json(); setSchools(sd.schools || []); }
      }
      else showToast("error", "ลบไม่สำเร็จ");
    } catch { showToast("error", "เกิดข้อผิดพลาด"); }
  };

  const handlePrintCredentials = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html lang="th"><head><meta charset="utf-8"><title>ข้อมูลบัญชีเข้าสู่ระบบ</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap');
  body { font-family: 'Sarabun', sans-serif; margin: 20px; color: #333; }
  h1 { text-align: center; font-size: 18px; margin-bottom: 20px; color: #2d2312; }
  .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .card { border: 2px solid #c8a24e; border-radius: 12px; padding: 16px; page-break-inside: avoid; background: linear-gradient(135deg, #fffdf7, #fef9e7); }
  .card-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid rgba(200,162,78,0.3); }
  .school-num { background: #c8a24e; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; }
  .name { font-weight: 700; font-size: 13px; color: #2d2312; }
  .cred { font-family: 'Courier New', monospace; font-size: 12px; color: #555; margin-top: 4px; }
  .cred b { color: #2d2312; background: rgba(200,162,78,0.15); padding: 1px 6px; border-radius: 4px; }
  .footer { text-align: center; margin-top: 20px; font-size: 10px; color: #999; }
  @media print { body { margin: 10px; } .grid { gap: 8px; } }
</style></head><body>
<h1>🏛️ ข้อมูลบัญชีเข้าสู่ระบบ — สหวิทยาเขตวชิรบูรพา</h1>
<div class="grid">${credentials.map((c, i) => `
  <div class="card">
    <div class="card-header"><div class="school-num">${i + 1}</div><div class="name">${c.name}</div></div>
    <div class="cred">ชื่อผู้ใช้: <b>${c.username}</b></div>
    <div class="cred">รหัสผ่าน: <b>${c.password}</b></div>
  </div>`).join("")}
</div>
<div class="footer">สภานักเรียน สหวิทยาเขตวชิรบูรพา — ${new Date().toLocaleDateString("th-TH")}</div>
</body></html>`);
    w.document.close(); w.focus(); setTimeout(() => { w.print(); }, 500);
  };

  // Beautified A5 QR print
  const handlePrintQR = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const credSchools = schools.filter((s) => s.loginToken && s.username);
    const pairs: typeof schools[] = [];
    for (let i = 0; i < credSchools.length; i += 2) {
      pairs.push(credSchools.slice(i, i + 2));
    }
    const cardsHtml = pairs.map((pair) =>
      `<div class="page">${pair.map((s) => {
        const url = typeof window !== "undefined" ? `${window.location.origin}/vote?token=${s.loginToken}` : "";
        const logoHtml = s.logoUrl ? `<img src="${s.logoUrl.replace(/^http:\/\//i, "https://")}" class="logo" />` : "";
        return `<div class="half">
          <div class="card-inner">
            <div class="gold-bar"></div>
            <div class="header-row">
              <div class="header-text">
                <div class="header-title">wbp.rslhub.me</div>
                <div class="header-sub">ระบบลงมติออนไลน์ — อบรมโครงการส่งเสริมภาวะผู้นำสภานักเรียน</div>
              </div>
            </div>
            <div class="school-section">
              ${logoHtml}
              <div class="name">${s.name}</div>
            </div>
            <div class="qr-frame">
              <div class="qr"><img src="https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=${encodeURIComponent(url)}&color=2d2312" width="280" height="280" /></div>
            </div>
            <div class="scan-text">📱 สแกน QR Code เพื่อเข้าสู่ระบบลงมติ</div>
            <div class="url">${url}</div>
            <div class="gold-bar-bottom"></div>
          </div>
        </div>`;
      }).join("")}</div>`
    ).join("");

    w.document.write(`<!DOCTYPE html><html lang="th"><head><meta charset="utf-8"><title>QR Code เข้าสู่ระบบ</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700;800&display=swap');
  @page { size: A4 landscape; margin: 8mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Sarabun', sans-serif; color: #2d2312; }
  .page { display: flex; width: 100%; height: 100vh; page-break-after: always; gap: 16px; padding: 6px; }
  .half { width: 50%; display: flex; align-items: center; justify-content: center; }
  .card-inner { width: 100%; max-width: 520px; min-height: 360px; border: 3px solid #c8a24e; border-radius: 22px; padding: 0; overflow: hidden; background: #fffdf7; position: relative; box-shadow: 0 12px 40px rgba(0,0,0,0.08); }
  .gold-bar { height: 6px; background: linear-gradient(90deg, #daa520, #c8a24e, #b8860b); }
  .gold-bar-bottom { height: 4px; background: linear-gradient(90deg, #b8860b, #c8a24e, #daa520); }
  .header-row { display: flex; align-items: center; gap: 12px; padding: 18px 24px 10px; }
  .header-title { font-weight: 800; font-size: 14px; color: #2d2312; }
  .header-sub { font-size: 11px; color: #8b6914; font-weight: 700; line-height: 1.45; }
  .school-section { text-align: center; padding: 12px 24px 14px; }
  .logo { width: 78px; height: 78px; object-fit: contain; margin-bottom: 10px; border-radius: 50%; border: 2px solid rgba(200,162,78,0.25); padding: 4px; background: white; }
  .name { font-weight: 800; font-size: 17px; text-align: center; color: #2d2312; line-height: 1.35; }
  .qr-frame { display: flex; justify-content: center; padding: 0 28px 16px; }
  .qr { background: white; padding: 14px; border-radius: 18px; border: 2px solid rgba(200,162,78,0.24); box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
  .scan-text { text-align: center; font-size: 13px; color: #8b6914; font-weight: 800; padding: 0 24px 6px; letter-spacing: 0.01em; }
  .url { font-size: 8px; color: #9c8b68; word-break: break-all; text-align: center; padding: 0 24px 16px; max-width: 420px; margin: 0 auto; }
</style></head><body>${cardsHtml}</body></html>`);
    w.document.close(); w.focus(); setTimeout(() => { w.print(); }, 1200);
  };

  const totalSchools = state.schools.length;
  const presentSchools = Object.values(state.attendance).filter(Boolean).length;
  const onlineCount = (state.onlineSchools || []).length;

  // ===== Admin Login Gate =====
  if (authChecking) {
    return (
      <div className="animate-fade-in flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-3 border-gold-300 border-t-gold-600 animate-spin" />
          <div className="text-royal-400 text-sm">กำลังตรวจสอบสิทธิ์...</div>
        </div>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="animate-fade-in min-h-[70vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="card-royal">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gold-300 to-gold-600 flex items-center justify-center text-white mx-auto mb-4 shadow-gold"><ShieldCheck size={28} /></div>
              <h2 className="text-xl font-extrabold text-royal-900">เข้าสู่ระบบผู้ดูแล</h2>
              <p className="text-sm text-royal-400 mt-2">กรุณากรอกรหัสผ่านเพื่อเข้าจัดการระบบ</p>
            </div>
            <div className="space-y-4">
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-royal-300 pointer-events-none z-10" />
                <input className="input-royal !pl-10 !pr-10" type={showPw ? "text" : "password"} placeholder="รหัสผ่านผู้ดูแลระบบ" value={adminPw} onChange={(e) => setAdminPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()} autoFocus />
                <button type="button" className="absolute right-3.5 top-1/2 -translate-y-1/2 text-royal-300 hover:text-royal-500 transition-colors z-10" onClick={() => setShowPw(!showPw)} tabIndex={-1}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {adminError && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 text-center">{adminError}</div>}
              <button className="btn-gold w-full flex items-center justify-center gap-2 py-3" onClick={handleAdminLogin} disabled={adminLoading || !adminPw}>
                <LogIn size={18} /> {adminLoading ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบ"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== Tab navigation =====
  const tabs = [
    { id: "main", label: "ควบคุมหลัก", icon: Settings },
    { id: "motions", label: "ญัตติ/มติ", icon: Vote },
    { id: "login", label: "ล็อกอิน", icon: Key },
    { id: "accounts", label: "บัญชี", icon: Users },
    { id: "qr", label: "QR Code", icon: QrCode },
    { id: "reports", label: "รายงาน", icon: FileText },
    { id: "settings", label: "ตั้งค่า", icon: Lock },
  ];

  // ===== Admin Panel (authenticated) =====
  return (
    <div className="animate-fade-in max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type === "success" ? "toast-success" : t.type === "info" ? "toast-info" : "toast-error"}`}>
            {t.type === "success" ? <CheckCircle2 size={16} /> : t.type === "info" ? <Info size={16} /> : <XCircle size={16} />}
            {t.message}
          </div>
        ))}
      </div>

      {/* Page Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6 gap-3">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-2xl font-extrabold text-royal-900 flex items-center gap-2">
            <Settings size={20} className="flex-shrink-0" /> <span className="hidden sm:inline">หน้าผู้ดูแลระบบ</span><span className="sm:hidden">ผู้ดูแล</span>
          </h2>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <span className={state.votingOpen ? "badge-success" : "badge-danger"}>
              <span className={`w-2 h-2 rounded-full inline-block ${state.votingOpen ? "bg-green-500" : "bg-red-500"}`} /> {state.votingOpen ? "เปิดโหวต" : "ปิดโหวต"}
            </span>
            <span className="badge-gold"><School size={12} /> {presentSchools}/{totalSchools}</span>
            <span className="badge-gold"><Wifi size={12} /> ออนไลน์ {onlineCount}</span>
            <span className={`badge-gold ${!geoCheckEnabled ? '!bg-yellow-50 !border-yellow-300 !text-yellow-700' : ''}`}>
              <MapPin size={12} /> GPS {geoCheckEnabled ? "เปิด" : "ปิด"}
            </span>
          </div>
        </div>
        <button className="btn-outline-gold text-xs sm:text-sm flex items-center gap-1.5 flex-shrink-0 py-2 px-3" onClick={() => { document.cookie = "admin_token=; path=/; max-age=0"; setAuthed(false); }}>
          <LogOut size={14} /> <span className="hidden sm:inline">ออกจากระบบ</span>
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-0.5 overflow-x-auto pb-1 mb-4 sm:mb-6 border-b border-gold/15 no-print -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-hide">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold rounded-t-lg whitespace-nowrap transition-all ${activeTab === tab.id ? "bg-white text-royal-800 border border-gold/20 border-b-white -mb-px shadow-sm" : "text-royal-400 hover:text-royal-600 hover:bg-gold/5"}`}>
            <tab.icon size={14} className="flex-shrink-0" /> {tab.label}
          </button>
        ))}
      </div>

      {/* ===== TAB: Main Control ===== */}
      {activeTab === "main" && (
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2 animate-fade-in">
          {/* ควบคุมหน้าจอใหญ่ */}
          <div className="card-royal !p-4 sm:!p-6">
            <h3 className="section-title mb-3 sm:mb-4"><Monitor size={16} className="text-gold-600" /> ควบคุมหน้าจอใหญ่</h3>
            <textarea
              className="input-royal mb-3" rows={2} value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="พิมพ์ข้อความที่ต้องการแสดงบนจอใหญ่..."
            />
            <button className="btn-gold w-full flex items-center justify-center gap-2 text-sm sm:text-base" onClick={sendMessage}>
              <Radio size={16} /> อัปเดตข้อความจอใหญ่
            </button>
            <p className="text-xs text-royal-300 mt-2">เข้าถึงจอใหญ่ได้ที่ /led</p>
          </div>

          {/* สถานะออนไลน์ */}
          <div className="card-royal !p-4 sm:!p-6">
            <h3 className="section-title mb-3 sm:mb-4"><Wifi size={16} className="text-gold-600" /> สถานะออนไลน์ <span className="text-xs font-normal text-royal-300 ml-2">(อัปเดตอัตโนมัติ)</span></h3>
            <div className="space-y-1.5 sm:grid sm:grid-cols-2 sm:gap-2 sm:space-y-0">
              {state.schools.map((s) => {
                const isOnline = (state.onlineSchools || []).includes(s.id);
                return (
                  <div key={s.id} className={`p-2.5 sm:p-3 rounded-lg border font-medium transition-all flex items-start gap-2 ${isOnline ? "bg-green-50 border-green-300 text-green-800" : "bg-white border-gold/15 text-royal-400"}`}>
                    {s.logoUrl ? (
                      <img src={s.logoUrl.replace(/^http:\/\//i, "https://")} alt="" className="school-avatar-sm flex-shrink-0 mt-0.5" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0 mt-0.5"><School size={13} className="text-gold-500" /></div>
                    )}
                    {isOnline ? <Wifi size={14} className="text-green-600 flex-shrink-0 mt-1" /> : <WifiOff size={14} className="text-royal-300 flex-shrink-0 mt-1" />}
                    <span className="text-sm leading-snug min-w-0 break-words">{s.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Audit Log with IP */}
          <div className="card-royal !p-4 sm:!p-6 lg:col-span-2">
            <h3 className="section-title mb-3 sm:mb-4"><ScrollText size={16} className="text-gold-600" /> บันทึกการทำงาน</h3>
            <div className="max-h-64 overflow-y-auto space-y-1.5">
              {state.auditLogs.map((log, idx) => (
                <div key={idx} className="flex justify-between gap-2 bg-cream-50 border border-gold/10 p-2 sm:p-2.5 rounded-lg text-xs sm:text-sm">
                  <span className="text-royal-700 min-w-0">
                    {log.action} {log.detail ? `— ${log.detail}` : ""}
                    {log.ip && <span className="text-royal-300 ml-1 text-xs">({log.ip})</span>}
                  </span>
                  <span className="text-royal-300 text-xs whitespace-nowrap flex-shrink-0">{new Date(log.at).toLocaleTimeString()}</span>
                </div>
              ))}
              {state.auditLogs.length === 0 && (
                <div className="text-center py-8"><Inbox size={32} className="text-royal-200 mx-auto mb-2" /><div className="text-royal-300 text-sm">ยังไม่มีบันทึก</div></div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== TAB: Motions ===== */}
      {activeTab === "motions" && (
        <div className="animate-fade-in">
          <div className="card-royal !p-4 sm:!p-6">
            <h3 className="section-title mb-4 sm:mb-5"><Vote size={16} className="text-gold-600" /> จัดการญัตติ/มติ</h3>
            <div className="grid md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-royal-600">เพิ่มญัตติใหม่</label>
                <input className="input-royal" placeholder="ชื่อญัตติ" value={motionTitle} onChange={(e) => setMotionTitle(e.target.value)} />
                <textarea className="input-royal" placeholder="คำอธิบาย (ไม่บังคับ)" rows={2} value={motionDescription} onChange={(e) => setMotionDescription(e.target.value)} />
                <div>
                  <label className="text-xs font-semibold text-royal-500 mb-1.5 block">ตัวเลือกมติ</label>
                  <div className="flex flex-wrap gap-2">
                    {CHOICE_OPTIONS.map((c) => (
                      <label key={c.key} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border cursor-pointer transition-all ${motionChoices.includes(c.key) ? "bg-gold-50 border-gold text-gold-700 font-semibold" : "border-gold/20 text-royal-400 hover:bg-gold/5"}`}>
                        <input type="checkbox" className="hidden" checked={motionChoices.includes(c.key)} onChange={(e) => {
                          setMotionChoices(e.target.checked ? [...motionChoices, c.key] : motionChoices.filter((k) => k !== c.key));
                        }} />
                        <c.Icon size={12} /> {c.label}
                      </label>
                    ))}
                  </div>
                </div>
                <button className="btn-gold w-full flex items-center justify-center gap-2 text-sm sm:text-base" onClick={addMotion}><Plus size={16} /> เพิ่มญัตติ</button>
              </div>
              <div className="space-y-3">
                <label className="text-sm font-semibold text-royal-600">ควบคุมการโหวต</label>
                <select className="input-royal" value={selectedMotion ?? ""} onChange={(e) => setSelectedMotion(e.target.value ? Number(e.target.value) : null)}>
                  <option value="">-- เลือกญัตติ --</option>
                  {state.motions.map((m) => (<option key={m.id} value={m.id}>{m.title}</option>))}
                </select>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  <button className="px-2 sm:px-3 py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all text-xs sm:text-sm" onClick={() => toggleVote(true)}>เปิดโหวต</button>
                  <button className="px-2 sm:px-3 py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all text-xs sm:text-sm" onClick={() => toggleVote(false)}>ปิดโหวต</button>
                  <button className="px-2 sm:px-3 py-2.5 bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 transition-all text-xs sm:text-sm flex items-center justify-center gap-1" onClick={setCountdownTimer}>
                    <Timer size={12} /> จับเวลา
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs sm:text-sm text-royal-500 whitespace-nowrap">ตั้งเวลา:</label>
                  <input type="number" className="input-royal w-20" value={countdown} onChange={(e) => setCountdown(Number(e.target.value))} />
                  <span className="text-xs sm:text-sm text-royal-400">วินาที</span>
                </div>
                <p className="text-xs text-royal-300">* เมื่อหมดเวลา ระบบจะปิดรับมติโดยอัตโนมัติ</p>
              </div>
            </div>
            {state.motions.length > 0 && (
              <div className="border-t border-gold/15 pt-4">
                <p className="text-sm font-semibold text-royal-600 mb-3">ญัตติทั้งหมด ({state.motions.length})</p>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {state.motions.map((m) => {
                    const v = state.votes[m.id] || {};
                    const choices = m.allowedChoices || ["AGREE", "DISAGREE", "ABSTAIN"];
                    const isExpanded = expandedMotion === m.id;
                    const details = state.voteDetails[m.id] || [];
                    const totalVotes = choices.reduce((sum, c) => sum + (v[c] || 0), 0);
                    const agree = v["AGREE"] || 0;
                    const disagree = v["DISAGREE"] || 0;
                    const result = totalVotes === 0 ? "-" : agree > disagree ? "ผ่าน" : agree < disagree ? "ไม่ผ่าน" : "เท่ากัน";
                    const resultColor = agree > disagree ? "text-green-600" : agree < disagree ? "text-red-600" : "text-yellow-600";
                    return (
                      <div key={m.id} className={`p-3 sm:p-4 rounded-xl border text-sm transition-all ${state.activeMotionId === m.id ? "bg-gold-50 border-gold shadow-sm" : "bg-white border-gold/10 hover:border-gold/30"}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-royal-800 text-xs sm:text-sm">{m.title}</span>
                            {state.activeMotionId === m.id && <span className="ml-2 badge-gold text-xs">กำลังใช้งาน</span>}
                            {m.description && <p className="text-xs text-royal-400 mt-0.5">{m.description}</p>}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {totalVotes > 0 && <span className={`text-xs font-bold ${resultColor}`}>{result}</span>}
                            <span className="text-xs text-royal-300">{totalVotes} เสียง</span>
                            <button onClick={() => setExpandedMotion(isExpanded ? null : m.id)} className="text-gold-500 hover:text-gold-700 p-1 rounded-lg hover:bg-gold/10 transition-colors">
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                            <button onClick={() => deleteMotion(m.id)} className="text-red-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                          </div>
                        </div>

                        {/* Vote summary bar */}
                        {totalVotes > 0 && (
                          <div className="mt-2 flex gap-1 h-2 rounded-full overflow-hidden bg-gray-100">
                            {choices.map((c) => {
                              const count = v[c] || 0;
                              if (count === 0) return null;
                              const pct = (count / totalVotes) * 100;
                              const colors: Record<string, string> = {
                                AGREE: "bg-green-500", DISAGREE: "bg-red-500", ABSTAIN: "bg-yellow-500",
                                ACKNOWLEDGE: "bg-blue-500", RESOLUTION: "bg-purple-500",
                              };
                              return <div key={c} className={`${colors[c] || "bg-gray-400"} transition-all duration-500`} style={{ width: `${pct}%` }} />;
                            })}
                          </div>
                        )}

                        {/* Allowed choices tags */}
                        {m.allowedChoices && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {m.allowedChoices.map((c) => (
                              <span key={c} className="text-[10px] bg-cream-100 text-royal-400 px-2 py-0.5 rounded-full">
                                {CHOICE_LABELS[c] || c}: <b>{v[c] || 0}</b>
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Expanded vote details */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-gold/10">
                            <p className="text-xs font-bold text-royal-600 mb-2 flex items-center gap-1">
                              <FileText size={12} /> รายละเอียดการโหวต ({details.length} รายการ)
                            </p>
                            {details.length > 0 ? (
                              <div className="space-y-1 max-h-60 overflow-y-auto">
                                {/* Group by school */}
                                {(() => {
                                  const grouped: Record<string, VoteDetailItem[]> = {};
                                  details.forEach((d) => {
                                    if (!grouped[d.schoolName]) grouped[d.schoolName] = [];
                                    grouped[d.schoolName].push(d);
                                  });
                                  return Object.entries(grouped).map(([schoolName, items]) => (
                                    <div key={schoolName} className="bg-cream-50 border border-gold/10 rounded-lg p-2.5">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-royal-700 flex items-center gap-1"><School size={11} /> {schoolName}</span>
                                        <div className="flex gap-1">
                                          {items.map((item, i) => {
                                            const choiceColors: Record<string, string> = {
                                              AGREE: "bg-green-100 text-green-700 border-green-200",
                                              DISAGREE: "bg-red-100 text-red-700 border-red-200",
                                              ABSTAIN: "bg-yellow-100 text-yellow-700 border-yellow-200",
                                              ACKNOWLEDGE: "bg-blue-100 text-blue-700 border-blue-200",
                                              RESOLUTION: "bg-purple-100 text-purple-700 border-purple-200",
                                            };
                                            return (
                                              <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${choiceColors[item.choice] || "bg-gray-100 text-gray-600"}`}>
                                                {CHOICE_LABELS[item.choice] || item.choice}
                                              </span>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                  ));
                                })()}
                              </div>
                            ) : (
                              <div className="text-center py-4 text-royal-300 text-xs">ยังไม่มีการโหวต</div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {selectedMotion && (() => {
                  const m = state.motions.find((mo) => mo.id === selectedMotion);
                  if (!m) return null;
                  const v = state.votes[m.id] || {};
                  const choices = m.allowedChoices || ["AGREE", "DISAGREE", "ABSTAIN"];
                  const total = choices.reduce((s, k) => s + (v[k] || 0), 0);
                  return (
                    <div className="mt-4 card-royal bg-cream-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-bold text-royal-800 flex items-center gap-2"><ScrollText size={14} /> ข้อมูลญัตติที่เลือก</div>
                        <span className="text-xs text-royal-400">รวม {total} เสียง</span>
                      </div>
                      <div className="text-lg font-extrabold text-royal-900 mb-1">{m.title}</div>
                      {m.description && <div className="text-sm text-royal-500 mb-2">{m.description}</div>}
                      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2 mt-3">
                        {choices.map((c) => (
                          <div key={c} className="bg-white border border-gold/20 rounded-lg p-3 flex items-center justify-between">
                            <span className="text-sm font-semibold text-royal-700">{CHOICE_LABELS[c] || c}</span>
                            <span className="text-lg font-extrabold text-royal-900">{v[c] || 0}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== TAB: Login Settings ===== */}
      {activeTab === "login" && (
        <div className="animate-fade-in">
          <div className="card-royal !p-4 sm:!p-6">
            <h3 className="section-title mb-4 sm:mb-5"><Key size={16} className="text-gold-600" /> ตั้งค่าการเข้าสู่ระบบ</h3>
            <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-royal-600 mb-2 block">โหมดการเข้าสู่ระบบ</label>
                  <select className="input-royal" value={loginMode} onChange={(e) => changeLoginMode(e.target.value)}>
                    <option value="PER_SCHOOL">รายโรงเรียน (1 เครื่องต่อ 1 โรงเรียน)</option>
                    <option value="PER_INDIVIDUAL">รายบุคคล</option>
                  </select>
                  <p className="text-xs text-royal-400 mt-1.5">{loginMode === "PER_SCHOOL" ? "แต่ละโรงเรียนใช้บัญชีเดียว หากล็อกอินซ้ำจะเด้งเครื่องเก่าทันที" : "แต่ละบุคคลมีบัญชีแยก"}</p>
                </div>
                <button className="btn-gold w-full flex items-center justify-center gap-2 text-sm sm:text-base" onClick={generateCredentials} disabled={generating}>
                  {generating ? <RefreshCw size={16} className="animate-spin" /> : <Key size={16} />}
                  {generating ? "กำลังสร้าง..." : "สร้างบัญชีเข้าสู่ระบบ"}
                </button>
              </div>
              {credentials.length > 0 && (
                <div ref={printRef}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-royal-600">บัญชีที่สร้างแล้ว ({credentials.length})</p>
                    <button className="text-xs text-gold-600 hover:underline flex items-center gap-1" onClick={handlePrintCredentials}><Printer size={12} /> พิมพ์</button>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {credentials.map((c, i) => (
                      <div key={i} className="bg-cream-50 border border-gold/15 rounded-lg p-2.5 sm:p-3">
                        <div className="font-semibold text-royal-800 text-xs sm:text-sm leading-snug">{c.name}</div>
                        <div className="text-royal-500 font-mono text-[10px] sm:text-xs mt-1 break-all">
                          ผู้ใช้: <span className="text-royal-700 bg-gold/10 px-1 rounded">{c.username}</span> &nbsp; รหัส: <span className="text-royal-700 bg-gold/10 px-1 rounded">{c.password}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== TAB: Accounts ===== */}
      {activeTab === "accounts" && (
        <div className="animate-fade-in">
          <div className="card-royal !p-4 sm:!p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title"><Users size={16} className="text-gold-600" /> บัญชีทั้งหมด</h3>
              <button className="text-xs text-gold-600 hover:underline flex items-center gap-1" onClick={() => void loadAccounts()}><RefreshCw size={12} /> รีเฟรช</button>
            </div>
            {loadingAccounts ? (
              <div className="text-center py-8"><div className="w-8 h-8 rounded-full border-2 border-gold-300 border-t-gold-600 animate-spin mx-auto mb-2" /><div className="text-royal-400 text-sm">กำลังโหลด...</div></div>
            ) : accounts.length === 0 ? (
              <div className="text-center py-8"><Inbox size={32} className="text-royal-200 mx-auto mb-2" /><div className="text-royal-300 text-sm">ยังไม่มีบัญชี (กรุณาสร้างในแท็บ "ล็อกอิน")</div></div>
            ) : (
              <div className="space-y-2">
                {accounts.map((a) => (
                  <div key={a.id} className="p-3 rounded-lg border border-gold/15 bg-white flex items-center gap-3">
                    {a.logoUrl ? <img src={a.logoUrl.replace(/^http:\/\//i, "https://")} alt="" className="school-avatar-sm flex-shrink-0" /> : <div className="w-7 h-7 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0"><School size={13} className="text-gold-500" /></div>}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-royal-800 text-sm">{a.name}</div>
                      <div className="text-xs text-royal-400 mt-0.5">
                        {a.hasCredentials ? <span className="text-green-600">ชื่อผู้ใช้: <span className="font-mono">{a.username}</span></span> : <span className="text-royal-300">ยังไม่มีบัญชี</span>}
                        {a.loginIp && <span className="ml-2 text-royal-300 inline-flex items-center gap-0.5"><Globe size={10} /> {a.loginIp}</span>}
                      </div>
                    </div>
                    {a.isOnline && <span className="badge-success text-xs"><Wifi size={10} /> ออนไลน์</span>}
                    {a.hasCredentials && (
                      <button onClick={() => deleteAccount(a.id, a.schoolName ? "user" : "school")} className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0" title="ลบบัญชี (QR จะถูกยกเลิก)"><Trash2 size={16} /></button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== TAB: QR Code ===== */}
      {activeTab === "qr" && (
        <div className="animate-fade-in">
          <div className="card-royal !p-4 sm:!p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 sm:mb-5">
              <h3 className="section-title text-sm sm:text-base"><QrCode size={16} className="text-gold-600" /> QR เข้าสู่ระบบ</h3>
              <button className="text-sm text-gold-600 hover:underline flex items-center gap-1 no-print self-end" onClick={handlePrintQR}><Printer size={14} /> พิมพ์ QR ทั้งหมด (A5)</button>
            </div>
            {schools.filter((s) => s.loginToken && s.username).length === 0 ? (
              <div className="text-center py-8"><Inbox size={32} className="text-royal-200 mx-auto mb-2" /><div className="text-royal-300 text-sm">ยังไม่มี QR Code — กรุณาสร้างบัญชีในแท็บ "ล็อกอิน" ก่อน</div></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {schools.filter((s) => s.loginToken && s.username).map((s) => {
                  const url = typeof window !== "undefined" ? `${window.location.origin}/vote?token=${s.loginToken}` : "";
                  return (
                    <div key={s.id} className="bg-white rounded-xl border-2 border-gold/15 p-3 sm:p-4 text-center space-y-2 sm:space-y-3 hover:shadow-lg hover:border-gold/30 transition-all">
                      {s.logoUrl && <div className="flex justify-center"><img src={s.logoUrl.replace(/^http:\/\//i, "https://")} alt={s.name} className="school-avatar" /></div>}
                      <div className="font-bold text-xs sm:text-sm text-royal-700 leading-snug">{s.name}</div>
                      <div className="flex justify-center">
                        <div className="bg-white p-3 rounded-xl border-2 border-gold/10 shadow-sm"><QRCode value={url || "loading"} bgColor="#ffffff" fgColor="#2d2312" size={110} /></div>
                      </div>
                      <div className="text-[9px] sm:text-[10px] break-all text-royal-300 leading-tight">{url}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== TAB: Reports ===== */}
      {activeTab === "reports" && (
        <div className="animate-fade-in max-w-lg mx-auto">
          <div className="card-royal !p-4 sm:!p-6">
            <h3 className="section-title mb-4 sm:mb-5"><FileText size={16} className="text-gold-600" /> ออกรายงาน</h3>
            <p className="text-sm text-royal-400 mb-4">เลือกรูปแบบการส่งออกข้อมูลผลการลงมติ</p>
            <div className="grid gap-3">
              <a href="/api/export?type=csv" className="btn-gold text-center flex items-center justify-center gap-2 py-3 text-sm sm:text-base">
                <FileSpreadsheet size={18} /> ดาวน์โหลด CSV (เปิดใน Excel ได้)
              </a>
              <a href="/api/export?type=pdf" className="btn-outline-gold text-center flex items-center justify-center gap-2 py-3 text-sm sm:text-base">
                <FileDown size={18} /> ดาวน์โหลดรายงาน PDF
              </a>
              <a href="/api/export?type=text" className="btn-outline-gold text-center flex items-center justify-center gap-2 py-3 text-sm sm:text-base">
                <FileText size={18} /> ดาวน์โหลดรายงาน (Text)
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ===== TAB: Settings ===== */}
      {activeTab === "settings" && (
        <div className="animate-fade-in max-w-lg mx-auto space-y-4">
          {/* Geo Check Toggle */}
          <div className="card-royal !p-4 sm:!p-6">
            <h3 className="section-title mb-4 sm:mb-5"><Navigation size={16} className="text-gold-600" /> ระบบตรวจสอบตำแหน่ง (GPS)</h3>
            <div className="flex items-center justify-between p-4 rounded-xl border border-gold/15 bg-cream-50">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-royal-800 text-sm flex items-center gap-2">
                  <MapPin size={16} className={geoCheckEnabled ? "text-green-600" : "text-red-500"} />
                  ตรวจสอบตำแหน่งก่อนเข้าสู่ระบบ
                </div>
                <p className="text-xs text-royal-400 mt-1.5">
                  {geoCheckEnabled
                    ? "เปิดอยู่ — ผู้ใช้ต้องอนุญาตตำแหน่งและอยู่ในรัศมี 5 กม. จากจุดจัดงาน"
                    : "ปิดอยู่ — ผู้ใช้สามารถเข้าสู่ระบบได้โดยไม่ต้องตรวจสอบตำแหน่ง (สำหรับทดสอบ)"}
                </p>
              </div>
              <button
                onClick={toggleGeoCheck}
                className={`ml-4 relative inline-flex h-7 w-12 items-center rounded-full transition-colors flex-shrink-0 ${geoCheckEnabled ? "bg-green-500" : "bg-gray-300"}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${geoCheckEnabled ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
            {!geoCheckEnabled && (
              <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700 flex items-start gap-2">
                <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                <div>ระบบตรวจสอบตำแหน่งปิดอยู่ — ผู้ใช้จากทุกที่สามารถเข้าสู่ระบบได้ เหมาะสำหรับการทดสอบเท่านั้น</div>
              </div>
            )}
          </div>

          {/* Change Password */}
          <div className="card-royal !p-4 sm:!p-6">
            <h3 className="section-title mb-4 sm:mb-5"><KeyRound size={16} className="text-gold-600" /> เปลี่ยนรหัสผ่านผู้ดูแล</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-royal-600 mb-1.5 block">รหัสผ่านใหม่</label>
                <div className="relative"><Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-royal-300 pointer-events-none z-10" /><input className="input-royal !pl-10" type="password" placeholder="รหัสผ่านใหม่ (อย่างน้อย 4 ตัวอักษร)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></div>
              </div>
              <div>
                <label className="text-sm font-semibold text-royal-600 mb-1.5 block">ยืนยันรหัสผ่านใหม่</label>
                <div className="relative"><Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-royal-300 pointer-events-none z-10" /><input className="input-royal !pl-10" type="password" placeholder="พิมพ์รหัสผ่านอีกครั้ง" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleChangePassword()} /></div>
              </div>
              {changePwError && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 text-center">{changePwError}</div>}
              {changePwMsg && <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 text-center flex items-center justify-center gap-1.5"><CheckCircle size={15} /> {changePwMsg}</div>}
              <button className="btn-gold w-full flex items-center justify-center gap-2 py-3" onClick={handleChangePassword} disabled={changingPw || !newPassword || !confirmPassword}>
                <KeyRound size={16} /> {changingPw ? "กำลังเปลี่ยน..." : "เปลี่ยนรหัสผ่าน"}
              </button>
            </div>
          </div>

          {/* System Reset */}
          <div className="card-royal !p-4 sm:!p-6 border-red-200">
            <h3 className="section-title mb-4 sm:mb-5 !text-red-700"><RotateCcw size={16} className="text-red-500" /> รีเซ็ตระบบ</h3>
            <p className="text-sm text-royal-500 mb-2">ลบข้อมูลทั้งหมดที่เกิดขึ้นในระบบ:</p>
            <ul className="text-xs text-royal-400 space-y-1 mb-4 ml-4 list-disc">
              <li>ผลการลงมติทั้งหมด</li>
              <li>ญัตติทั้งหมด</li>
              <li>บันทึกการทำงาน (Audit Log)</li>
              <li>การเช็คชื่อ/เข้าร่วม</li>
              <li>เซสชันออนไลน์ทั้งหมด</li>
            </ul>
            <p className="text-xs text-royal-300 mb-4">⚠️ ข้อมูลโรงเรียนและบัญชีผู้ใช้จะไม่ถูกลบ</p>
            <button
              className="w-full py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all flex items-center justify-center gap-2 text-sm"
              onClick={handleResetSystem}
              disabled={resetting}
            >
              {resetting ? <RefreshCw size={16} className="animate-spin" /> : <RotateCcw size={16} />}
              {resetting ? "กำลังรีเซ็ต..." : "รีเซ็ตระบบทั้งหมด"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
