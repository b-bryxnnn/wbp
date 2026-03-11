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

  const logos = [{ id: -1, name: "โรงเรียนเจ้าภาพ", logoUrl: HOST_LOGO }, ...state.schools];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg, #fffdfa 0%, #f3ebdc 55%, #fffdfa 100%)", fontFamily: "var(--font-sarabun), var(--font-prompt), sans-serif" }}>
      <div className="h-1 bg-gradient-to-r from-transparent via-[#c8a24e] to-transparent" />

      <div className="flex-1 flex flex-col gap-6 p-4 md:p-8">
        {/* Logos at the very top */}
        <div className="card-glass">
          <div className="led-logo-strip">
            {logos.map((s) => (
              <div key={s.id} className="led-logo" title={s.name}>
                {s.logoUrl ? (
                  <img src={s.logoUrl.replace(/^http:\/\//i, "https://")} alt={s.name} />
                ) : (
                  <School size={28} className="text-gold-600" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Status banner */}
        <div className="card-royal flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {state.votingOpen ? (
              <span className="bg-green-50 text-green-800 border border-green-200 px-6 py-3 rounded-full text-lg font-bold flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse" /> เปิดรับโหวต
              </span>
            ) : (
              <span className="bg-red-50 text-red-800 border border-red-200 px-6 py-3 rounded-full text-lg font-bold flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-red-500" /> ปิดรับโหวต
              </span>
            )}
            {state.countdownEnd && state.votingOpen && (
              <div className="text-royal-500 font-semibold hidden md:block">กำลังนับเวลาถอยหลัง</div>
            )}
          </div>
          <div className="flex items-center gap-2 text-royal-500">
            <Megaphone size={18} className="text-gold-600" />
            <span className="font-semibold">{displayMessage}</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center">
          {!state.votingOpen ? (
            <div className="closed-overlay">
              <div>
                <div className="text-4xl md:text-5xl font-extrabold text-royal-900 mb-2">ปิดรับโหวต</div>
                <div className="text-xl md:text-2xl text-royal-600 max-w-3xl mx-auto leading-relaxed">
                  {displayMessage || "โปรดรอผู้ดูแลระบบเปิดรอบถัดไป"}
                </div>
              </div>
            </div>
          ) : activeMotion ? (
            <div className="space-y-8">
              <div className="text-center">
                <h2 className="text-4xl md:text-6xl font-extrabold text-royal-900 mb-3">{activeMotion.title}</h2>
                {activeMotion.description && (
                  <p className="text-gold-700 text-xl md:text-3xl">{activeMotion.description}</p>
                )}
              </div>

              <CountdownTimer endTime={state.countdownEnd} />

              {(state.votingOpen || totalVotes > 0) && (
                <div className={`grid gap-5 max-w-5xl mx-auto w-full`} style={{ gridTemplateColumns: `repeat(${allowedChoices.length}, minmax(0, 1fr))` }}>
                  {allowedChoices.map((key) => {
                    const meta = CHOICE_META[key];
                    if (!meta) return null;
                    const count = votes[key] || 0;
                    const percent = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
                    return (
                      <div key={key} className={`bg-white/90 border ${meta.border}/30 rounded-2xl p-8 md:p-10 text-center shadow-card`}> 
                        <meta.Icon size={44} className={`mx-auto mb-4 ${meta.text}`} />
                        <div className={`text-xl font-bold ${meta.text} mb-3`}>{meta.label}</div>
                        <div className={`text-8xl md:text-9xl font-extrabold ${meta.text} font-mono`}>{count}</div>
                        <div className="mt-5 h-4 rounded-full bg-royal-100 overflow-hidden">
                          <div className={`h-full rounded-full bg-gradient-to-r ${meta.color} transition-all duration-700`} style={{ width: `${percent}%` }} />
                        </div>
                        <div className="text-base text-royal-500 mt-3 font-semibold">{percent}%</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {totalVotes > 0 && (
                <div className="text-center text-royal-700 text-xl">
                  รวมทั้งหมด: <span className="text-royal-900 font-bold text-3xl">{totalVotes}</span> เสียง
                </div>
              )}
            </div>
          ) : (
            <div className="text-center">
              <div className="w-36 h-36 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-8">
                <Inbox size={72} className="text-gold-600" />
              </div>
              <div className="text-3xl text-royal-600">รอดำเนินการ</div>
            </div>
          )}
        </div>
      </div>

      <div className="h-1 bg-gradient-to-r from-transparent via-[#c8a24e] to-transparent" />
    </div>
  );
}
