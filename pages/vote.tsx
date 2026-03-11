import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useRouter } from "next/router";
import {
  Vote as VoteIcon, School, User, QrCode, LogIn,
  ThumbsUp, ThumbsDown, Hand, CheckCircle, Clock, Inbox,
  ClipboardList, Lock, AlertTriangle, BookCheck, FileCheck2, Edit3,
  MapPin, Shield, RefreshCw, Navigation, Info, XCircle,
} from "lucide-react";

const CHOICE_META: Record<string, { label: string; Icon: any; btnClass: string }> = {
  AGREE: { label: "เห็นด้วย", Icon: ThumbsUp, btnClass: "vote-btn vote-btn-agree" },
  DISAGREE: { label: "ไม่เห็นด้วย", Icon: ThumbsDown, btnClass: "vote-btn vote-btn-disagree" },
  ABSTAIN: { label: "งดออกเสียง", Icon: Hand, btnClass: "vote-btn vote-btn-abstain" },
  ACKNOWLEDGE: { label: "รับทราบ", Icon: BookCheck, btnClass: "vote-btn vote-btn-acknowledge" },
  RESOLUTION: { label: "มติ", Icon: FileCheck2, btnClass: "vote-btn vote-btn-resolution" },
};

type VoteChoice = "AGREE" | "DISAGREE" | "ABSTAIN" | "ACKNOWLEDGE" | "RESOLUTION";
type Motion = { id: number; title: string; description: string; isActive: boolean; allowedChoices?: string[] };
type SchoolT = { id: number; name: string; loginToken?: string; logoUrl?: string };

type State = {
  motions: Motion[];
  votes: Record<number, Record<string, number>>;
  attendance: Record<number, boolean>;
  bigScreenMessage: string;
  votingOpen: boolean;
  activeMotionId: number | null;
  countdownEnd: number | null;
  schools: SchoolT[];
};

type Toast = { id: number; type: "success" | "error" | "info"; message: string };

