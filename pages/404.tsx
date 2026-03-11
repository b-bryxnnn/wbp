import React from "react";
import Link from "next/link";
import { Landmark, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="animate-fade-in flex flex-col items-center justify-center py-24 px-4 text-center">
      <Landmark size={64} className="text-gold-400 mb-4" />
      <h2 className="text-4xl font-extrabold text-royal-900 mb-2">404</h2>
      <p className="text-lg text-royal-400 mb-8">ไม่พบหน้าที่ต้องการ</p>
      <div className="ornament-divider max-w-xs mx-auto mb-8">
        <div className="diamond" />
      </div>
      <Link href="/" className="btn-gold text-lg px-8 py-3 flex items-center gap-2">
        <Home size={18} /> กลับหน้าหลัก
      </Link>
    </div>
  );
}
