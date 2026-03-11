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
    motions: [], votes: {}, attendance: {}, bigScreenMessage: "",
    votingOpen: false, activeMotionId: null, countdownEnd: null, schools: [], auditLogs: [],
  });
  const [message, setMessage] = useState("");
  const [motionTitle, setMotionTitle] = useState("");
  const [motionDescription, setMotionDescription] = useState("");
  const [selectedMotion, setSelectedMotion] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(60);
  const [checkInSchool, setCheckInSchool] = useState<number | "">("");
  const [schools, setSchools] = useState<School[]>([]);

  useEffect(() => {
    fetch("/api/socket").then(() => {
      const s = io({ path: "/api/socket" });
      setSocket(s);
      s.on("state:update", (data: State) => setState(data));
    });
  }, []);

  useEffect(() => {
    fetch("/api/schools").then((r) => r.json()).then((data) => setSchools(data.schools || []));
  }, []);

  const sendMessage = () => socket?.emit("admin:screen-control", { message });
  const addMotion = () => {
    if (!motionTitle) return;
    socket?.emit("admin:add-motion", { title: motionTitle, description: motionDescription });
    setMotionTitle(""); setMotionDescription("");
  };
  const toggleVote = (open: boolean) => socket?.emit("admin:toggle-vote", { open, motionId: selectedMotion });
  const setCountdownTimer = () => socket?.emit("admin:set-countdown", { seconds: countdown });
  const checkIn = () => {
    if (!checkInSchool) return;
    socket?.emit("attendance:check-in", { schoolId: Number(checkInSchool) });
  };

  const totalSchools = state.schools.length;
  const presentSchools = Object.values(state.attendance).filter(Boolean).length;

  return (
    <div className="animate-fade-in max-w-6xl mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold text-royal-900">⚙️ หน้าผู้ดูแลระบบ</h2>
        <div className="ornament-divider max-w-xs mx-auto mt-2">
          <div className="diamond" />
        </div>
        <div className="flex justify-center gap-3 mt-4">
          <span className={state.votingOpen ? "badge-success" : "badge-danger"}>
            {state.votingOpen ? "🟢 เปิดรับโหวต" : "🔴 ปิดรับโหวต"}
          </span>
          <span className="badge-gold">
            🏫 องค์ประชุม {presentSchools}/{totalSchools}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ===== ควบคุมหน้าจอใหญ่ ===== */}
        <div className="card-royal">
          <h3 className="section-title mb-4">📺 ควบคุมหน้าจอใหญ่</h3>
          <textarea
            className="input-royal mb-3"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="พิมพ์ข้อความที่ต้องการแสดงบนจอใหญ่..."
          />
          <button className="btn-gold w-full" onClick={sendMessage}>
            📡 อัปเดตข้อความจอใหญ่
          </button>
        </div>

        {/* ===== เช็คชื่อแบบสด ===== */}
        <div className="card-royal">
          <h3 className="section-title mb-4">📋 เช็คชื่อแบบสด</h3>
          <div className="flex gap-3 items-center flex-wrap mb-4">
            <select
              className="input-royal flex-1"
              value={checkInSchool}
              onChange={(e) => setCheckInSchool(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">-- เลือกโรงเรียน --</option>
              {state.schools.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <button className="btn-gold whitespace-nowrap" onClick={checkIn}>
              ✅ เช็คชื่อ
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {state.schools.map((s) => (
              <div
                key={s.id}
                className={`p-2.5 rounded-lg border text-center font-medium transition-all ${
                  state.attendance[s.id]
                    ? "bg-green-50 border-green-300 text-green-800"
                    : "bg-white border-gold/20 text-royal-400"
                }`}
              >
                {state.attendance[s.id] ? "✅" : "⬜"} {s.name}
              </div>
            ))}
          </div>
        </div>

        {/* ===== จัดการญัตติ (full width) ===== */}
        <div className="card-royal lg:col-span-2">
          <h3 className="section-title mb-4">🗳 จัดการญัตติ/มติ</h3>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-3">
              <input
                className="input-royal"
                placeholder="ชื่อญัตติ"
                value={motionTitle}
                onChange={(e) => setMotionTitle(e.target.value)}
              />
              <textarea
                className="input-royal"
                placeholder="คำอธิบาย"
                rows={2}
                value={motionDescription}
                onChange={(e) => setMotionDescription(e.target.value)}
              />
              <button className="btn-gold w-full" onClick={addMotion}>
                ➕ เพิ่มญัตติ
              </button>
            </div>
            <div className="space-y-3">
              <label className="text-sm font-semibold text-royal-600">เลือกญัตติสำหรับการโหวต</label>
              <select
                className="input-royal"
                value={selectedMotion ?? ""}
                onChange={(e) => setSelectedMotion(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">-- เลือกญัตติ --</option>
                {state.motions.map((m) => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
              <div className="grid grid-cols-3 gap-2">
                <button
                  className="px-3 py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all text-sm shadow-sm"
                  onClick={() => toggleVote(true)}
                >
                  🟢 เปิดโหวต
                </button>
                <button
                  className="px-3 py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all text-sm shadow-sm"
                  onClick={() => toggleVote(false)}
                >
                  🔴 ปิดโหวต
                </button>
                <button
                  className="px-3 py-2.5 bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 transition-all text-sm shadow-sm"
                  onClick={setCountdownTimer}
                >
                  ⏱ Countdown
                </button>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-royal-500 whitespace-nowrap">ตั้งเวลา:</label>
                <input
                  type="number"
                  className="input-royal w-24"
                  value={countdown}
                  onChange={(e) => setCountdown(Number(e.target.value))}
                />
                <span className="text-sm text-royal-400">วินาที</span>
              </div>
            </div>
          </div>

          {/* Motions list */}
          {state.motions.length > 0 && (
            <div className="border-t border-gold/20 pt-4 mt-2">
              <p className="text-sm font-semibold text-royal-500 mb-2">ญัตติทั้งหมด ({state.motions.length})</p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {state.motions.map((m) => {
                  const v = state.votes[m.id] || { AGREE: 0, DISAGREE: 0, ABSTAIN: 0 };
                  return (
                    <div key={m.id} className={`flex items-center justify-between p-3 rounded-lg border text-sm ${
                      state.activeMotionId === m.id ? "bg-gold-50 border-gold" : "bg-white border-gold/10"
                    }`}>
                      <div>
                        <span className="font-semibold text-royal-800">{m.title}</span>
                        {state.activeMotionId === m.id && <span className="ml-2 badge-gold text-xs">กำลังใช้งาน</span>}
                      </div>
                      <div className="flex gap-3 text-xs text-royal-500">
                        <span className="text-green-600">👍 {v.AGREE}</span>
                        <span className="text-red-600">👎 {v.DISAGREE}</span>
                        <span className="text-yellow-600">🤚 {v.ABSTAIN}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ===== QR Code ===== */}
        <div className="card-royal lg:col-span-2">
          <h3 className="section-title mb-4">📱 QR เข้าสู่ระบบ (ต่อโรงเรียน)</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {schools.map((s) => {
              const url = typeof window !== "undefined" ? `${window.location.origin}/vote?token=${s.loginToken}` : "";
              return (
                <div key={s.id} className="bg-white rounded-xl border border-gold/20 p-4 text-center space-y-2 hover:shadow-elegant transition-shadow">
                  <div className="font-semibold text-sm text-royal-700">{s.name}</div>
                  <div className="flex justify-center">
                    <QRCode value={url || "loading"} bgColor="#ffffff" fgColor="#2d2312" size={120} />
                  </div>
                  <div className="text-[10px] break-all text-royal-300">{url}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ===== Export ===== */}
        <div className="card-royal">
          <h3 className="section-title mb-4">📊 ออกรายงาน</h3>
          <div className="flex gap-3">
            <a href="/api/export?type=pdf" className="btn-gold flex-1 text-center">📄 Export PDF</a>
            <a href="/api/export?type=excel" className="btn-outline-gold flex-1 text-center">📊 Export Excel</a>
          </div>
        </div>

        {/* ===== Audit Log ===== */}
        <div className="card-royal">
          <h3 className="section-title mb-4">📜 บันทึกการทำงาน</h3>
          <div className="max-h-48 overflow-y-auto space-y-1.5">
            {state.auditLogs.map((log, idx) => (
              <div key={idx} className="flex justify-between bg-cream-50 border border-gold/10 p-2.5 rounded-lg text-sm">
                <span className="text-royal-700">{log.action} {log.detail ? `— ${log.detail}` : ""}</span>
                <span className="text-royal-300 text-xs whitespace-nowrap ml-2">{new Date(log.at).toLocaleTimeString()}</span>
              </div>
            ))}
            {state.auditLogs.length === 0 && <div className="text-royal-300 text-sm text-center py-4">ยังไม่มีบันทึก</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
