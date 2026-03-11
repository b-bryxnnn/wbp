import React, { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import {
  Megaphone, Timer, School,
  ThumbsUp, ThumbsDown, Hand, Inbox, BookCheck, FileCheck2,
} from "lucide-react";

const CHOICE_META: Record<string, { label: string; Icon: any; color: string; border: string; text: string }> = {
  AGREE: { label: "เห็นด้วย", Icon: ThumbsUp, color: "from-green-600 to-green-700", border: "border-green-600", text: "text-green-400" },
  DISAGREE: { label: "ไม่เห็นด้วย", Icon: ThumbsDown, color: "from-red-600 to-red-700", border: "border-red-600", text: "text-red-400" },
  ABSTAIN: { label: "งดออกเสียง", Icon: Hand, color: "from-yellow-600 to-yellow-700", border: "border-yellow-600", text: "text-yellow-400" },
  ACKNOWLEDGE: { label: "รับทราบ", Icon: BookCheck, color: "from-blue-600 to-blue-700", border: "border-blue-600", text: "text-blue-400" },
  RESOLUTION: { label: "มติ", Icon: FileCheck2, color: "from-purple-600 to-purple-700", border: "border-purple-600", text: "text-purple-400" },
};

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
      <div className="text-lg opacity-70 mb-3 flex items-center justify-center gap-2"><Timer size={22} /> เวลาที่เหลือ</div>
      <div className="text-9xl md:text-[14rem] font-extrabold font-mono tracking-wider leading-none">{min}:{sec}</div>
    </div>
  );
}

