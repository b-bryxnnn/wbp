import React from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { Vote } from "lucide-react";
import { Sarabun, Prompt } from "next/font/google";

const sarabun = Sarabun({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-sarabun",
});

const prompt = Prompt({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-prompt",
});

const HOST_LOGO = "https://upload.wikimedia.org/wikipedia/commons/9/9f/RSL001.png";

const navItems = [
  { href: "/", label: "หน้าหลัก" },
  { href: "/vote", label: "ลงมติ", icon: Vote },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  // Hide layout on LED screen page
  const isLed = router.pathname === "/led";
  if (isLed) {
    return (
      <>
        <Head>
          <title>หน้าจอแสดงผล — สหวิทยาเขตวชิรบูรพา</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
        <div className={`${sarabun.variable} ${prompt.variable}`}>{children}</div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>สภานักเรียน — สหวิทยาเขตวชิรบูรพา</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><rect width='16' height='16' rx='3' fill='%23c8a24e'/><text x='3' y='13' font-size='12' fill='white'>V</text></svg>"
        />
      </Head>

      <div className={`min-h-screen flex flex-col ${sarabun.variable} ${prompt.variable}`}>
        {/* Top Gold Bar */}
        <div className="h-1 bg-gradient-to-r from-transparent via-gold to-transparent" />

        {/* Header */}
        <header className="bg-white/90 backdrop-blur-md border-b border-gold/15 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 no-underline group">
              <img
                src={HOST_LOGO}
                alt="ตราสัญลักษณ์"
                className="w-10 h-10 object-contain group-hover:scale-105 transition-transform"
              />
              <div>
                <div className="text-sm font-bold text-royal-800 leading-tight">สภานักเรียน</div>
                <div className="text-xs text-royal-400 leading-tight">สหวิทยาเขตวชิรบูรพา</div>
              </div>
            </Link>

            <nav className="flex items-center gap-1">
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
                    {Icon && <Icon size={15} />}
                    <span className="hidden sm:inline">{item.label}</span>
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
