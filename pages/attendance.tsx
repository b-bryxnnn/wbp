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
    return () => s.disconnect();
  }, []);

  const total = state.schools.length;
  const present = Object.values(state.attendance).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-darkblue text-gold flex flex-col items-center py-10 px-4">
      <h2 className="text-3xl font-bold mb-4">เช็คชื่อแบบสด</h2>
      <div className="bg-graydark p-8 rounded-lg shadow-lg w-full max-w-3xl grid gap-4">
        <div className="text-xl">องค์ประชุม: {present}/{total} โรงเรียน</div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-sm">
          {state.schools.map((s: School) => (
            <div key={s.id} className={`p-2 rounded ${state.attendance[s.id] ? "bg-green-700" : "bg-darkblue"}`}>
              {s.name} {state.attendance[s.id] ? "✅" : "⬜"}
            </div>
          ))}
          {state.schools.length === 0 && <div>ยังไม่มีรายชื่อโรงเรียน</div>}
        </div>
      </div>
    </div>
  );
}