// Host school logo
const HOST_LOGO = "https://upload.wikimedia.org/wikipedia/commons/9/9f/RSL001.png";

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

  const allowedChoices = activeMotion?.allowedChoices || ["AGREE", "DISAGREE", "ABSTAIN"];
  const votes = activeMotion ? state.votes[activeMotion.id] || {} : {};
  const totalVotes = allowedChoices.reduce((sum, k) => sum + (votes[k] || 0), 0);
  const displayMessage = liveMessage || state.bigScreenMessage || "ยินดีต้อนรับ";

  // Completed motions (have votes, not currently active)
  const completedMotions = state.motions.filter((m) => {
    const v = state.votes[m.id];
    if (!v) return false;
    const total = Object.values(v).reduce((s: number, n: any) => s + (n || 0), 0);
    return total > 0 && m.id !== state.activeMotionId;
  });

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #1a1207 0%, #2d2312 50%, #1a1207 100%)", fontFamily: "var(--font-sarabun), var(--font-prompt), sans-serif" }}>
      {/* Header bar */}
      <div className="h-2 bg-gradient-to-r from-transparent via-[#c8a24e] to-transparent" />

      <div className="flex-1 flex flex-col p-6 md:p-10">
        {/* Top: Logo row — only host school logo, no text */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <img src={HOST_LOGO} alt="ตราโรงเรียน" className="w-20 h-20 md:w-24 md:h-24 object-contain drop-shadow-lg" />
          </div>
          <div className="flex items-center gap-3">
            {state.votingOpen ? (
              <span className="bg-green-900/50 text-green-400 border border-green-700 px-8 py-3 rounded-full text-xl font-bold flex items-center gap-3">
                <span className="w-4 h-4 rounded-full bg-green-400 animate-pulse" /> เปิดรับโหวต
              </span>
            ) : (
              <span className="bg-red-900/30 text-red-400 border border-red-800 px-8 py-3 rounded-full text-xl font-bold flex items-center gap-3">
                <span className="w-4 h-4 rounded-full bg-red-500" /> ปิดรับโหวต
              </span>
            )}
          </div>
        </div>

        {/* Announcement banner */}
        <div className="bg-[#2d2312]/80 border border-[#c8a24e]/30 rounded-2xl px-8 py-6 mb-8 text-center">
          <div className="text-3xl md:text-5xl font-bold text-[#c8a24e] flex items-center justify-center gap-4">
            <Megaphone size={36} className="flex-shrink-0" /> {displayMessage}
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col justify-center">
          {/* Active Motion */}
          {activeMotion ? (
            <div className="space-y-8">
              {/* Motion title */}
              <div className="text-center">
                <h2 className="text-5xl md:text-7xl font-extrabold text-white mb-4">{activeMotion.title}</h2>
                {activeMotion.description && (
                  <p className="text-[#c8a24e] text-xl md:text-3xl">{activeMotion.description}</p>
                )}
              </div>

              {/* Countdown */}
              <CountdownTimer endTime={state.countdownEnd} />

              {/* Vote results */}
              {(state.votingOpen || totalVotes > 0) && (
                <div className={`grid gap-5 max-w-5xl mx-auto w-full`} style={{ gridTemplateColumns: `repeat(${allowedChoices.length}, minmax(0, 1fr))` }}>
                  {allowedChoices.map((key) => {
                    const meta = CHOICE_META[key];
                    if (!meta) return null;
                    const count = votes[key] || 0;
                    const percent = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
                    return (
                      <div key={key} className={`bg-black/30 border ${meta.border}/40 rounded-2xl p-8 md:p-10 text-center`}>
                        <meta.Icon size={44} className={`mx-auto mb-4 ${meta.text}`} />
                        <div className={`text-xl font-bold ${meta.text} mb-3`}>{meta.label}</div>
                        <div className={`text-8xl md:text-9xl font-extrabold ${meta.text} font-mono`}>{count}</div>
                        {/* Progress bar */}
                        <div className="mt-5 h-4 rounded-full bg-white/10 overflow-hidden">
                          <div className={`h-full rounded-full bg-gradient-to-r ${meta.color} transition-all duration-700`} style={{ width: `${percent}%` }} />
                        </div>
                        <div className="text-base text-[#8b7a52] mt-3 font-semibold">{percent}%</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {totalVotes > 0 && (
                <div className="text-center text-[#c8a24e] text-xl">
                  รวมทั้งหมด: <span className="text-white font-bold text-3xl">{totalVotes}</span> เสียง
                </div>
              )}
            </div>
          ) : completedMotions.length > 0 ? (
            /* Show last completed motion results */
            (() => {
              const m = completedMotions[completedMotions.length - 1];
              const mChoices = m.allowedChoices || ["AGREE", "DISAGREE", "ABSTAIN"];
              const v = state.votes[m.id] || {};
              const t = mChoices.reduce((s, k) => s + (v[k] || 0), 0);
              const agree = v["AGREE"] || 0;
              const disagree = v["DISAGREE"] || 0;
              const result = agree > disagree ? "ผ่าน" : agree < disagree ? "ไม่ผ่าน" : "เท่ากัน";
              const resultColor = agree > disagree ? "text-green-400" : agree < disagree ? "text-red-400" : "text-yellow-400";
              return (
                <div className="space-y-8">
                  <div className="text-center">
                    <div className="text-[#8b7a52] text-xl mb-4">ผลมติล่าสุด</div>
                    <h2 className="text-4xl md:text-6xl font-extrabold text-white mb-4">{m.title}</h2>
                  </div>
                  <div className="text-center space-y-8">
                    <div className={`text-7xl md:text-9xl font-extrabold ${resultColor}`}>{result}</div>
                    <div className="flex justify-center gap-12 text-2xl">
                      {mChoices.map((k) => {
                        const meta = CHOICE_META[k];
                        if (!meta) return null;
                        return (
                          <span key={k} className={`${meta.text} flex items-center gap-3`}>
                            <meta.Icon size={28} /> {v[k] || 0}
                          </span>
                        );
                      })}
                    </div>
                    <div className="text-[#8b7a52] text-xl">รวม {t} เสียง</div>
                  </div>
                </div>
              );
            })()
          ) : (
            /* Idle state */
            <div className="text-center">
              <div className="w-36 h-36 rounded-full bg-[#c8a24e]/10 flex items-center justify-center mx-auto mb-8">
                <Inbox size={72} className="text-[#8b7a52]" />
              </div>
              <div className="text-3xl text-[#8b7a52]">รอดำเนินการ</div>
            </div>
          )}
        </div>

        {/* Bottom: School logos — no frames, no names */}
        <div className="mt-8 pt-6 border-t border-[#c8a24e]/15">
          <div className="flex flex-wrap items-center justify-center gap-5">
            {state.schools.map((s) => (
              <div key={s.id} title={s.name}>
                {s.logoUrl ? (
                  <img src={s.logoUrl.replace(/^http:\/\//i, "https://")} alt={s.name} className="w-14 h-14 md:w-16 md:h-16 object-contain drop-shadow-md" />
                ) : (
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-[#c8a24e]/10 flex items-center justify-center">
                    <School size={24} className="text-[#8b7a52]" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="h-2 bg-gradient-to-r from-transparent via-[#c8a24e] to-transparent" />
    </div>
  );
}
