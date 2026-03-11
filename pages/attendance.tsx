import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { ClipboardList, School, CheckCircle, Square, Users } from "lucide-react";

type SchoolT = { id: number; name: string; loginToken?: string; logoUrl?: string };
type State = { attendance: Record<number, boolean>; schools: SchoolT[] };

export default function Attendance() {
  const [state, setState] = useState<State>({ attendance: {}, schools: [] });

  useEffect(() => {
    const s = io({ path: "/api/socket" });
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
        <h2 className="text-2xl font-extrabold text-royal-900 flex items-center justify-center gap-2">
          <ClipboardList size={24} /> เช็คชื่อแบบสด
        </h2>
        <div className="ornament-divider max-w-xs mx-auto mt-2">
          <div className="diamond" />
        </div>
      </div>

      {/* Quorum Card */}
      <div className="card-royal mb-6 text-center py-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-gold/5 to-transparent pointer-events-none" />
        <div className="relative">
          <div className="text-sm text-royal-400 mb-3 flex items-center justify-center gap-1.5">
            <Users size={15} /> องค์ประชุม
          </div>
          <div className="text-6xl font-extrabold text-royal-900 mb-4">
            {present}<span className="text-3xl text-royal-300">/{total}</span>
          </div>

          {/* Progress bar */}
          <div className="max-w-md mx-auto">
            <div className="vote-bar h-5 rounded-full">
              <div
                className="h-full rounded-full bg-gradient-to-r from-gold-400 to-gold-600 transition-all duration-700"
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="text-sm text-royal-400 mt-2 font-semibold">{percent}% เข้าร่วมแล้ว</div>
          </div>
        </div>
      </div>

      {/* School List */}
      <div className="card-royal">
        <h3 className="section-title mb-5"><School size={16} className="text-gold-600" /> รายชื่อโรงเรียน</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {state.schools.map((s: SchoolT) => (
            <div
              key={s.id}
              className={`p-4 rounded-xl border text-sm font-medium transition-all flex items-center gap-3 ${
                state.attendance[s.id]
                  ? "bg-green-50 border-green-300 text-green-800 shadow-sm"
                  : "bg-white border-gold/15 text-royal-300"
              }`}
            >
              {s.logoUrl ? (
                <img src={s.logoUrl} alt="" className="school-avatar" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
                  <School size={18} className="text-gold-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-semibold leading-tight">{s.name}</div>
                <div className={`text-xs mt-0.5 ${state.attendance[s.id] ? "text-green-600" : "text-royal-300"}`}>
                  {state.attendance[s.id] ? "เข้าร่วมแล้ว" : "ยังไม่เข้าร่วม"}
                </div>
              </div>
              {state.attendance[s.id] ? <CheckCircle size={18} className="text-green-600 flex-shrink-0" /> : <Square size={18} className="text-royal-200 flex-shrink-0" />}
            </div>
          ))}
          {state.schools.length === 0 && (
            <div className="col-span-full text-center py-10">
              <div className="w-16 h-16 rounded-full bg-cream-100 flex items-center justify-center mx-auto mb-3">
                <School size={28} className="text-royal-300" />
              </div>
              <div className="text-royal-300 font-medium">ยังไม่มีรายชื่อโรงเรียน</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
