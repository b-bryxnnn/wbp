import React, { useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import {
  Vote as VoteIcon,
  School,
  User,
  QrCode,
  LogIn,
  ThumbsUp,
  ThumbsDown,
  Hand,
  CheckCircle,
  Clock,
  Inbox,
  ClipboardList,
  Lock,
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
};

export default function VotePage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [state, setState] = useState<State>({ motions: [], votes: {}, attendance: {}, bigScreenMessage: "", votingOpen: false, activeMotionId: null, countdownEnd: null, schools: [] });
  const [schoolId, setSchoolId] = useState<number | "">("");
  const [voter, setVoter] = useState("");
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [voted, setVoted] = useState<string | null>(null);
  const [loginTab, setLoginTab] = useState<"qr" | "password">("qr");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const s = io({ path: "/api/socket", transports: ["websocket", "polling"] });
    setSocket(s);
    s.on("state:update", (data: State) => { setState(data); setVoted(null); });
    return () => { s.disconnect(); };
  }, []);

  useEffect(() => {
    const token = (router.query.token as string) || localStorage.getItem("auth_token") || null;
    if (!token) return;
    const login = async () => {
      try {
        const res = await fetch(`/api/auth/qr?token=${token}`);
        if (!res.ok) return;
        const data = await res.json();
        setAuthToken(data.token);
        localStorage.setItem("auth_token", data.token);
        setSchoolId(data.school.id);
        setVoter(data.user.name);
      } catch (e) {
        console.error(e);
      }
    };
    login();
  }, [router.query.token]);

  const handlePasswordLogin = async () => {
    setLoginError("");
    setLoginLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || "เข้าสู่ระบบไม่สำเร็จ");
        return;
      }
      setAuthToken(data.token);
      localStorage.setItem("auth_token", data.token);
      setSchoolId(data.school.id);
      setVoter(data.user.name);
    } catch {
      setLoginError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setLoginLoading(false);
    }
  };

  const activeMotion = useMemo(
    () => state.motions.find((m) => m.id === state.activeMotionId) || null,
    [state.motions, state.activeMotionId]
  );

  const castVote = (choice: VoteChoice) => {
    if (!socket || !activeMotion) return;
    socket.emit("vote:cast", {
      motionId: activeMotion.id,
      choice,
      authToken,
      schoolId: schoolId ? Number(schoolId) : undefined,
      voter,
    });
    setVoted(choice);
  };

  const currentSchool = state.schools.find((s) => s.id === schoolId);
  const schoolName = currentSchool?.name;
  const schoolLogo = currentSchool?.logoUrl?.replace(/^http:\/\//i, "https://");

  return (
    <div className="animate-fade-in max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-extrabold text-royal-900 flex items-center justify-center gap-2">
          <VoteIcon size={24} /> ลงมติ
        </h2>
        <div className="ornament-divider max-w-xs mx-auto mt-2">
          <div className="diamond" />
        </div>
        {schoolName && (
          <div className="mt-4 flex flex-col items-center gap-2">
            {schoolLogo && <img src={schoolLogo} alt={schoolName} className="school-avatar-lg" />}
            <span className="badge-gold text-sm flex items-center gap-1.5 w-fit">
              <School size={13} /> {schoolName}
            </span>
            {voter && <span className="text-xs text-royal-400">ลงชื่อเข้าเป็น: {voter}</span>}
          </div>
        )}
      </div>

      {/* Login section - show only if not logged in */}
      {!schoolId && (
        <div className="card-royal mb-6">
          <h3 className="section-title mb-4"><LogIn size={16} className="text-gold-600" /> เข้าสู่ระบบ</h3>

          {/* Login tabs */}
          <div className="flex border-b border-gold/20 mb-5">
            <button
              className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
                loginTab === "qr" ? "border-gold-500 text-gold-700" : "border-transparent text-royal-400 hover:text-royal-600"
              }`}
              onClick={() => setLoginTab("qr")}
            >
              <QrCode size={15} /> สแกน QR Code
            </button>
            <button
              className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
                loginTab === "password" ? "border-gold-500 text-gold-700" : "border-transparent text-royal-400 hover:text-royal-600"
              }`}
              onClick={() => setLoginTab("password")}
            >
              <Lock size={15} /> ชื่อผู้ใช้ / รหัสผ่าน
            </button>
          </div>

          {loginTab === "qr" ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-4">
                <QrCode size={32} className="text-gold-600" />
              </div>
              <p className="text-base font-semibold text-royal-700 mb-2">สแกน QR Code เพื่อเข้าสู่ระบบ</p>
              <p className="text-sm text-royal-400 mb-2">ใช้กล้องมือถือสแกน QR Code ที่ได้รับจากผู้ดูแลระบบ</p>
              <p className="text-xs text-royal-300">ระบบจะเข้าสู่หน้าลงมติโดยอัตโนมัติ</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-royal-300 pointer-events-none" />
                <input
                  className="input-royal !pl-10"
                  placeholder="ชื่อผู้ใช้"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-royal-300 pointer-events-none" />
                <input
                  className="input-royal !pl-10"
                  placeholder="รหัสผ่าน"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePasswordLogin()}
                />
              </div>
              {loginError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 text-center">
                  {loginError}
                </div>
              )}
              <button
                className="btn-gold w-full flex items-center justify-center gap-2 py-3"
                onClick={handlePasswordLogin}
                disabled={loginLoading}
              >
                <LogIn size={16} /> {loginLoading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Voting Section */}
      <div className="card-royal">
        <h3 className="section-title mb-4"><ClipboardList size={16} className="text-gold-600" /> ลงมติ</h3>
        {activeMotion ? (
          <div className="space-y-5">
            {/* Motion Info */}
            <div className="bg-gradient-to-br from-cream-50 to-cream-100 border border-gold/20 rounded-xl p-6 text-center">
              <div className="text-xl font-extrabold text-royal-900 mb-2">{activeMotion.title}</div>
              {activeMotion.description && (
                <div className="text-sm text-royal-500">{activeMotion.description}</div>
              )}
            </div>

            {state.votingOpen ? (
              voted ? (
                <div className="text-center py-8 animate-scale-in">
                  <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={48} className="text-green-600" />
                  </div>
                  <div className="text-xl font-bold text-green-700 mb-1">ลงมติเรียบร้อยแล้ว</div>
                  <div className="text-sm text-royal-400 mt-1">
                    คุณเลือก: <span className="font-semibold">{voted === "AGREE" ? "เห็นด้วย" : voted === "DISAGREE" ? "ไม่เห็นด้วย" : "งดออกเสียง"}</span>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3">
                  <button
                    className="vote-btn vote-btn-agree text-white px-6 py-5 rounded-xl font-bold text-lg flex items-center justify-center gap-3"
                    onClick={() => castVote("AGREE")}
                  >
                    <ThumbsUp size={24} /> เห็นด้วย
                  </button>
                  <button
                    className="vote-btn vote-btn-disagree text-white px-6 py-5 rounded-xl font-bold text-lg flex items-center justify-center gap-3"
                    onClick={() => castVote("DISAGREE")}
                  >
                    <ThumbsDown size={24} /> ไม่เห็นด้วย
                  </button>
                  <button
                    className="vote-btn vote-btn-abstain text-white px-6 py-5 rounded-xl font-bold text-lg flex items-center justify-center gap-3"
                    onClick={() => castVote("ABSTAIN")}
                  >
                    <Hand size={24} /> งดออกเสียง
                  </button>
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