export default function VotePage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [state, setState] = useState<State>({ motions: [], votes: {}, attendance: {}, bigScreenMessage: "", votingOpen: false, activeMotionId: null, countdownEnd: null, schools: [] });
  const [stateLoaded, setStateLoaded] = useState(false);
  const [schoolId, setSchoolId] = useState<number | "">("");
  const [voter, setVoter] = useState("");
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [voted, setVoted] = useState<string | null>(null);
  const [loginTab, setLoginTab] = useState<"qr" | "password">("qr");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [kicked, setKicked] = useState<string | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "getting" | "ok" | "denied" | "disabled">("idle");
  const [geoCoords, setGeoCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoCheckEnabled, setGeoCheckEnabled] = useState<boolean | null>(null);
  const [geoRetrying, setGeoRetrying] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);
  const [showVoteConfirmation, setShowVoteConfirmation] = useState(false);
  const voteConfirmTimerRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  const pushToast = useCallback((type: Toast["type"], message: string) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  // Check if geo check is enabled
  useEffect(() => {
    fetch("/api/admin/login-mode")
      .then((r) => r.json())
      .then((data) => {
        const enabled = data.geoCheckEnabled ?? true;
        setGeoCheckEnabled(enabled);
        if (!enabled) setGeoStatus("disabled");
      })
      .catch(() => setGeoCheckEnabled(true));
  }, []);

  // Request geolocation
  const requestGeo = useCallback(() => {
    if (geoCheckEnabled === false) {
      setGeoStatus("disabled");
      return;
    }
    if (!navigator.geolocation) {
      setGeoStatus("denied");
      return;
    }
    setGeoStatus("getting");
    setGeoRetrying(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoStatus("ok");
      },
      () => {
        setGeoStatus("denied");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [geoCheckEnabled]);

  // Get geolocation on mount (after checking if enabled)
  useEffect(() => {
    if (geoCheckEnabled === null) return; // still loading
    requestGeo();
  }, [geoCheckEnabled, requestGeo]);

  // Setup socket connection
  useEffect(() => {
    fetch("/api/socket").then(() => {
      const s = io({ path: "/api/socket", transports: ["websocket", "polling"] });
      setSocket(s);
      s.on("state:update", (data: State) => { setState(data); setVoted(null); setStateLoaded(true); });
      s.on("session:invalid", (data: { reason: string }) => {
        setKicked(data.reason || "เซสชันหมดอายุ");
        setAuthToken(null); setSessionToken(null); setSchoolId(""); setVoter("");
        localStorage.removeItem("auth_token"); localStorage.removeItem("session_token");
      });
      s.io.on("error", () => pushToast("error", "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ลองรีเฟรชหรือตรวจสอบอินเทอร์เน็ต"));
      s.on("connect_error", (err: any) => {
        console.warn("socket connect error", err?.message);
        pushToast("error", "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ลองรีเฟรช");
      });
      return () => { s.disconnect(); };
    });
  }, [pushToast]);

  // Heartbeat — send every 10 seconds to stay "online"
  useEffect(() => {
    if (!socket) return;
    const interval = setInterval(() => {
      socket.emit("client:heartbeat");
    }, 10000);
    return () => clearInterval(interval);
  }, [socket]);

  // Identify to server when we have auth info
  useEffect(() => {
    if (socket && schoolId && sessionToken) {
      socket.emit("auth:identify", { schoolId: Number(schoolId), sessionToken });
    }
  }, [socket, schoolId, sessionToken]);

  // QR token login
  useEffect(() => {
    if (geoCheckEnabled === true && geoStatus !== "ok") return; // wait for geo if enabled
    if (geoCheckEnabled === null) return;
    const token = (router.query.token as string) || localStorage.getItem("auth_token") || null;
    if (!token) return;
    const login = async () => {
      try {
        let url = `/api/auth/qr?token=${token}`;
        if (geoCoords) url += `&lat=${geoCoords.lat}&lng=${geoCoords.lng}`;
        const res = await fetch(url);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const msg = data.error || (res.status === 401 ? "QR Code ไม่ถูกต้องหรือหมดอายุ" : "เข้าสู่ระบบด้วย QR ไม่สำเร็จ");
          if (res.status === 401) {
            localStorage.removeItem("auth_token");
            localStorage.removeItem("session_token");
          }
          setLoginError(msg);
          pushToast("error", msg);
          return;
        }
        const data = await res.json();
        setLoginError("");
        pushToast("success", "เข้าสู่ระบบด้วย QR สำเร็จ");
        setAuthToken(data.token); setSessionToken(data.sessionToken);
        localStorage.setItem("auth_token", data.token); localStorage.setItem("session_token", data.sessionToken);
        setSchoolId(data.school.id); setVoter(data.user.name); setKicked(null);
      } catch (e) { console.error(e); }
    };
    void login();
  }, [router.query.token, geoCoords, geoStatus, geoCheckEnabled]);

  const handlePasswordLogin = async () => {
    if (geoCheckEnabled && geoStatus !== "ok" && geoStatus !== "disabled") {
      setLoginError("กรุณาอนุญาตการเข้าถึงตำแหน่งก่อนเข้าสู่ระบบ");
      return;
    }
    setLoginError(""); setLoginLoading(true);
    try {
      pushToast("info", "ส่งคำขอเข้าสู่ระบบแล้ว");
      const body: any = { username, password };
      if (geoCoords) { body.lat = geoCoords.lat; body.lng = geoCoords.lng; }
      const res = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { const msg = data.error || "เข้าสู่ระบบไม่สำเร็จ"; setLoginError(msg); pushToast("error", msg); return; }
      pushToast("success", "เข้าสู่ระบบสำเร็จ");
      setAuthToken(data.token); setSessionToken(data.sessionToken);
      localStorage.setItem("auth_token", data.token); localStorage.setItem("session_token", data.sessionToken);
      setSchoolId(data.school.id); setVoter(data.user.name); setKicked(null);
    } catch {
      const msg = "เกิดข้อผิดพลาดในการเชื่อมต่อ";
      setLoginError(msg);
      pushToast("error", msg);
    } finally { setLoginLoading(false); }
  };

  const handleRetryGeo = () => {
    setGeoRetrying(true);
    setLoginError("");
    requestGeo();
  };

  const activeMotion = useMemo(
    () => state.motions.find((m) => m.id === state.activeMotionId) || null,
    [state.motions, state.activeMotionId]
  );

  const allowedChoices = activeMotion?.allowedChoices || ["AGREE", "DISAGREE", "ABSTAIN"];

  const castVote = (choice: VoteChoice) => {
    if (!socket || !activeMotion || !authToken) return;
    socket.emit("vote:cast", {
      motionId: activeMotion.id, choice, authToken,
      schoolId: schoolId ? Number(schoolId) : undefined, voter,
    });
    setVoted(choice);
    setShowVoteConfirmation(true);
    if (voteConfirmTimerRef.current) clearTimeout(voteConfirmTimerRef.current);
    voteConfirmTimerRef.current = setTimeout(() => {
      setShowVoteConfirmation(false);
    }, 1800);
  };

  useEffect(() => {
    return () => {
      if (voteConfirmTimerRef.current) clearTimeout(voteConfirmTimerRef.current);
    };
  }, []);

  const currentSchool = state.schools.find((s) => s.id === schoolId);
  const schoolName = currentSchool?.name;
  const schoolLogo = currentSchool?.logoUrl?.replace(/^http:\/\//i, "https://");
  const isLoggedIn = !!authToken && !!schoolId;

  // BLOCK page if geo is required but not granted
  if (geoCheckEnabled === true && (geoStatus === "denied" || geoStatus === "idle")) {
    return (
      <div className="geo-overlay">
        <div className="text-center max-w-md px-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gold-100 to-gold-200 flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Navigation size={48} className="text-gold-600" />
          </div>
          <h2 className="text-2xl font-extrabold text-royal-900 mb-3">จำเป็นต้องเปิดตำแหน่ง</h2>
          <p className="text-royal-500 mb-2 text-sm leading-relaxed">
            ระบบกำหนดให้ต้องเปิดการเข้าถึงตำแหน่งที่ตั้ง (GPS) เพื่อยืนยันว่าคุณอยู่ในบริเวณจัดงาน
          </p>
          <div className="bg-gold-50 border border-gold/20 rounded-xl p-4 mb-6 text-left space-y-2">
            <p className="text-sm font-semibold text-royal-700 flex items-center gap-2"><MapPin size={15} className="text-gold-600" /> วิธีเปิดตำแหน่ง:</p>
            <ol className="text-xs text-royal-500 space-y-1 ml-6 list-decimal">
              <li>กดปุ่ม "อนุญาต" เมื่อเบราว์เซอร์ขอสิทธิ์</li>
              <li>หากปิดไว้ ให้ไปที่ <b>ตั้งค่า &gt; สิทธิ์ไซต์ &gt; ตำแหน่ง</b></li>
              <li>เปิดใช้งาน GPS/ตำแหน่ง แล้วกดลองใหม่</li>
            </ol>
          </div>
          <button
            className="btn-gold w-full flex items-center justify-center gap-2 py-3.5 text-lg"
            onClick={handleRetryGeo}
            disabled={geoRetrying}
          >
            {geoRetrying ? <RefreshCw size={18} className="animate-spin" /> : <MapPin size={18} />}
            {geoRetrying ? "กำลังตรวจสอบ..." : "ลองใหม่อีกครั้ง"}
          </button>
          <p className="text-xs text-royal-300 mt-4 flex items-center justify-center gap-1">
            <Shield size={12} /> ข้อมูลตำแหน่งใช้เพื่อตรวจสอบเท่านั้น ไม่มีการจัดเก็บ
          </p>
        </div>
      </div>
    );
  }

  if (geoCheckEnabled === true && geoStatus === "getting") {
    return (
      <div className="geo-overlay">
        <div className="text-center max-w-md px-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center mx-auto mb-6">
            <MapPin size={36} className="text-blue-600 animate-pulse" />
          </div>
          <h2 className="text-xl font-extrabold text-royal-900 mb-2">กำลังตรวจสอบตำแหน่ง</h2>
          <p className="text-royal-400 text-sm">กรุณารอสักครู่ และอนุญาตเมื่อเบราว์เซอร์ขอสิทธิ์...</p>
          <div className="mt-6 w-12 h-12 rounded-full border-3 border-gold-300 border-t-gold-600 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-2xl mx-auto px-4 py-8">
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type === "success" ? "toast-success" : t.type === "info" ? "toast-info" : "toast-error"}`}>
            {t.type === "success" ? <CheckCircle size={16} /> : t.type === "info" ? <Info size={16} /> : <XCircle size={16} />}
            {t.message}
          </div>
        ))}
      </div>

      {/* Closed overlay when voting is off */}
      {stateLoaded && !state.votingOpen && (
        <div className="closed-overlay">
          <div className="max-w-2xl mx-auto space-y-3">
            <div className="text-3xl md:text-4xl font-extrabold text-royal-900">ปิดรับโหวต</div>
            <div className="text-lg md:text-xl text-royal-600 leading-relaxed">
              {state.bigScreenMessage || "โปรดรอผู้ดูแลระบบเปิดรอบถัดไป"}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-3 bg-gradient-to-r from-royal-800 to-royal-900 text-white px-6 py-3 rounded-2xl shadow-lg mb-4">
          <VoteIcon size={24} className="text-gold-400" />
          <h2 className="text-xl font-extrabold tracking-wide">ระบบลงมติ</h2>
        </div>
        <div className="ornament-divider max-w-xs mx-auto mt-2"><div className="diamond" /></div>
        {schoolName && (
          <div className="mt-4 flex flex-col items-center gap-2">
            {schoolLogo && <img src={schoolLogo} alt={schoolName} className="school-avatar-lg" />}
            <span className="badge-gold text-sm flex items-center gap-1.5 w-fit"><School size={13} /> {schoolName}</span>
            {voter && <span className="text-xs text-royal-400">ลงชื่อเข้าเป็น: {voter}</span>}
            {geoStatus === "ok" && (
              <span className="text-[10px] text-green-600 flex items-center gap-1"><MapPin size={10} /> ยืนยันตำแหน่งแล้ว</span>
            )}
          </div>
        )}
      </div>

      {/* Kicked notification */}
      {kicked && (
        <div className="card-royal mb-6 border-red-300 bg-red-50">
          <div className="flex items-center gap-3 text-red-700">
            <AlertTriangle size={20} />
            <div><div className="font-semibold">ถูกบังคับออกจากระบบ</div><div className="text-sm">{kicked}</div></div>
          </div>
        </div>
      )}

      {/* Login section */}
      {!isLoggedIn && (
        <div className="card-royal mb-6">
          <h3 className="section-title mb-4"><LogIn size={16} className="text-gold-600" /> เข้าสู่ระบบเพื่อลงมติ</h3>

          {geoStatus === "ok" && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 text-center mb-4 flex items-center justify-center gap-2">
              <CheckCircle size={16} /> ตรวจสอบตำแหน่งเรียบร้อยแล้ว
            </div>
          )}

          <div className="flex border-b border-gold/20 mb-5">
            <button className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${loginTab === "qr" ? "border-gold-500 text-gold-700" : "border-transparent text-royal-400 hover:text-royal-600"}`} onClick={() => setLoginTab("qr")}>
              <QrCode size={15} /> สแกน QR Code
            </button>
            <button className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${loginTab === "password" ? "border-gold-500 text-gold-700" : "border-transparent text-royal-400 hover:text-royal-600"}`} onClick={() => setLoginTab("password")}>
              <Lock size={15} /> ชื่อผู้ใช้ / รหัสผ่าน
            </button>
          </div>

          {loginTab === "qr" ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-4"><QrCode size={32} className="text-gold-600" /></div>
              <p className="text-base font-semibold text-royal-700 mb-2">สแกน QR Code เพื่อเข้าสู่ระบบ</p>
              <p className="text-sm text-royal-400 mb-2">ใช้กล้องมือถือสแกน QR Code ที่ได้รับจากผู้ดูแลระบบ</p>
              <p className="text-xs text-royal-300">ระบบจะเข้าสู่หน้าลงมติโดยอัตโนมัติ</p>
              {loginError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 text-center mt-4">{loginError}</div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-royal-300 pointer-events-none" />
                <input className="input-royal !pl-10" placeholder="ชื่อผู้ใช้" value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-royal-300 pointer-events-none" />
                <input className="input-royal !pl-10" placeholder="รหัสผ่าน" type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handlePasswordLogin()} />
              </div>
              {loginError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 text-center">{loginError}</div>
              )}
              <button className="btn-gold w-full flex items-center justify-center gap-2 py-3" onClick={handlePasswordLogin} disabled={loginLoading}>
                <LogIn size={16} /> {loginLoading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Voting Section — must be logged in */}
      <div className="card-royal">
        <h3 className="section-title mb-4"><ClipboardList size={16} className="text-gold-600" /> ลงมติ</h3>

        {!isLoggedIn ? (
          <div className="text-center py-10">
            <div className="w-16 h-16 rounded-full bg-cream-100 flex items-center justify-center mx-auto mb-4">
              <Lock size={36} className="text-royal-300" />
            </div>
            <div className="text-royal-400 font-medium text-lg">กรุณาเข้าสู่ระบบก่อนลงมติ</div>
            <p className="text-sm text-royal-300 mt-1">สแกน QR Code หรือใช้ชื่อผู้ใช้/รหัสผ่านด้านบน</p>
          </div>
        ) : activeMotion ? (
          <div className="space-y-5">
            <div className="bg-gradient-to-br from-cream-50 to-cream-100 border border-gold/20 rounded-xl p-6 text-center">
              <div className="text-xl font-extrabold text-royal-900 mb-2">{activeMotion.title}</div>
              {activeMotion.description && <div className="text-sm text-royal-500">{activeMotion.description}</div>}
            </div>

            {state.votingOpen ? (
              showVoteConfirmation ? (
                <div className="text-center py-8 animate-scale-in">
                  <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={48} className="text-green-600" />
                  </div>
                  <div className="text-xl font-bold text-green-700 mb-1">บันทึกผลโหวตแล้ว</div>
                  <div className="text-sm text-royal-400 mt-1">
                    คุณเลือก: <span className="font-semibold">{CHOICE_META[voted || ""]?.label || voted}</span>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3">
                  {allowedChoices.map((choice) => {
                    const meta = CHOICE_META[choice];
                    if (!meta) return null;
                    const selected = voted === choice;
                    return (
                      <button
                        key={choice}
                        className={`${meta.btnClass} ${selected ? "vote-btn-selected" : ""} text-white px-6 py-5 rounded-xl font-bold text-lg flex items-center justify-center gap-3`}
                        onClick={() => castVote(choice as VoteChoice)}
                      >
                        <meta.Icon size={24} /> {meta.label}
                        {selected && <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">เลือกแล้ว</span>}
                      </button>
                    );
                  })}
                  {voted && (
                    <div className="text-center text-xs text-royal-400">กดปุ่มอื่นเพื่อปรับผลโหวต</div>
                  )}
                </div>
              )
            ) : (
              <div className="text-center py-10">
                <div className="w-16 h-16 rounded-full bg-royal-50 flex items-center justify-center mx-auto mb-4">
                  <Clock size={36} className="text-royal-300" />
                </div>
                <div className="text-royal-400 font-medium text-lg">รอการเปิดรับโหวตจากผู้ดูแลระบบ</div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-10">
            <div className="w-16 h-16 rounded-full bg-cream-100 flex items-center justify-center mx-auto mb-4">
              <Inbox size={36} className="text-royal-300" />
            </div>
            <div className="text-royal-400 font-medium text-lg">ยังไม่มีญัตติที่เปิดอยู่</div>
            <p className="text-sm text-royal-300 mt-1">กรุณารอผู้ดูแลระบบเปิดญัตติ</p>
          </div>
        )}
      </div>
    </div>
  );
}
