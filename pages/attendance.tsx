import React, { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

type School = { id: number; name: string; loginToken?: string };
type State = { attendance: Record<number, boolean>; schools: School[] };

export default function Attendance() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [state, setState] = useState<State>({ attendance: {}, schools: [] });

  useEffect(() => {
    const s = io({ path: "/api/socket" });
    setSocket(s);
    s.on("state:update", (data: any) => {
      setState({ attendance: data.attendance || {}, schools: data.schools || [] });
    });
    return () => { s.disconnect(); };
  }, []);

  const total = state.schools.length;
  const present = Object.values(state.attendance).filter(Boolean).length;
  const percent = total ? Math.round((present / total) * 100) : 0;

  return (
    <div className="animate-fade-in max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold text-royal-900">📋 เช็คชื่อแบบสด</h2>
        <div className="ornament-divider max-w-xs mx-auto mt-2">
          <div className="diamond" />
        </div>
      </div>

      {/* Quorum Card */}
      <div className="card-royal mb-6 text-center">
        <div className="text-sm text-royal-400 mb-2">องค์ประชุม</div>
        <div className="text-5xl font-extrabold text-royal-900 mb-3">
          {present}<span className="text-3xl text-royal-300">/{total}</span>
        </div>

        {/* Progress bar */}
        <div className="max-w-md mx-auto">
          <div className="vote-bar h-4 rounded-full">
            <div
              className="h-full rounded-full bg-gradient-to-r from-gold-400 to-gold-600 transition-all duration-700"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="text-sm text-royal-400 mt-2">{percent}% เข้าร่วมแล้ว</div>
        </div>
      </div>

      {/* School List */}
      <div className="card-royal">
        <h3 className="section-title mb-4">🏫 รายชื่อโรงเรียน</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {state.schools.map((s: School) => (
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
          {state.schools.length === 0 && (
            <div className="col-span-full text-center py-8 text-royal-300">ยังไม่มีรายชื่อโรงเรียน</div>
          )}
        </div>
      </div>
    </div>
  );
}
