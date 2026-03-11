import React, { useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";

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

export default function BigScreen() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [state, setState] = useState<State>({ motions: [], votes: {}, attendance: {}, bigScreenMessage: "", votingOpen: false, activeMotionId: null, countdownEnd: null, schools: [] });
  const [liveMessage, setLiveMessage] = useState("อัปเดตผลโหวตและสถานะแบบ Real-time");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const s = io({ path: "/api/socket" });
    setSocket(s);
    s.on("state:update", (data: State) => setState(data));
    s.on("bigscreen:update", (data: { message: string }) => setLiveMessage(data.message));
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(timer); s.disconnect(); };
  }, []);

  const activeMotion = useMemo(
    () => state.motions.find((m) => m.id === state.activeMotionId) || null,
    [state.motions, state.activeMotionId]
  );

  const countdownDisplay = useMemo(() => {
    if (!state.countdownEnd) return null;
    const diff = Math.max(0, Math.floor((state.countdownEnd - now) / 1000));
    const min = Math.floor(diff / 60).toString().padStart(2, "0");
    const sec = (diff % 60).toString().padStart(2, "0");
    return { text: `${min}:${sec}`, seconds: diff };
  }, [state.countdownEnd, now]);

  const totalSchools = state.schools.length;
  const presentSchools = Object.values(state.attendance).filter(Boolean).length;

  const votes = activeMotion ? state.votes[activeMotion.id] || { AGREE: 0, DISAGREE: 0, ABSTAIN: 0 } : { AGREE: 0, DISAGREE: 0, ABSTAIN: 0 };
  const totalVotes = votes.AGREE + votes.DISAGREE + votes.ABSTAIN;

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream-50 via-cream-100 to-cream-200 pattern-bg">
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">

        {/* ===== Header ===== */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold text-royal-900">📺 หน้าจอแสดงผล</h1>
          <div className="ornament-divider max-w-sm mx-auto mt-3">
            <div className="diamond" />
          </div>
          <p className="text-royal-400 mt-2">ระบบโหวตลงมติ — สหวิทยาเขตวชิรบูรพา</p>
        </div>

        {/* ===== Announcement ===== */}
        <div className="card-royal text-center mb-6">
          <div className="text-xl md:text-2xl font-semibold text-gold-700">
            📢 {liveMessage || state.bigScreenMessage || "ยินดีต้อนรับ"}
          </div>
        </div>

        {/* ===== Stats Row ===== */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {/* Countdown */}
          <div className="card-royal text-center">
            <div className="text-sm text-royal-400 mb-1">⏱ เวลาที่เหลือ</div>
            <div className={`text-4xl md:text-5xl font-extrabold font-mono ${
              countdownDisplay && countdownDisplay.seconds <= 10 ? "text-red-600 animate-pulse" : "text-royal-900"
            }`}>
              {countdownDisplay ? countdownDisplay.text : "--:--"}
            </div>
          </div>

          {/* Quorum */}
          <div className="card-royal text-center">
            <div className="text-sm text-royal-400 mb-1">🏫 องค์ประชุม</div>
            <div className="text-4xl md:text-5xl font-extrabold text-royal-900">
              {presentSchools}<span className="text-2xl text-royal-300">/{totalSchools}</span>
            </div>
          </div>

          {/* Status */}
          <div className="card-royal text-center flex flex-col items-center justify-center">
            <div className="text-sm text-royal-400 mb-1">สถานะ</div>
            <span className={`text-lg font-bold px-4 py-1.5 rounded-full ${
              state.votingOpen
                ? "bg-green-100 text-green-700 border border-green-300"
                : "bg-red-50 text-red-600 border border-red-200"
            }`}>
              {state.votingOpen ? "🟢 เปิดรับโหวต" : "🔴 ปิดรับโหวต"}
            </span>
          </div>
        </div>

        {/* ===== Vote Results ===== */}
        <div className="card-royal mb-6">
          <h3 className="section-title mb-5 text-2xl">🗳 ผลการลงมติ</h3>
          {activeMotion ? (
            <div className="space-y-6">
              {/* Motion Title */}
              <div className="bg-cream-50 border border-gold/20 rounded-xl p-5 text-center">
                <div className="text-2xl md:text-3xl font-extrabold text-royal-900">{activeMotion.title}</div>
                <div className="text-sm text-royal-400 mt-1">{activeMotion.description}</div>
              </div>

              {/* Vote Bars */}
              <div className="grid md:grid-cols-3 gap-4">
                {([
                  { label: "เห็นด้วย", key: "AGREE" as VoteChoice, emoji: "👍", color: "border-green-400", bg: "bg-green-50", text: "text-green-700", bar: "vote-bar-agree" },
                  { label: "ไม่เห็นด้วย", key: "DISAGREE" as VoteChoice, emoji: "👎", color: "border-red-400", bg: "bg-red-50", text: "text-red-700", bar: "vote-bar-disagree" },
                  { label: "งดออกเสียง", key: "ABSTAIN" as VoteChoice, emoji: "🤚", color: "border-yellow-400", bg: "bg-yellow-50", text: "text-yellow-700", bar: "vote-bar-abstain" },
                ]).map((item) => {
                  const count = votes[item.key] || 0;
                  const percent = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
                  return (
                    <div key={item.key} className={`rounded-xl border-2 ${item.color} ${item.bg} p-5 text-center`}>
                      <div className="text-3xl mb-1">{item.emoji}</div>
                      <div className={`text-lg font-bold ${item.text}`}>{item.label}</div>
                      <div className={`text-5xl font-extrabold ${item.text} my-2`}>{count}</div>
                      <div className="vote-bar mb-1">
                        <div className={`vote-bar-fill ${item.bar}`} style={{ width: `${percent}%` }} />
                      </div>
                      <div className="text-sm text-royal-400">{percent}%</div>
                    </div>
                  );
                })}
              </div>

              {/* Total */}
              <div className="text-center text-royal-400">
                รวมทั้งหมด: <span className="font-bold text-royal-700">{totalVotes}</span> เสียง
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-5xl mb-3">📭</div>
              <div className="text-xl text-royal-400">ยังไม่มีญัตติที่กำลังแสดง</div>
            </div>
          )}
        </div>

        {/* ===== School Status ===== */}
        <div className="card-royal">
          <h3 className="section-title mb-4">🏫 สถานะโรงเรียน</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {state.schools.map((s) => (
              <div
                key={s.id}
                className={`p-3 rounded-xl border text-center text-sm font-medium transition-all ${
                  state.attendance[s.id]
                    ? "bg-green-50 border-green-300 text-green-800"
                    : "bg-white border-gold/15 text-royal-300"
                }`}
              >
                {state.attendance[s.id] ? "✅" : "⬜"} {s.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
