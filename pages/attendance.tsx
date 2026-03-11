import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { Wifi, WifiOff, School, Users } from "lucide-react";

type SchoolT = { id: number; name: string; loginToken?: string; logoUrl?: string };
type State = {
  attendance: Record<number, boolean>;
  schools: SchoolT[];
  onlineSchools: number[];
};

export default function OnlineStatus() {
  const [state, setState] = useState<State>({ attendance: {}, schools: [], onlineSchools: [] });

  useEffect(() => {
    const s = io({ path: "/api/socket", transports: ["polling"] });
    s.on("state:update", (data: any) => {
      setState({
        attendance: data.attendance || {},
        schools: data.schools || [],
        onlineSchools: data.onlineSchools || [],
      });
    });
    return () => { s.disconnect(); };
  }, []);

  const total = state.schools.length;
  const online = state.onlineSchools.length;

  return (
    <div className="animate-fade-in max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-extrabold text-royal-900 flex items-center justify-center gap-2">
          <Wifi size={24} /> สถานะโรงเรียนออนไลน์
        </h2>
        <div className="ornament-divider max-w-xs mx-auto mt-2">
          <div className="diamond" />
        </div>
      </div>

      {/* Status Card */}
      <div className="card-royal mb-6 text-center py-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-gold/5 to-transparent pointer-events-none" />
        <div className="relative">
          <div className="text-sm text-royal-400 mb-3 flex items-center justify-center gap-1.5">
            <Users size={15} /> เครื่องที่ออนไลน์อยู่
          </div>
          <div className="text-6xl font-extrabold text-royal-900 mb-4">
            {online}<span className="text-3xl text-royal-300">/{total}</span>
          </div>

          <div className="max-w-md mx-auto">
            <div className="vote-bar h-5 rounded-full">
              <div
                className="h-full rounded-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-700"
                style={{ width: `${total ? Math.round((online / total) * 100) : 0}%` }}
              />
            </div>
            <div className="text-sm text-royal-400 mt-2 font-semibold">
              {total ? Math.round((online / total) * 100) : 0}% ออนไลน์
            </div>
          </div>
        </div>
      </div>

      {/* School List */}
      <div className="card-royal">
        <h3 className="section-title mb-5"><School size={16} className="text-gold-600" /> รายชื่อโรงเรียน</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {state.schools.map((s: SchoolT) => {
            const isOnline = state.onlineSchools.includes(s.id);
            return (
              <div
                key={s.id}
                className={`p-4 rounded-xl border text-sm font-medium transition-all flex items-center gap-3 ${
                  isOnline
                    ? "bg-green-50 border-green-300 text-green-800 shadow-sm"
                    : "bg-white border-gold/15 text-royal-300"
                }`}
              >
                {s.logoUrl ? (
                  <img src={s.logoUrl.replace(/^http:\/\//i, "https://")} alt="" className="school-avatar" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
                    <School size={18} className="text-gold-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold leading-tight">{s.name}</div>
                  <div className={`text-xs mt-0.5 ${isOnline ? "text-green-600" : "text-royal-300"}`}>
                    {isOnline ? "ออนไลน์" : "ออฟไลน์"}
                  </div>
                </div>
                {isOnline
                  ? <Wifi size={18} className="text-green-600 flex-shrink-0" />
                  : <WifiOff size={18} className="text-royal-200 flex-shrink-0" />}
              </div>
            );
          })}
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
