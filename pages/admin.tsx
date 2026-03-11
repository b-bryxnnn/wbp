import React, { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import QRCode from "react-qr-code";

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
  auditLogs: { action: string; detail?: string; at: number }[];
};

export default function Admin() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [state, setState] = useState<State>({
    motions: [],
    votes: {},
    attendance: {},
    bigScreenMessage: "",
    votingOpen: false,
    activeMotionId: null,
    countdownEnd: null,
    schools: [],
    auditLogs: [],
  });

  const [message, setMessage] = useState("ขณะนี้อยู่ในระหว่างการขอมติรับรอง...");
  const [motionTitle, setMotionTitle] = useState("");
  const [motionDescription, setMotionDescription] = useState("");
  const [countdownSec, setCountdownSec] = useState(60);
  const [selectedMotion, setSelectedMotion] = useState<number | null>(null);
  const [checkInSchool, setCheckInSchool] = useState<number | "">("");
  const [schools, setSchools] = useState<School[]>([]);

  useEffect(() => {
    fetch("/api/schools").then((r) => r.json()).then((data) => setSchools(data.schools || []));
  }, []);

  useEffect(() => {
    const s = io({ path: "/api/socket" });
    setSocket(s);
    s.on("state:update", (data: State) => {
      setState(data);
      if (data.activeMotionId) setSelectedMotion(data.activeMotionId);
    });
    return () => {
      s.disconnect();
    };
  }, []);

  const addMotion = () => {
    if (!motionTitle.trim()) return;
    socket?.emit("admin:add-motion", { title: motionTitle, description: motionDescription });
    setMotionTitle("");
    setMotionDescription("");
  };

  const sendMessage = () => {
    socket?.emit("admin:screen-control", { message });
  };

  const toggleVote = () => {
    socket?.emit("admin:toggle-vote", { open: !state.votingOpen, motionId: selectedMotion });
  };

  const setCountdown = () => {
    if (countdownSec <= 0) return;
    socket?.emit("admin:set-countdown", { seconds: countdownSec });
  };

  const checkIn = () => {
    if (!checkInSchool) return;
    socket?.emit("attendance:check-in", { schoolId: Number(checkInSchool) });
  };

  const totalSchools = state.schools.length;
  const presentSchools = Object.values(state.attendance).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-darkblue text-gold flex flex-col items-center py-10 px-4">
      <h2 className="text-3xl font-bold mb-4">หน้าผู้ดูแลระบบ</h2>
      <div className="grid gap-6 w-full max-w-5xl">
        <section className="bg-graydark p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold mb-3">ควบคุมหน้าจอใหญ่</h3>
          <textarea
            className="w-full bg-darkblue text-gold p-3 rounded mb-3"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button className="px-4 py-2 bg-gold text-darkblue rounded font-semibold" onClick={sendMessage}>
            อัปเดตข้อความจอใหญ่
          </button>
        </section>

        <section className="bg-graydark p-6 rounded-lg shadow-lg grid gap-3">
          <h3 className="text-xl font-semibold">จัดการญัตติ/มติ</h3>
          <input
            className="w-full bg-darkblue text-gold p-3 rounded"
            placeholder="ชื่อญัตติ"
            value={motionTitle}
            onChange={(e) => setMotionTitle(e.target.value)}
          />
          <textarea
            className="w-full bg-darkblue text-gold p-3 rounded"
            placeholder="คำอธิบาย"
            rows={2}
            value={motionDescription}
            onChange={(e) => setMotionDescription(e.target.value)}
          />
          <button className="px-4 py-2 bg-gold text-darkblue rounded font-semibold" onClick={addMotion}>
            เพิ่มญัตติ
          </button>

          <div className="mt-4">
            <label className="block mb-2">เลือกญัตติสำหรับการโหวต</label>
            <select
              className="w-full bg-darkblue text-gold p-3 rounded"
              value={selectedMotion ?? ""}
              onChange={(e) => setSelectedMotion(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">-- เลือกญัตติ --</option>
              {state.motions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 items-center flex-wrap">
            <select
              className="bg-darkblue text-gold p-3 rounded"
              value={checkInSchool}
              onChange={(e) => setCheckInSchool(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">-- เลือกโรงเรียน --</option>
              {state.schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button className="px-4 py-2 bg-gold text-darkblue rounded font-semibold" onClick={checkIn}>
              เช็คชื่อเข้า
            </button>
            <span className="text-sm text-gold/80">
              เข้าร่วมแล้ว: {presentSchools}/{totalSchools} โรงเรียน
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {state.schools.map((s) => (
              <div key={s.id} className={`p-2 rounded ${state.attendance[s.id] ? "bg-green-700" : "bg-darkblue"}`}>
                {s.name} {state.attendance[s.id] ? "✅" : "⬜"}
              </div>
            ))}
          </div>
          </div>

        <section className="bg-graydark p-6 rounded-lg shadow-lg grid gap-3">
          <h3 className="text-xl font-semibold">QR เข้าสู่ระบบ (ต่อโรงเรียน)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {schools.map((s) => {
              const url = typeof window !== "undefined" ? `${window.location.origin}/vote?token=${s.loginToken}` : `https://example.com/vote?token=${s.loginToken}`;
              return (
                <div key={s.id} className="p-3 bg-darkblue rounded text-center space-y-2">
                  <div className="font-semibold">{s.name}</div>
                  <QRCode value={url} bgColor="#0a1a2f" fgColor="#ffd700" size={140} />
                  <div className="text-xs break-all text-gold/70">{url}</div>
                </div>
              );
            })}
          </div>
        </section>
        </section>

        <section className="bg-graydark p-6 rounded-lg shadow-lg grid gap-3">
          <h3 className="text-xl font-semibold">เช็คชื่อแบบสด</h3>
          <div className="flex gap-3 items-center flex-wrap">
            <select
              className="bg-darkblue text-gold p-3 rounded"
              value={checkInSchool}
              onChange={(e) => setCheckInSchool(e.target.value)}
            >
              <option value="">-- เลือกโรงเรียน --</option>
              {state.schools.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button className="px-4 py-2 bg-gold text-darkblue rounded font-semibold" onClick={checkIn}>
              เช็คชื่อเข้า
            </button>
            <span className="text-sm text-gold/80">
              เข้าร่วมแล้ว: {presentSchools}/{totalSchools} โรงเรียน
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {state.schools.map((s) => (
              <div key={s} className={`p-2 rounded ${state.attendance[s] ? "bg-green-700" : "bg-darkblue"}`}>
                {s} {state.attendance[s] ? "✅" : "⬜"}
              </div>
            ))}
          </div>
        </section>

        <section className="bg-graydark p-6 rounded-lg shadow-lg grid gap-2">
          <h3 className="text-xl font-semibold">บันทึกการทำงาน (Audit Log)</h3>
          <div className="max-h-48 overflow-y-auto text-sm space-y-1">
            {state.auditLogs.map((log, idx) => (
              <div key={idx} className="flex justify-between bg-darkblue p-2 rounded">
                <span>{log.action} {log.detail ? `- ${log.detail}` : ""}</span>
                <span className="text-gold/70">{new Date(log.at).toLocaleTimeString()}</span>
              </div>
            ))}
            {state.auditLogs.length === 0 && <div>ยังไม่มีบันทึก</div>}
          </div>
        </section>
      </div>
    </div>
  );
}

