import React from 'react';
import { useRouter } from 'next/router';

export default function NotFound() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-darkblue text-gold flex flex-col items-center justify-center">
      <h2 className="text-3xl font-bold mb-4">ไม่พบหน้าที่ต้องการ</h2>
      <button className="px-6 py-3 bg-gold text-darkblue rounded-lg font-semibold shadow-lg hover:bg-yellow-400 transition" onClick={() => router.push('/')}>กลับหน้าหลัก</button>
    </div>
  );
}

