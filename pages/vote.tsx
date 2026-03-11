import React, { useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";
import QRCode from "react-qr-code";
import { useRouter } from "next/router";

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

export default function Vote() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [state, setState] = useState<State>({ motions: [], votes: {}, attendance: {}, bigScreenMessage: "", votingOpen: false, activeMotionId: null, countdownEnd: null, schools: [] });
  const [schoolId, setSchoolId] = useState<number | "">("");
  const [voter, setVoter] = useState("");
  const [authToken, setAuthToken] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const s = io({ path: "/api/socket" });
    setSocket(s);
    s.on("state:update", (data: State) => setState(data));
    return () => s.disconnect();
  }, []);

  useEffect(() => {
    const token = (router.query.token as string) || localStorage.getItem("auth_token") || null;
    if (!token) return;
    const login = async () => {
      try {
        const res = await fetch(`/api/auth/qr?token=${token}`);
        if (!res.ok) return;
        const data = await res.json();
        setAuthToken(data.token);
        localStorage.setItem("auth_token", data.token);
        setSchoolId(data.school.id);
        setVoter(data.user.name);
      } catch (e) {
        console.error(e);
      }
    };
    login();
  }, [router.query.token]);

  const activeMotion = useMemo(
    () => state.motions.find((m) => m.id === state.activeMotionId) || null,
    [state.motions, state.activeMotionId]
  );

  const castVote = (choice: VoteChoice) => {
    if (!socket || !activeMotion) return;
    socket.emit("vote:cast", {
      motionId: activeMotion.id,
      choice,
      authToken,
      schoolId: schoolId ? Number(schoolId) : undefined,
      voter,
    });
  };

  return (
    <div className="min-h-screen bg-darkblue text-gold flex flex-col items-center py-10 px-4 gap-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">เข้าสู่ระบบด้วย QR Code</h2>
        <p>สแกนเพื่อเข้าสู่ระบบโรงเรียนของคุณ</p>
      </div>
      <div className="bg-graydark p-6 rounded-lg shadow-lg flex flex-col items-center gap-3">
        <QRCode value={`${typeof window !== "undefined" ? window.location.origin : ""}/vote`} bgColor="#0a1a2f" fgColor="#ffd700" size={180} />
        <p className="text-sm text-gold/80">สแกนจาก QR ของโรงเรียน (แสดงบนหน้า Admin)</p>
      </div>

      <div className="bg-graydark p-6 rounded-lg shadow-lg w-full max-w-xl grid gap-3">
        <h3 className="text-xl font-semibold">ข้อมูลผู้ลงมติ</h3>
        <select
          className="bg-darkblue text-gold p-3 rounded"
          value={schoolId}
          onChange={(e) => setSchoolId(e.target.value ? Number(e.target.value) : "")}
        >
          <option value="">-- เลือกโรงเรียน (กรณีไม่ได้สแกน QR) --</option>
          {state.schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <input
          className="bg-darkblue text-gold p-3 rounded"
          placeholder="ชื่อผู้ลงมติ (ถ้ามี)"
          value={voter}
          onChange={(e) => setVoter(e.target.value)}
        />
      </div>

      <div className="bg-graydark p-6 rounded-lg shadow-lg w-full max-w-3xl grid gap-4">
        <h3 className="text-xl font-semibold">ลงมติ</h3>
        {activeMotion ? (
          <div className="space-y-3">
            <div>
              <div className="text-2xl font-bold">{activeMotion.title}</div>
              <div className="text-gold/80 text-sm">{activeMotion.description}</div>
            </div>
            {state.votingOpen ? (
              <div className="grid grid-cols-3 gap-3">
                {(
                  [
                    { label: "เห็นด้วย", choice: "AGREE" },
                    { label: "ไม่เห็นด้วย", choice: "DISAGREE" },
                    { label: "งดออกเสียง", choice: "ABSTAIN" },
                  ] as { label: string; choice: VoteChoice }[]
                ).map((item) => (
                  <button
                    key={item.choice}
                    className="px-4 py-3 bg-gold text-darkblue rounded font-semibold hover:bg-yellow-400"
                    onClick={() => castVote(item.choice)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-gold/70">รอการเปิดรับโหวตจากผู้ดูแลระบบ</div>
            )}
          </div>
        ) : (
          <div className="text-gold/70">ยังไม่มีญัตติที่เปิดอยู่</div>
        )}
      </div>
    </div>
  );
}

