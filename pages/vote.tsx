import React, { useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";
import QRCode from "react-qr-code";
import { useRouter } from "next/router";

type VoteChoice = "AGREE" | "DISAGREE" | "ABSTAIN";
type Motion = { id: number; title: string; description: string; isActive: boolean };
type School = { id: number; name: string; loginToken?: string };

type State = {
  motions: Motion[];
  votes: Record<number, Record<VoteChoice, number>>;
  attendance: Record<number, boolean>;
  bigScreenMessage: string;
  votingOpen: boolean;
  activeMotionId: number | null;
  countdownEnd: number | null;
  schools: School[];
};

export default function Vote() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [state, setState] = useState<State>({ motions: [], votes: {}, attendance: {}, bigScreenMessage: "", votingOpen: false, activeMotionId: null, countdownEnd: null, schools: [] });
  const [schoolId, setSchoolId] = useState<number | "">("");
  const [voter, setVoter] = useState("");
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [voted, setVoted] = useState<string | null>(null);
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
        <h2 className="text-3xl font-extrabold text-royal-900">🗳 ลงมติ</h2>
        <div className="ornament-divider max-w-xs mx-auto mt-2">
          <div className="diamond" />
        </div>
        {schoolName && (
          <div className="mt-3">
            <span className="badge-gold text-sm">🏫 {schoolName}</span>
          </div>
        )}
      </div>

      {/* QR Login section */}
      {!schoolId && (
        <div className="card-royal text-center mb-6">
          <div className="text-5xl mb-3">📱</div>
          <h3 className="text-lg font-bold text-royal-800 mb-2">เข้าสู่ระบบด้วย QR Code</h3>
          <p className="text-sm text-royal-400 mb-4">สแกน QR ที่ได้รับจากผู้ดูแลระบบของโรงเรียน</p>
          <div className="inline-block bg-white p-4 rounded-xl border border-gold/20 shadow-card">
            <QRCode value={`${typeof window !== "undefined" ? window.location.origin : ""}/vote`} bgColor="#ffffff" fgColor="#2d2312" size={160} />
          </div>
        </div>
      )}

      {/* Manual Login */}
      <div className="card-royal mb-6">
        <h3 className="section-title mb-4">👤 ข้อมูลผู้ลงมติ</h3>
        <div className="space-y-3">
          <select
            className="input-royal"
            value={schoolId}
            onChange={(e) => setSchoolId(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">-- เลือกโรงเรียน (กรณีไม่ได้สแกน QR) --</option>
            {state.schools.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <input
            className="input-royal"
            placeholder="ชื่อผู้ลงมติ (ถ้ามี)"
            value={voter}
            onChange={(e) => setVoter(e.target.value)}
          />
        </div>
      </div>

      {/* Voting Section */}
      <div className="card-royal">
        <h3 className="section-title mb-4">📋 ลงมติ</h3>
        {activeMotion ? (
          <div className="space-y-5">
            {/* Motion Info */}
            <div className="bg-cream-50 border border-gold/20 rounded-xl p-5 text-center">
              <div className="text-2xl font-extrabold text-royal-900 mb-1">{activeMotion.title}</div>
              <div className="text-sm text-royal-500">{activeMotion.description}</div>
            </div>

            {state.votingOpen ? (
              voted ? (
                <div className="text-center py-6">
                  <div className="text-5xl mb-3">✅</div>
                  <div className="text-xl font-bold text-green-700">ลงมติเรียบร้อยแล้ว</div>
                  <div className="text-sm text-royal-400 mt-1">
                    คุณเลือก: {voted === "AGREE" ? "เห็นด้วย" : voted === "DISAGREE" ? "ไม่เห็นด้วย" : "งดออกเสียง"}
                  </div>
                </div>
              ) : (
                <div className="grid gap-3">
                  {([
                    { label: "เห็นด้วย", choice: "AGREE" as VoteChoice, emoji: "👍", color: "bg-green-600 hover:bg-green-700" },
                    { label: "ไม่เห็นด้วย", choice: "DISAGREE" as VoteChoice, emoji: "👎", color: "bg-red-600 hover:bg-red-700" },
                    { label: "งดออกเสียง", choice: "ABSTAIN" as VoteChoice, emoji: "🤚", color: "bg-yellow-600 hover:bg-yellow-700" },
                  ]).map((item) => (
                    <button
                      key={item.choice}
                      className={`${item.color} text-white px-6 py-4 rounded-xl font-bold text-lg transition-all shadow-sm hover:shadow-md active:scale-[0.98]`}
                      onClick={() => castVote(item.choice)}
                    >
                      {item.emoji} {item.label}
                    </button>
                  ))}
                </div>
              )
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">⏳</div>
                <div className="text-royal-400 font-medium">รอการเปิดรับโหวตจากผู้ดูแลระบบ</div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">📭</div>
            <div className="text-royal-400 font-medium">ยังไม่มีญัตติที่เปิดอยู่</div>
          </div>
        )}
      </div>
    </div>
  );
}
