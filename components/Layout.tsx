import React from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";

const navItems = [
  { href: "/", label: "หน้าหลัก", icon: "🏛" },
  { href: "/admin", label: "ผู้ดูแลระบบ", icon: "⚙️" },
  { href: "/vote", label: "ลงมติ", icon: "🗳" },
  { href: "/bigscreen", label: "จอแสดงผล", icon: "📺" },
  { href: "/attendance", label: "เช็คชื่อ", icon: "📋" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>ระบบโหวตลงมติ — สหวิทยาเขตวชิรบูรพา</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏛</text></svg>" />
      </Head>

      <div className="min-h-screen flex flex-col">
        {/* ===== Top Gold Bar ===== */}
        <div className="h-1 bg-gradient-to-r from-transparent via-gold to-transparent" />

        {/* ===== Header ===== */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-gold/20 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 no-underline">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-white text-lg font-bold shadow-gold">
                🏛
              </div>
              <div>
                <div className="text-sm font-bold text-royal-800 leading-tight">ระบบโหวตลงมติ</div>
                <div className="text-xs text-royal-400 leading-tight">สหวิทยาเขตวชิรบูรพา</div>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const active = router.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-2 rounded-lg text-sm font-medium no-underline transition-all ${
                      active
                        ? "bg-gold/10 text-gold-700 border border-gold/20"
                        : "text-royal-600 hover:bg-gold/5 hover:text-gold-700"
                    }`}
                  >
                    <span className="mr-1">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Mobile menu */}
            <nav className="flex md:hidden items-center gap-1">
              {navItems.map((item) => {
                const active = router.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`p-2 rounded-lg text-lg no-underline transition-all ${
                      active ? "bg-gold/10" : "hover:bg-gold/5"
                    }`}
                    title={item.label}
                  >
                    {item.icon}
                  </Link>
                );
              })}
            </nav>
          </div>
        </header>

        {/* ===== Main Content ===== */}
        <main className="flex-1 relative">
          {children}
        </main>

        {/* ===== Footer ===== */}
        <footer className="border-t border-gold/20 bg-white/60 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 py-4 text-center">
            <div className="ornament-divider mb-3">
              <div className="diamond" />
            </div>
            <p className="text-xs text-royal-400">
              อบรมโครงการส่งเสริมภาวะผู้นำและศักยภาพสภานักเรียน — โรงเรียนในสหวิทยาเขตวชิรบูรพา
            </p>
            <p className="text-xs text-royal-300 mt-1">
              วันพฤหัสบดี ที่ 12 มีนาคม 2569 ณ โรงเรียนรัตนโกสินทร์สมโภชลาดกระบัง
            </p>
          </div>
        </footer>

        {/* ===== Bottom Gold Bar ===== */}
        <div className="h-1 bg-gradient-to-r from-transparent via-gold to-transparent" />
      </div>
    </>
  );
}
