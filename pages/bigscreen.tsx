import React, { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import {
  Monitor, Megaphone, Timer, School, Vote,
  ThumbsUp, ThumbsDown, Hand, Inbox, CheckCircle, Square,
} from "lucide-react";

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

function CountdownTimer({ endTime }: { endTime: number | null }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!endTime) return <span className="text-royal-200">--:--</span>;
  const diff = Math.max(0, Math.floor((endTime - now) / 1000));
  const min = Math.floor(diff / 60).toString().padStart(2, "0");
  const sec = (diff % 60).toString().padStart(2, "0");
  return (
    <span className={`countdown-display ${diff <= 10 ? "text-red-500" : diff <= 30 ? "text-yellow-600" : "text-royal-900"}`}>
      {min}:{sec}
    </span>
  );
}

export default function BigScreen() {
  const [state, setState] = useState<State>({ motions: [], votes: {}, attendance: {}, bigScreenMessage: "", votingOpen: false, activeMotionId: null, countdownEnd: null, schools: [] });
  const [liveMessage, setLiveMessage] = useState("อัปเดตผลโหวตและสถานะแบบ Real-time");

  useEffect(() => {
    const s = io({ path: "/api/socket", transports: ["websocket", "polling"] });
    s.on("state:update", (data: State) => setState(data));
    s.on("bigscreen:update", (data: { message: string }) => setLiveMessage(data.message));
    return () => { s.disconnect(); };
  }, []);

  const activeMotion = useMemo(
    () => state.motions.find((m) => m.id === state.activeMotionId) || null,
    [state.motions, state.activeMotionId]
  );

  const totalSchools = state.schools.length;
  const presentSchools = Object.values(state.attendance).filter(Boolean).length;

  const votes = activeMotion ? state.votes[activeMotion.id] || { AGREE: 0, DISAGREE: 0, ABSTAIN: 0 } : { AGREE: 0, DISAGREE: 0, ABSTAIN: 0 };
  const totalVotes = votes.AGREE + votes.DISAGREE + votes.ABSTAIN;

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #fffdf7 0%, #fef3d0 100%)" }}>
      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl md:text-4xl font-extrabold text-royal-900 flex items-center justify-center gap-3">
            <Monitor size={32} /> หน้าจอแสดงผล
          </h1>
          <div className="ornament-divider max-w-sm mx-auto mt-2">
            <div className="diamond" />
          </div>
          <p className="text-royal-400 mt-1 text-sm">ระบบโหวตลงมติ — สหวิทยาเขตวชิรบูรพา</p>
        </div>

        {/* Announcement */}
        <div className="card-royal text-center mb-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-gold/5 via-transparent to-gold/5 pointer-events-none" />
          <div className="relative text-lg md:text-xl font-semibold text-gold-700 flex items-center justify-center gap-2">
            <Megaphone size={22} /> {liveMessage || state.bigScreenMessage || "ยินดีต้อนรับ"}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="card-royal text-center py-5">
            <div className="text-sm text-royal-400 mb-2 flex items-center justify-center gap-1"><Timer size={14} /> เวลาที่เหลือ</div>
            <div className="text-4xl md:text-6xl font-extrabold font-mono">
              <CountdownTimer endTime={state.countdownEnd} />
            </div>
          </div>

          <div className="card-royal text-center py-5">
            <div className="text-sm text-royal-400 mb-2 flex items-center justify-center gap-1"><School size={14} /> องค์ประชุม</div>
            <div className="text-4xl md:text-6xl font-extrabold text-royal-900">
              {presentSchools}<span className="text-2xl md:text-3xl text-royal-300">/{totalSchools}</span>
            </div>
          </div>

          <div className="card-royal text-center py-5 flex flex-col items-center justify-center">
            <div className="text-sm text-royal-400 mb-2">สถานะ</div>
            <span className={`text-base font-bold px-5 py-2 rounded-full flex items-center gap-2 ${
              state.votingOpen
                ? "bg-green-100 text-green-700 border border-green-300"
                : "bg-red-50 text-red-600 border border-red-200"
            }`}>
              <span className={`w-3 h-3 rounded-full ${state.votingOpen ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
              {state.votingOpen ? "เปิดรับโหวต" : "ปิดรับโหวต"}
            </span>
          </div>
        </div>

        {/* Vote Results */}
        <div className="card-royal mb-5">
          <h3 className="section-title mb-5 text-xl"><Vote size={20} className="text-gold-600" /> ผลการลงมติ</h3>
          {activeMotion ? (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-cream-50 to-cream-100 border border-gold/20 rounded-xl p-6 text-center">
                <div className="text-2xl md:text-3xl font-extrabold text-royal-900">{activeMotion.title}</div>
                {activeMotion.description && <div className="text-sm text-royal-400 mt-2">{activeMotion.description}</div>}
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                {([
                  { label: "เห็นด้วย", key: "AGREE" as VoteChoice, Icon: ThumbsUp, color: "border-green-400", bg: "bg-green-50", text: "text-green-700", bar: "vote-bar-agree" },
                  { label: "ไม่เห็นด้วย", key: "DISAGREE" as VoteChoice, Icon: ThumbsDown, color: "border-red-400", bg: "bg-red-50", text: "text-red-700", bar: "vote-bar-disagree" },
                  { label: "งดออกเสียง", key: "ABSTAIN" as VoteChoice, Icon: Hand, color: "border-yellow-400", bg: "bg-yellow-50", text: "text-yellow-700", bar: "vote-bar-abstain" },
                ]).map((item) => {
                  const count = votes[item.key] || 0;
                  const percent = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
                  return (
                    <div key={item.key} className={`rounded-xl border-2 ${item.color} ${item.bg} p-6 text-center transition-all`}>
                      <item.Icon size={32} className={`mx-auto mb-2 ${item.text}`} />
                      <div className={`text-base font-bold ${item.text}`}>{item.label}</div>
                      <div className={`text-5xl md:text-6xl font-extrabold ${item.text} my-3 countdown-display`}>{count}</div>
                      <div className="vote-bar mb-2 h-3">
                        <div className={`vote-bar-fill ${item.bar} h-3`} style={{ width: `${percent}%` }} />
                      </div>
                      <div className="text-sm font-semibold text-royal-500">{percent}%</div>
                    </div>
                  );
                })}
              </div>

              <div className="text-center text-royal-400 text-lg">
                รวมทั้งหมด: <span className="font-bold text-royal-700">{totalVotes}</span> เสียง
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-full bg-cream-100 flex items-center justify-center mx-auto mb-4">
                <Inbox size={40} className="text-royal-300" />
              </div>
              <div className="text-xl text-royal-400">ยังไม่มีญัตติที่กำลังแสดง</div>
            </div>
          )}
        </div>

        {/* School Status */}
        <div className="card-royal">
          <h3 className="section-title mb-4"><School size={16} className="text-gold-600" /> สถานะโรงเรียน</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {state.schools.map((s) => (
              <div
                key={s.id}
                className={`p-4 rounded-xl border text-sm font-medium transition-all flex items-center gap-3 ${
                  state.attendance[s.id]
                    ? "bg-green-50 border-green-300 text-green-800 shadow-sm"
                    : "bg-white border-gold/15 text-royal-300"
                }`}
              >
                {s.logoUrl ? (
                  <img src={s.logoUrl.replace(/^http:\/\//i, "https://")} alt="" className="school-avatar-sm flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
                    <School size={14} className="text-gold-500" />
                  </div>
                )}
                {state.attendance[s.id] ? <CheckCircle size={16} className="text-green-600 flex-shrink-0" /> : <Square size={16} className="flex-shrink-0" />}
                <span className="leading-snug">{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
