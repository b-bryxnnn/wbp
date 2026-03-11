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
} from "lucide-react";

const QRCode = dynamic(() => import("react-qr-code"), { ssr: false });

type VoteChoice = "AGREE" | "DISAGREE" | "ABSTAIN";
type Motion = { id: number; title: string; description: string; isActive: boolean };
type SchoolT = { id: number; name: string; loginToken?: string };

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
    const s = io({ path: "/api/socket" });
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

  const schoolName = state.schools.find((s) => s.id === schoolId)?.name;

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
          <div className="mt-3">
            <span className="badge-gold text-sm flex items-center gap-1 justify-center w-fit mx-auto">
              <School size={13} /> {schoolName}
            </span>
          </div>
        )}
      </div>

      {/* Login section - show only if not logged in */}
      {!schoolId && (
        <div className="card-royal mb-6">
          <h3 className="section-title mb-4"><LogIn size={16} className="text-gold-600" /> เข้าสู่ระบบ</h3>

          {/* Login tabs */}
          <div className="flex border-b border-gold/20 mb-4">
            <button
              className={`flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
                loginTab === "qr" ? "border-gold-500 text-gold-700" : "border-transparent text-royal-400 hover:text-royal-600"
              }`}
              onClick={() => setLoginTab("qr")}
            >
              <QrCode size={15} /> สแกน QR Code
            </button>
            <button
              className={`flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
                loginTab === "password" ? "border-gold-500 text-gold-700" : "border-transparent text-royal-400 hover:text-royal-600"
              }`}
              onClick={() => setLoginTab("password")}
            >
              <User size={15} /> ชื่อผู้ใช้ / รหัสผ่าน
            </button>
          </div>

          {loginTab === "qr" ? (
            <div className="text-center py-4">
              <p className="text-sm text-royal-500 mb-4">สแกน QR Code ที่ได้รับจากผู้ดูแลระบบ</p>
              <div className="inline-block bg-white p-4 rounded-lg border border-gold/20">
                <QRCode value={`${typeof window !== "undefined" ? window.location.origin : ""}/vote`} bgColor="#ffffff" fgColor="#2d2312" size={140} />
              </div>
              <p className="text-xs text-royal-300 mt-3">หรือเปิดลิงก์ที่ได้รับจาก QR Code ในเบราว์เซอร์โดยตรง</p>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                className="input-royal"
                placeholder="ชื่อผู้ใช้"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <input
                className="input-royal"
                placeholder="รหัสผ่าน"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePasswordLogin()}
              />
              {loginError && <p className="text-sm text-red-600">{loginError}</p>}
              <button
                className="btn-gold w-full flex items-center justify-center gap-2"
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
            <div className="bg-cream-50 border border-gold/20 rounded-lg p-5 text-center">
              <div className="text-xl font-extrabold text-royal-900 mb-1">{activeMotion.title}</div>
              <div className="text-sm text-royal-500">{activeMotion.description}</div>
            </div>

            {state.votingOpen ? (
              voted ? (
                <div className="text-center py-6">
                  <CheckCircle size={48} className="text-green-600 mx-auto mb-3" />
                  <div className="text-xl font-bold text-green-700">ลงมติเรียบร้อยแล้ว</div>
                  <div className="text-sm text-royal-400 mt-1">
                    คุณเลือก: {voted === "AGREE" ? "เห็นด้วย" : voted === "DISAGREE" ? "ไม่เห็นด้วย" : "งดออกเสียง"}
                  </div>
                </div>
              ) : (
                <div className="grid gap-3">
                  <button
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-lg font-bold text-lg transition-colors flex items-center justify-center gap-2"
                    onClick={() => castVote("AGREE")}
                  >
                    <ThumbsUp size={20} /> เห็นด้วย
                  </button>
                  <button
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-4 rounded-lg font-bold text-lg transition-colors flex items-center justify-center gap-2"
                    onClick={() => castVote("DISAGREE")}
                  >
                    <ThumbsDown size={20} /> ไม่เห็นด้วย
                  </button>
                  <button
                    className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-4 rounded-lg font-bold text-lg transition-colors flex items-center justify-center gap-2"
                    onClick={() => castVote("ABSTAIN")}
                  >
                    <Hand size={20} /> งดออกเสียง
                  </button>
                </div>
              )
            ) : (
              <div className="text-center py-8">
                <Clock size={40} className="text-royal-300 mx-auto mb-3" />
                <div className="text-royal-400 font-medium">รอการเปิดรับโหวตจากผู้ดูแลระบบ</div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <Inbox size={40} className="text-royal-300 mx-auto mb-3" />
            <div className="text-royal-400 font-medium">ยังไม่มีญัตติที่เปิดอยู่</div>
          </div>
        )}
      </div>
    </div>
  );
}
