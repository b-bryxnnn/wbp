import React, { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import {
  Megaphone, Timer, School, Vote,
  ThumbsUp, ThumbsDown, Hand, Inbox, Landmark,
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
  onlineSchools: number[];
};

function CountdownTimer({ endTime }: { endTime: number | null }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!endTime) return null;
  const diff = Math.max(0, Math.floor((endTime - now) / 1000));
  if (diff === 0) return null;
  const min = Math.floor(diff / 60).toString().padStart(2, "0");
  const sec = (diff % 60).toString().padStart(2, "0");
  return (
    <div className={`text-center ${diff <= 10 ? "text-red-500" : diff <= 30 ? "text-yellow-500" : "text-white"}`}>
      <div className="text-sm opacity-70 mb-1 flex items-center justify-center gap-1"><Timer size={14} /> เวลาที่เหลือ</div>
      <div className="text-6xl md:text-8xl font-extrabold font-mono tracking-wider">{min}:{sec}</div>
    </div>
  );
}

export default function LedScreen() {
  const [state, setState] = useState<State>({
    motions: [], votes: {}, attendance: {}, bigScreenMessage: "",
    votingOpen: false, activeMotionId: null, countdownEnd: null, schools: [], onlineSchools: [],
  });
  const [liveMessage, setLiveMessage] = useState("");

  useEffect(() => {
    const s = io({ path: "/api/socket", transports: ["polling"] });
    s.on("state:update", (data: State) => setState(data));
    s.on("bigscreen:update", (data: { message: string }) => setLiveMessage(data.message));
    return () => { s.disconnect(); };
  }, []);

  const activeMotion = useMemo(
    () => state.motions.find((m) => m.id === state.activeMotionId) || null,
    [state.motions, state.activeMotionId]
  );

  const votes = activeMotion ? state.votes[activeMotion.id] || { AGREE: 0, DISAGREE: 0, ABSTAIN: 0 } : { AGREE: 0, DISAGREE: 0, ABSTAIN: 0 };
  const totalVotes = votes.AGREE + votes.DISAGREE + votes.ABSTAIN;
  const displayMessage = liveMessage || state.bigScreenMessage || "ยินดีต้อนรับ";

  // Completed motions (have votes, not currently active)
  const completedMotions = state.motions.filter((m) => {
    const v = state.votes[m.id];
    return v && (v.AGREE + v.DISAGREE + v.ABSTAIN > 0) && m.id !== state.activeMotionId;
  });

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #1a1207 0%, #2d2312 50%, #1a1207 100%)", fontFamily: "var(--font-sarabun), var(--font-prompt), sans-serif" }}>
      {/* Header bar */}
      <div className="h-1.5 bg-gradient-to-r from-transparent via-[#c8a24e] to-transparent" />

      <div className="flex-1 flex flex-col p-6 md:p-10">
        {/* Top: Logo row */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#daa520] to-[#c8a24e] flex items-center justify-center">
              <Landmark size={24} className="text-white" />
            </div>
            <div>
              <div className="text-[#c8a24e] font-bold text-lg">ระบบโหวตลงมติ</div>
              <div className="text-[#8b7a52] text-xs">สหวิทยาเขตวชิรบูรพา</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {state.votingOpen ? (
              <span className="bg-green-900/50 text-green-400 border border-green-700 px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" /> เปิดรับโหวต
              </span>
            ) : (
              <span className="bg-red-900/30 text-red-400 border border-red-800 px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> ปิดรับโหวต
              </span>
            )}
          </div>
        </div>

        {/* Announcement banner */}
        <div className="bg-[#2d2312]/80 border border-[#c8a24e]/30 rounded-xl px-6 py-4 mb-6 text-center">
          <div className="text-lg md:text-2xl font-semibold text-[#c8a24e] flex items-center justify-center gap-2">
            <Megaphone size={20} /> {displayMessage}
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col justify-center">
          {/* Active Motion */}
          {activeMotion ? (
            <div className="space-y-6">
              {/* Motion title */}
              <div className="text-center">
                <div className="text-[#8b7a52] text-sm mb-2 flex items-center justify-center gap-1">
                  <Vote size={14} /> ญัตติที่กำลังพิจารณา
                </div>
                <h2 className="text-2xl md:text-4xl font-extrabold text-white mb-2">{activeMotion.title}</h2>
                {activeMotion.description && (
                  <p className="text-[#8b7a52] text-sm md:text-base">{activeMotion.description}</p>
                )}
              </div>

              {/* Countdown */}
              <CountdownTimer endTime={state.countdownEnd} />

              {/* Vote results */}
              {state.votingOpen || totalVotes > 0 ? (
                <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto w-full">
                  {([
                    { label: "เห็นด้วย", key: "AGREE" as VoteChoice, Icon: ThumbsUp, color: "from-green-600 to-green-700", border: "border-green-600", text: "text-green-400" },
                    { label: "ไม่เห็นด้วย", key: "DISAGREE" as VoteChoice, Icon: ThumbsDown, color: "from-red-600 to-red-700", border: "border-red-600", text: "text-red-400" },
                    { label: "งดออกเสียง", key: "ABSTAIN" as VoteChoice, Icon: Hand, color: "from-yellow-600 to-yellow-700", border: "border-yellow-600", text: "text-yellow-400" },
                  ]).map((item) => {
                    const count = votes[item.key] || 0;
                    const percent = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
                    return (
                      <div key={item.key} className={`bg-black/30 border ${item.border}/40 rounded-xl p-6 text-center`}>
                        <item.Icon size={28} className={`mx-auto mb-2 ${item.text}`} />
                        <div className={`text-sm font-semibold ${item.text} mb-1`}>{item.label}</div>
                        <div className={`text-5xl md:text-6xl font-extrabold ${item.text} font-mono`}>{count}</div>
                        {/* Progress bar */}
                        <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
                          <div className={`h-full rounded-full bg-gradient-to-r ${item.color} transition-all duration-700`} style={{ width: `${percent}%` }} />
                        </div>
                        <div className="text-xs text-[#8b7a52] mt-1">{percent}%</div>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {totalVotes > 0 && (
                <div className="text-center text-[#8b7a52] text-sm">
                  รวมทั้งหมด: <span className="text-white font-bold">{totalVotes}</span> เสียง
                </div>
              )}
            </div>
          ) : completedMotions.length > 0 ? (
            /* Show last completed motion results */
            <div className="space-y-6">
              <div className="text-center">
                <div className="text-[#8b7a52] text-sm mb-2">ผลมติล่าสุด</div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-2">
                  {completedMotions[completedMotions.length - 1].title}
                </h2>
              </div>
              {(() => {
                const m = completedMotions[completedMotions.length - 1];
                const v = state.votes[m.id] || { AGREE: 0, DISAGREE: 0, ABSTAIN: 0 };
                const t = v.AGREE + v.DISAGREE + v.ABSTAIN;
                const result = v.AGREE > v.DISAGREE ? "ผ่าน" : v.AGREE < v.DISAGREE ? "ไม่ผ่าน" : "เท่ากัน";
                const resultColor = v.AGREE > v.DISAGREE ? "text-green-400" : v.AGREE < v.DISAGREE ? "text-red-400" : "text-yellow-400";
                return (
                  <div className="text-center space-y-4">
                    <div className={`text-4xl md:text-6xl font-extrabold ${resultColor}`}>{result}</div>
                    <div className="flex justify-center gap-8 text-lg">
                      <span className="text-green-400 flex items-center gap-1"><ThumbsUp size={18} /> {v.AGREE}</span>
                      <span className="text-red-400 flex items-center gap-1"><ThumbsDown size={18} /> {v.DISAGREE}</span>
                      <span className="text-yellow-400 flex items-center gap-1"><Hand size={18} /> {v.ABSTAIN}</span>
                    </div>
                    <div className="text-[#8b7a52] text-sm">รวม {t} เสียง</div>
                  </div>
                );
              })()}
            </div>
          ) : (
            /* Idle state */
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-[#c8a24e]/10 flex items-center justify-center mx-auto mb-4">
                <Inbox size={40} className="text-[#8b7a52]" />
              </div>
              <div className="text-xl text-[#8b7a52]">รอดำเนินการ</div>
            </div>
          )}
        </div>

        {/* Bottom: School logos */}
        <div className="mt-8 pt-6 border-t border-[#c8a24e]/15">
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {state.schools.map((s) => (
              <div key={s.id} className="flex flex-col items-center gap-1" title={s.name}>
                {s.logoUrl ? (
                  <img src={s.logoUrl.replace(/^http:\/\//i, "https://")} alt={s.name} className="w-10 h-10 rounded-full object-contain bg-white/90 border border-[#c8a24e]/30 p-0.5" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#c8a24e]/10 flex items-center justify-center border border-[#c8a24e]/20">
                    <School size={16} className="text-[#8b7a52]" />
                  </div>
                )}
                <span className="text-[9px] text-[#8b7a52] max-w-[60px] text-center leading-tight truncate">{s.name.replace("โรงเรียน", "")}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="h-1.5 bg-gradient-to-r from-transparent via-[#c8a24e] to-transparent" />
    </div>
  );
}

