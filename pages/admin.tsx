import React, { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import dynamic from "next/dynamic";
import {
  Settings, Monitor, ClipboardList, Vote, Plus, Radio, Timer,
  ThumbsUp, ThumbsDown, Hand, QrCode, FileText, FileSpreadsheet,
  ScrollText, CheckCircle, Square, School, Key, Printer, RefreshCw,
  Lock, LogIn, ShieldCheck, KeyRound, Eye, EyeOff, LogOut, Inbox,
} from "lucide-react";

const QRCode = dynamic(() => import("react-qr-code"), { ssr: false });

type VoteChoice = "AGREE" | "DISAGREE" | "ABSTAIN";
type Motion = { id: number; title: string; description: string; isActive: boolean };
type SchoolT = { id: number; name: string; loginToken?: string; logoUrl?: string };

type State = {
  motions: Motion[];
  votes: Record<number, Record<VoteChoice, number>>;
  attendance: Record<number, boolean>;
  bigScreenMessage: string;
  votingOpen: boolean;
  activeMotionId: number | null;
  countdownEnd: number | null;
  schools: SchoolT[];
  auditLogs: { action: string; detail?: string; at: number }[];
};

type Credential = { name: string; username: string; password: string; type: string };

export default function Admin() {
  // Admin auth state
  const [authed, setAuthed] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [adminPw, setAdminPw] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  // Change password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changePwMsg, setChangePwMsg] = useState("");
  const [changePwError, setChangePwError] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  const [socket, setSocket] = useState<Socket | null>(null);
  const [state, setState] = useState<State>({
    motions: [], votes: {}, attendance: {}, bigScreenMessage: "",
    votingOpen: false, activeMotionId: null, countdownEnd: null, schools: [], auditLogs: [],
  });
  const [message, setMessage] = useState("");
  const [motionTitle, setMotionTitle] = useState("");
  const [motionDescription, setMotionDescription] = useState("");
  const [selectedMotion, setSelectedMotion] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(60);
  const [checkInSchool, setCheckInSchool] = useState<number | "">("");
  const [schools, setSchools] = useState<SchoolT[]>([]);
  const [loginMode, setLoginMode] = useState<string>("PER_SCHOOL");
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("main");

  // Check if already authenticated
  useEffect(() => {
    fetch("/api/auth/admin-login")
      .then((r) => { if (r.ok) setAuthed(true); })
      .finally(() => setAuthChecking(false));
  }, []);

  // Admin login handler
  const handleAdminLogin = async () => {
    setAdminError("");
    setAdminLoading(true);
    try {
      const res = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPw }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAdminError(data.error || "เข้าสู่ระบบไม่สำเร็จ");
        return;
      }
      setAuthed(true);
    } catch {
      setAdminError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setAdminLoading(false);
    }
  };

  // Change admin password
  const handleChangePassword = async () => {
    setChangePwMsg("");
    setChangePwError("");
    if (!newPassword || newPassword.length < 4) {
      setChangePwError("รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร");
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangePwError("รหัสผ่านไม่ตรงกัน");
      return;
    }
    setChangingPw(true);
    try {
      const res = await fetch("/api/auth/admin-login", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setChangePwError(data.error || "เปลี่ยนรหัสผ่านไม่สำเร็จ");
        return;
      }
      setChangePwMsg("เปลี่ยนรหัสผ่านสำเร็จแล้ว");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setChangePwError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setChangingPw(false);
    }
  };

  useEffect(() => {
    if (!authed) return;
    fetch("/api/socket").then(() => {
      const s = io({ path: "/api/socket" });
      setSocket(s);
      s.on("state:update", (data: State) => setState(data));
    });
  }, [authed]);

  useEffect(() => {
    if (!authed) return;
    fetch("/api/schools").then((r) => r.json()).then((data) => setSchools(data.schools || []));
    fetch("/api/admin/login-mode").then((r) => r.json()).then((data) => setLoginMode(data.loginMode));
  }, [authed]);

  const sendMessage = () => socket?.emit("admin:screen-control", { message });
  const addMotion = () => {
    if (!motionTitle) return;
    socket?.emit("admin:add-motion", { title: motionTitle, description: motionDescription });
    setMotionTitle(""); setMotionDescription("");
  };
  const toggleVote = (open: boolean) => socket?.emit("admin:toggle-vote", { open, motionId: selectedMotion });
  const setCountdownTimer = () => socket?.emit("admin:set-countdown", { seconds: countdown });
  const checkIn = () => {
    if (!checkInSchool) return;
    socket?.emit("attendance:check-in", { schoolId: Number(checkInSchool) });
  };

  const changeLoginMode = async (mode: string) => {
    await fetch("/api/admin/login-mode", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loginMode: mode }),
    });
    setLoginMode(mode);
  };

  const generateCredentials = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/generate-credentials", { method: "POST" });
      const data = await res.json();
      setCredentials(data.credentials || []);
    } finally {
      setGenerating(false);
    }
  };

  const totalSchools = state.schools.length;
  const presentSchools = Object.values(state.attendance).filter(Boolean).length;

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
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gold-300 to-gold-600 flex items-center justify-center text-white mx-auto mb-4 shadow-gold">
                <ShieldCheck size={32} />
              </div>
              <h2 className="text-2xl font-extrabold text-royal-900">เข้าสู่ระบบผู้ดูแล</h2>
              <p className="text-sm text-royal-400 mt-2">กรุณากรอกรหัสผ่านเพื่อเข้าจัดการระบบ</p>
            </div>
            <div className="space-y-4">
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-royal-300 pointer-events-none z-10" />
                <input
                  className="input-royal !pl-10 !pr-10"
                  type={showPw ? "text" : "password"}
                  placeholder="รหัสผ่านผู้ดูแลระบบ"
                  value={adminPw}
                  onChange={(e) => setAdminPw(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
                  autoFocus
                />
                <button
                  type="button"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-royal-300 hover:text-royal-500 transition-colors z-10"
                  onClick={() => setShowPw(!showPw)}
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {adminError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 text-center">
                  {adminError}
                </div>
              )}
              <button
                className="btn-gold w-full flex items-center justify-center gap-2 py-3 text-base"
                onClick={handleAdminLogin}
                disabled={adminLoading || !adminPw}
              >
                <LogIn size={18} /> {adminLoading ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบ"}
              </button>
            </div>
            <div className="mt-6 pt-4 border-t border-gold/10">
              <p className="text-xs text-royal-300 text-center">
                รหัสผ่านเริ่มต้น: สอบถามผู้ดูแลระบบ
              </p>
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
    { id: "login", label: "จัดการล็อกอิน", icon: Key },
    { id: "qr", label: "QR Code", icon: QrCode },
    { id: "reports", label: "รายงาน", icon: FileText },
    { id: "settings", label: "ตั้งค่า", icon: Lock },
  ];

  // ===== Admin Panel (authenticated) =====
  return (
    <div className="animate-fade-in max-w-6xl mx-auto px-4 py-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-royal-900 flex items-center gap-2">
            <Settings size={24} /> หน้าผู้ดูแลระบบ
          </h2>
          <div className="flex gap-2 mt-2">
            <span className={state.votingOpen ? "badge-success" : "badge-danger"}>
              <span className={`w-2 h-2 rounded-full inline-block ${state.votingOpen ? "bg-green-500" : "bg-red-500"}`} />
              {state.votingOpen ? "เปิดรับโหวต" : "ปิดรับโหวต"}
            </span>
            <span className="badge-gold">
              <School size={12} /> องค์ประชุม {presentSchools}/{totalSchools}
            </span>
          </div>
        </div>
        <button
          className="btn-outline-gold text-sm flex items-center gap-1.5 self-start"
          onClick={() => {
            document.cookie = "admin_token=; path=/; max-age=0";
            setAuthed(false);
          }}
        >
          <LogOut size={14} /> ออกจากระบบ
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-6 border-b border-gold/15 no-print">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-t-lg whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? "bg-white text-royal-800 border border-gold/20 border-b-white -mb-px shadow-sm"
                : "text-royal-400 hover:text-royal-600 hover:bg-gold/5"
            }`}
          >
            <tab.icon size={15} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ===== TAB: Main Control ===== */}
      {activeTab === "main" && (
        <div className="grid gap-6 lg:grid-cols-2 animate-fade-in">
          {/* ควบคุมหน้าจอใหญ่ */}
          <div className="card-royal">
            <h3 className="section-title mb-4"><Monitor size={16} className="text-gold-600" /> ควบคุมหน้าจอใหญ่</h3>
            <textarea
              className="input-royal mb-3" rows={3} value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="พิมพ์ข้อความที่ต้องการแสดงบนจอใหญ่..."
            />
            <button className="btn-gold w-full flex items-center justify-center gap-2" onClick={sendMessage}>
              <Radio size={16} /> อัปเดตข้อความจอใหญ่
            </button>
          </div>

          {/* เช็คชื่อแบบสด */}
          <div className="card-royal">
            <h3 className="section-title mb-4"><ClipboardList size={16} className="text-gold-600" /> เช็คชื่อแบบสด</h3>
            <div className="flex gap-3 items-center flex-wrap mb-4">
              <select className="input-royal flex-1" value={checkInSchool}
                onChange={(e) => setCheckInSchool(e.target.value ? Number(e.target.value) : "")}>
                <option value="">-- เลือกโรงเรียน --</option>
                {state.schools.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <button className="btn-gold whitespace-nowrap flex items-center gap-1" onClick={checkIn}>
                <CheckCircle size={16} /> เช็คชื่อ
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              {state.schools.map((s) => (
                <div key={s.id}
                  className={`p-3 rounded-lg border font-medium transition-all flex items-center gap-2.5 ${
                    state.attendance[s.id]
                      ? "bg-green-50 border-green-300 text-green-800"
                      : "bg-white border-gold/15 text-royal-400"
                  }`}>
                  {s.logoUrl ? (
                    <img src={s.logoUrl} alt="" className="school-avatar-sm" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
                      <School size={13} className="text-gold-500" />
                    </div>
                  )}
                  {state.attendance[s.id] ? <CheckCircle size={14} className="text-green-600 flex-shrink-0" /> : <Square size={14} className="flex-shrink-0" />}
                  <span className="leading-tight text-xs">{s.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Audit Log */}
          <div className="card-royal lg:col-span-2">
            <h3 className="section-title mb-4"><ScrollText size={16} className="text-gold-600" /> บันทึกการทำงาน</h3>
            <div className="max-h-48 overflow-y-auto space-y-1.5">
              {state.auditLogs.map((log, idx) => (
                <div key={idx} className="flex justify-between bg-cream-50 border border-gold/10 p-2.5 rounded-lg text-sm">
                  <span className="text-royal-700">{log.action} {log.detail ? `— ${log.detail}` : ""}</span>
                  <span className="text-royal-300 text-xs whitespace-nowrap ml-2">{new Date(log.at).toLocaleTimeString()}</span>
                </div>
              ))}
              {state.auditLogs.length === 0 && (
                <div className="text-center py-8">
                  <Inbox size={32} className="text-royal-200 mx-auto mb-2" />
                  <div className="text-royal-300 text-sm">ยังไม่มีบันทึก</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== TAB: Motions ===== */}
      {activeTab === "motions" && (
        <div className="animate-fade-in">
          <div className="card-royal">
            <h3 className="section-title mb-5"><Vote size={16} className="text-gold-600" /> จัดการญัตติ/มติ</h3>
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-royal-600">เพิ่มญัตติใหม่</label>
                <input className="input-royal" placeholder="ชื่อญัตติ" value={motionTitle} onChange={(e) => setMotionTitle(e.target.value)} />
                <textarea className="input-royal" placeholder="คำอธิบาย (ไม่บังคับ)" rows={3} value={motionDescription} onChange={(e) => setMotionDescription(e.target.value)} />
                <button className="btn-gold w-full flex items-center justify-center gap-2" onClick={addMotion}>
                  <Plus size={16} /> เพิ่มญัตติ
                </button>
              </div>
              <div className="space-y-3">
                <label className="text-sm font-semibold text-royal-600">ควบคุมการโหวต</label>
                <select className="input-royal" value={selectedMotion ?? ""} onChange={(e) => setSelectedMotion(e.target.value ? Number(e.target.value) : null)}>
                  <option value="">-- เลือกญัตติ --</option>
                  {state.motions.map((m) => (<option key={m.id} value={m.id}>{m.title}</option>))}
                </select>
                <div className="grid grid-cols-3 gap-2">
                  <button className="px-3 py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all text-sm hover:-translate-y-0.5" onClick={() => toggleVote(true)}>เปิดโหวต</button>
                  <button className="px-3 py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all text-sm hover:-translate-y-0.5" onClick={() => toggleVote(false)}>ปิดโหวต</button>
                  <button className="px-3 py-2.5 bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 transition-all text-sm flex items-center justify-center gap-1 hover:-translate-y-0.5" onClick={setCountdownTimer}>
                    <Timer size={14} /> Countdown
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-royal-500 whitespace-nowrap">ตั้งเวลา:</label>
                  <input type="number" className="input-royal w-24" value={countdown} onChange={(e) => setCountdown(Number(e.target.value))} />
                  <span className="text-sm text-royal-400">วินาที</span>
                </div>
              </div>
            </div>
            {state.motions.length > 0 && (
              <div className="border-t border-gold/15 pt-5">
                <p className="text-sm font-semibold text-royal-600 mb-3">ญัตติทั้งหมด ({state.motions.length})</p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {state.motions.map((m) => {
                    const v = state.votes[m.id] || { AGREE: 0, DISAGREE: 0, ABSTAIN: 0 };
                    return (
                      <div key={m.id} className={`flex items-center justify-between p-3.5 rounded-lg border text-sm transition-all ${
                        state.activeMotionId === m.id ? "bg-gold-50 border-gold shadow-sm" : "bg-white border-gold/10 hover:border-gold/25"
                      }`}>
                        <div>
                          <span className="font-semibold text-royal-800">{m.title}</span>
                          {state.activeMotionId === m.id && <span className="ml-2 badge-gold text-xs">กำลังใช้งาน</span>}
                        </div>
                        <div className="flex gap-3 text-xs font-mono">
                          <span className="text-green-600 flex items-center gap-0.5"><ThumbsUp size={11} /> {v.AGREE}</span>
                          <span className="text-red-600 flex items-center gap-0.5"><ThumbsDown size={11} /> {v.DISAGREE}</span>
                          <span className="text-yellow-600 flex items-center gap-0.5"><Hand size={11} /> {v.ABSTAIN}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== TAB: Login Settings ===== */}
      {activeTab === "login" && (
        <div className="animate-fade-in">
          <div className="card-royal">
            <h3 className="section-title mb-5"><Key size={16} className="text-gold-600" /> ตั้งค่าการเข้าสู่ระบบ</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-royal-600 mb-2 block">โหมดการเข้าสู่ระบบ</label>
                  <select className="input-royal" value={loginMode} onChange={(e) => changeLoginMode(e.target.value)}>
                    <option value="PER_SCHOOL">รายโรงเรียน</option>
                    <option value="PER_INDIVIDUAL">รายบุคคล</option>
                  </select>
                  <p className="text-xs text-royal-400 mt-1.5">
                    {loginMode === "PER_SCHOOL" ? "แต่ละโรงเรียนใช้บัญชีเดียวร่วมกัน" : "แต่ละบุคคลมีบัญชีแยกของตัวเอง"}
                  </p>
                </div>
                <button className="btn-gold w-full flex items-center justify-center gap-2" onClick={generateCredentials} disabled={generating}>
                  {generating ? <RefreshCw size={16} className="animate-spin" /> : <Key size={16} />}
                  {generating ? "กำลังสร้าง..." : "สุ่มชื่อผู้ใช้และรหัสผ่าน"}
                </button>
              </div>
              {credentials.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-royal-600">ข้อมูลบัญชีที่สร้างแล้ว</p>
                    <button className="text-xs text-gold-600 hover:underline flex items-center gap-1" onClick={() => window.print()}>
                      <Printer size={12} /> พิมพ์
                    </button>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {credentials.map((c, i) => (
                      <div key={i} className="bg-cream-50 border border-gold/15 rounded-lg p-3 text-sm">
                        <div className="font-semibold text-royal-800">{c.name}</div>
                        <div className="text-royal-500 font-mono text-xs mt-1">
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

      {/* ===== TAB: QR Code ===== */}
      {activeTab === "qr" && (
        <div className="animate-fade-in">
          <div className="card-royal">
            <div className="flex items-center justify-between mb-5">
              <h3 className="section-title"><QrCode size={16} className="text-gold-600" /> QR เข้าสู่ระบบ ({loginMode === "PER_SCHOOL" ? "ต่อโรงเรียน" : "ต่อบุคคล"})</h3>
              <button className="text-sm text-gold-600 hover:underline flex items-center gap-1 no-print" onClick={() => window.print()}>
                <Printer size={14} /> พิมพ์ QR ทั้งหมด
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {schools.map((s) => {
                const url = typeof window !== "undefined" ? `${window.location.origin}/vote?token=${s.loginToken}` : "";
                return (
                  <div key={s.id} className="bg-white rounded-xl border border-gold/15 p-5 text-center space-y-3 hover:shadow-md transition-shadow">
                    {s.logoUrl && (
                      <div className="flex justify-center">
                        <img src={s.logoUrl} alt={s.name} className="school-avatar" />
                      </div>
                    )}
                    <div className="font-semibold text-sm text-royal-700">{s.name}</div>
                    <div className="flex justify-center">
                      <div className="bg-white p-3 rounded-lg border border-gold/10">
                        <QRCode value={url || "loading"} bgColor="#ffffff" fgColor="#2d2312" size={120} />
                      </div>
                    </div>
                    <div className="text-[10px] break-all text-royal-300 leading-tight">{url}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===== TAB: Reports ===== */}
      {activeTab === "reports" && (
        <div className="animate-fade-in max-w-lg mx-auto">
          <div className="card-royal">
            <h3 className="section-title mb-5"><FileText size={16} className="text-gold-600" /> ออกรายงาน</h3>
            <p className="text-sm text-royal-400 mb-4">เลือกรูปแบบการส่งออกข้อมูลผลการลงมติ</p>
            <div className="grid gap-3">
              <a href="/api/export?type=pdf" className="btn-gold text-center flex items-center justify-center gap-2 py-3.5 text-base">
                <FileText size={18} /> Export PDF
              </a>
              <a href="/api/export?type=excel" className="btn-outline-gold text-center flex items-center justify-center gap-2 py-3.5 text-base">
                <FileSpreadsheet size={18} /> Export Excel
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ===== TAB: Settings (Change Admin Password) ===== */}
      {activeTab === "settings" && (
        <div className="animate-fade-in max-w-lg mx-auto">
          <div className="card-royal">
            <h3 className="section-title mb-5"><KeyRound size={16} className="text-gold-600" /> เปลี่ยนรหัสผ่านผู้ดูแล</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-royal-600 mb-1.5 block">รหัสผ่านใหม่</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-royal-300 pointer-events-none z-10" />
                  <input
                    className="input-royal !pl-10"
                    type="password"
                    placeholder="รหัสผ่านใหม่ (อย่างน้อย 4 ตัวอักษร)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-royal-600 mb-1.5 block">ยืนยันรหัสผ่านใหม่</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-royal-300 pointer-events-none z-10" />
                  <input
                    className="input-royal !pl-10"
                    type="password"
                    placeholder="พิมพ์รหัสผ่านอีกครั้ง"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleChangePassword()}
                  />
                </div>
              </div>
              {changePwError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 text-center">
                  {changePwError}
                </div>
              )}
              {changePwMsg && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 text-center flex items-center justify-center gap-1.5">
                  <CheckCircle size={15} /> {changePwMsg}
                </div>
              )}
              <button
                className="btn-gold w-full flex items-center justify-center gap-2 py-3"
                onClick={handleChangePassword}
                disabled={changingPw || !newPassword || !confirmPassword}
              >
                <KeyRound size={16} /> {changingPw ? "กำลังเปลี่ยน..." : "เปลี่ยนรหัสผ่าน"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
