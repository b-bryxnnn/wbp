import React, { useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";
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
  if (!endTime) return <span className="text-royal-300">--:--</span>;
  const diff = Math.max(0, Math.floor((endTime - now) / 1000));
  const min = Math.floor(diff / 60).toString().padStart(2, "0");
  const sec = (diff % 60).toString().padStart(2, "0");
  return (
    <span className={diff <= 10 ? "text-red-600" : "text-royal-900"}>
      {min}:{sec}
    </span>
  );
}

export default function BigScreen() {
  const [state, setState] = useState<State>({ motions: [], votes: {}, attendance: {}, bigScreenMessage: "", votingOpen: false, activeMotionId: null, countdownEnd: null, schools: [] });
  const [liveMessage, setLiveMessage] = useState("อัปเดตผลโหวตและสถานะแบบ Real-time");

  useEffect(() => {
    const s = io({ path: "/api/socket" });
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
    <div className="min-h-screen bg-[#fffdf7]">
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-royal-900 flex items-center justify-center gap-3">
            <Monitor size={32} /> หน้าจอแสดงผล
          </h1>
          <div className="ornament-divider max-w-sm mx-auto mt-3">
            <div className="diamond" />
          </div>
          <p className="text-royal-400 mt-2 text-sm">ระบบโหวตลงมติ — สหวิทยาเขตวชิรบูรพา</p>
        </div>

        {/* Announcement */}
        <div className="card-royal text-center mb-6">
          <div className="text-lg md:text-xl font-semibold text-gold-700 flex items-center justify-center gap-2">
            <Megaphone size={20} /> {liveMessage || state.bigScreenMessage || "ยินดีต้อนรับ"}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card-royal text-center">
            <div className="text-sm text-royal-400 mb-1 flex items-center justify-center gap-1"><Timer size={14} /> เวลาที่เหลือ</div>
            <div className="text-4xl md:text-5xl font-extrabold font-mono">
              <CountdownTimer endTime={state.countdownEnd} />
            </div>
          </div>

          <div className="card-royal text-center">
            <div className="text-sm text-royal-400 mb-1 flex items-center justify-center gap-1"><School size={14} /> องค์ประชุม</div>
            <div className="text-4xl md:text-5xl font-extrabold text-royal-900">
              {presentSchools}<span className="text-2xl text-royal-300">/{totalSchools}</span>
            </div>
          </div>

          <div className="card-royal text-center flex flex-col items-center justify-center">
            <div className="text-sm text-royal-400 mb-1">สถานะ</div>
            <span className={`text-base font-bold px-4 py-1.5 rounded-full flex items-center gap-1.5 ${
              state.votingOpen
                ? "bg-green-100 text-green-700 border border-green-300"
                : "bg-red-50 text-red-600 border border-red-200"
            }`}>
              <span className={`w-2.5 h-2.5 rounded-full ${state.votingOpen ? "bg-green-500" : "bg-red-500"}`} />
              {state.votingOpen ? "เปิดรับโหวต" : "ปิดรับโหวต"}
            </span>
          </div>
        </div>

        {/* Vote Results */}
        <div className="card-royal mb-6">
          <h3 className="section-title mb-5 text-xl"><Vote size={20} className="text-gold-600" /> ผลการลงมติ</h3>
          {activeMotion ? (
            <div className="space-y-6">
              <div className="bg-cream-50 border border-gold/20 rounded-lg p-5 text-center">
                <div className="text-2xl md:text-3xl font-extrabold text-royal-900">{activeMotion.title}</div>
                <div className="text-sm text-royal-400 mt-1">{activeMotion.description}</div>
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
                    <div key={item.key} className={`rounded-lg border-2 ${item.color} ${item.bg} p-5 text-center`}>
                      <item.Icon size={28} className={`mx-auto mb-1 ${item.text}`} />
                      <div className={`text-base font-bold ${item.text}`}>{item.label}</div>
                      <div className={`text-5xl font-extrabold ${item.text} my-2`}>{count}</div>
                      <div className="vote-bar mb-1">
                        <div className={`vote-bar-fill ${item.bar}`} style={{ width: `${percent}%` }} />
                      </div>
                      <div className="text-sm text-royal-400">{percent}%</div>
                    </div>
                  );
                })}
              </div>

              <div className="text-center text-royal-400">
                รวมทั้งหมด: <span className="font-bold text-royal-700">{totalVotes}</span> เสียง
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Inbox size={48} className="text-royal-300 mx-auto mb-3" />
              <div className="text-xl text-royal-400">ยังไม่มีญัตติที่กำลังแสดง</div>
            </div>
          )}
        </div>

        {/* School Status */}
        <div className="card-royal">
          <h3 className="section-title mb-4"><School size={16} className="text-gold-600" /> สถานะโรงเรียน</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {state.schools.map((s) => (
              <div
                key={s.id}
                className={`p-3 rounded-lg border text-sm font-medium transition-colors flex items-center gap-2 ${
                  state.attendance[s.id]
                    ? "bg-green-50 border-green-300 text-green-800"
                    : "bg-white border-gold/15 text-royal-300"
                }`}
              >
                {s.logoUrl && <img src={s.logoUrl} alt="" className="w-6 h-6 object-contain flex-shrink-0" />}
                {state.attendance[s.id] ? <CheckCircle size={14} /> : <Square size={14} />}
                <span className="truncate">{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
