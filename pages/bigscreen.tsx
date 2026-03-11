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
    return () => {
      clearInterval(timer);
      s.disconnect();
    };
  }, []);

  const activeMotion = useMemo(
    () => state.motions.find((m) => m.id === state.activeMotionId) || null,
    [state.motions, state.activeMotionId]
  );

  const countdownDisplay = useMemo(() => {
    if (!state.countdownEnd) return "--";
    const diff = Math.max(0, Math.floor((state.countdownEnd - now) / 1000));
    const min = Math.floor(diff / 60)
      .toString()
      .padStart(2, "0");
    const sec = (diff % 60).toString().padStart(2, "0");
    return `${min}:${sec}`;
  }, [state.countdownEnd, now]);

  const totalSchools = state.schools.length;
  const presentSchools = Object.values(state.attendance).filter(Boolean).length;

  const votes = activeMotion ? state.votes[activeMotion.id] || { AGREE: 0, DISAGREE: 0, ABSTAIN: 0 } : { AGREE: 0, DISAGREE: 0, ABSTAIN: 0 };
  const totalVotes = votes.AGREE + votes.DISAGREE + votes.ABSTAIN;

  return (
    <div className="min-h-screen bg-darkblue text-gold flex flex-col items-center py-10 px-4">
      <div className="text-center mb-6">
        <h2 className="text-4xl font-bold">หน้าจอแสดงผลขนาดใหญ่</h2>
        <p className="text-gold/80 mt-2">ข้อมูลปรับปรุงแบบ Real-time</p>
      </div>

      <div className="w-full max-w-6xl grid gap-6">
        <div className="bg-graydark p-6 rounded-lg shadow-lg">
          <h3 className="text-2xl font-semibold mb-2">ข้อความประกาศ</h3>
          <p className="text-xl">{liveMessage || state.bigScreenMessage}</p>
        </div>

        <div className="bg-graydark p-6 rounded-lg shadow-lg grid gap-3">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-lg text-gold/80">Countdown</div>
              <div className="text-3xl font-bold">{countdownDisplay}</div>
            </div>
            <div className="text-right">
              <div className="text-lg text-gold/80">องค์ประชุม</div>
              <div className="text-3xl font-bold">{presentSchools}/{totalSchools}</div>
            </div>
          </div>
          <div className="text-sm text-gold/70">สถานะโหวต: {state.votingOpen ? "เปิดรับ" : "ปิดรับ"}</div>
        </div>

        <div className="bg-graydark p-6 rounded-lg shadow-lg grid gap-4">
          <h3 className="text-2xl font-semibold">ผลโหวต</h3>
          {activeMotion ? (
            <div className="space-y-3">
              <div>
                <div className="text-xl font-bold">{activeMotion.title}</div>
                <div className="text-gold/80 text-sm">{activeMotion.description}</div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                {(
                  [
                    { label: "เห็นด้วย", key: "AGREE", color: "bg-green-700" },
                    { label: "ไม่เห็นด้วย", key: "DISAGREE", color: "bg-red-700" },
                    { label: "งดออกเสียง", key: "ABSTAIN", color: "bg-yellow-600" },
                  ] as { label: string; key: VoteChoice; color: string }[]
                ).map((item) => {
                  const count = votes[item.key] || 0;
                  const percent = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
                  return (
                    <div key={item.key} className={`p-4 rounded ${item.color}`}>
                      <div className="text-lg font-bold">{item.label}</div>
                      <div className="text-3xl font-extrabold">{count}</div>
                      <div className="text-gold/80">{percent}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-gold/70">ยังไม่มีญัตติที่กำลังแสดง</div>
          )}
        </div>

        <div className="bg-graydark p-6 rounded-lg shadow-lg">
          <h3 className="text-2xl font-semibold mb-3">สถานะโรงเรียน</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-sm">
            {state.schools.map((s) => (
              <div key={s.id} className={`p-2 rounded ${state.attendance[s.id] ? "bg-green-700" : "bg-darkblue"}`}>
                {s.name} {state.attendance[s.id] ? "✅" : "⬜"}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

