import React from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { Landmark, Settings, Vote, Monitor, ClipboardList } from "lucide-react";

const navItems = [
  { href: "/", label: "หน้าหลัก", icon: Landmark },
  { href: "/admin", label: "ผู้ดูแลระบบ", icon: Settings },
  { href: "/vote", label: "ลงมติ", icon: Vote },
  { href: "/bigscreen", label: "จอแสดงผล", icon: Monitor },
  { href: "/attendance", label: "เช็คชื่อ", icon: ClipboardList },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>ระบบโหวตลงมติ — สหวิทยาเขตวชิรบูรพา</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&family=Prompt:wght@300;400;500;600;700&display=swap"
        />
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><rect width='16' height='16' rx='3' fill='%23c8a24e'/><text x='3' y='13' font-size='12' fill='white'>V</text></svg>"
        />
      </Head>

      <div className="min-h-screen flex flex-col">
        {/* Top Gold Bar */}
        <div className="h-1 bg-gradient-to-r from-transparent via-gold to-transparent" />

        {/* Header */}
        <header className="bg-white/90 backdrop-blur-md border-b border-gold/15 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 no-underline group">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-white shadow-sm group-hover:shadow-gold transition-shadow">
                <Landmark size={20} />
              </div>
              <div>
                <div className="text-sm font-bold text-royal-800 leading-tight">ระบบโหวตลงมติ</div>
                <div className="text-xs text-royal-400 leading-tight">สหวิทยาเขตวชิรบูรพา</div>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const active = router.pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium no-underline transition-all flex items-center gap-1.5 ${
                      active
                        ? "bg-gradient-to-r from-gold/10 to-gold/5 text-gold-700 border border-gold/20 shadow-sm"
                        : "text-royal-500 hover:bg-gold/5 hover:text-gold-700"
                    }`}
                  >
                    <Icon size={15} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Mobile nav */}
            <nav className="flex md:hidden items-center gap-0.5">
              {navItems.map((item) => {
                const active = router.pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`p-2.5 rounded-lg no-underline transition-all ${
                      active ? "bg-gold/10 text-gold-700 shadow-sm" : "text-royal-400 hover:bg-gold/5"
                    }`}
                    title={item.label}
                  >
                    <Icon size={18} />
                  </Link>
                );
              })}
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1">{children}</main>

        {/* Footer */}
        <footer className="border-t border-gold/15 bg-white/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 py-5 text-center">
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

        {/* Bottom Gold Bar */}
        <div className="h-1 bg-gradient-to-r from-transparent via-gold to-transparent" />
      </div>
    </>
  );
}
