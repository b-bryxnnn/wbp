import Link from "next/link";
import { Landmark, Vote, Monitor, ClipboardList, Calendar, MapPin, Settings } from "lucide-react";

export default function Home() {
  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          {/* Emblem */}
          <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-gradient-to-br from-gold-300 to-gold-600 flex items-center justify-center text-white shadow-gold">
            <Landmark size={30} />
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold text-royal-900 mb-2 leading-tight">
            ระบบโหวตลงมติ
          </h1>
          <h2 className="text-lg md:text-xl font-semibold text-gold-600 mb-2">
            สภานักเรียน
          </h2>

          <div className="ornament-divider max-w-xs mx-auto my-6">
            <div className="diamond" />
          </div>

          <p className="text-royal-600 text-base max-w-2xl mx-auto mb-1 leading-relaxed">
            อบรมโครงการส่งเสริมภาวะผู้นำและศักยภาพสภานักเรียน
          </p>
          <p className="text-royal-400 text-sm mb-10">
            โรงเรียนในสหวิทยาเขตวชิรบูรพา
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/admin" className="btn-gold text-base px-8 py-3 flex items-center gap-2">
              <Settings size={18} /> เข้าสู่หน้าผู้ดูแลระบบ
            </Link>
            <Link href="/vote" className="btn-outline-gold text-base px-8 py-3 flex items-center gap-2">
              <Vote size={18} /> เข้าสู่หน้าลงมติ
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Vote,
              title: "ลงมติแบบ Real-time",
              desc: "โหวตเห็นด้วย ไม่เห็นด้วย หรืองดออกเสียง ผลลัพธ์อัปเดตทันที",
              href: "/vote",
            },
            {
              icon: Monitor,
              title: "จอแสดงผลขนาดใหญ่",
              desc: "แสดงผลโหวต Countdown และสถานะองค์ประชุมบนจอใหญ่",
              href: "/bigscreen",
            },
            {
              icon: ClipboardList,
              title: "เช็คชื่อสด",
              desc: "ตรวจสอบการเข้าร่วมประชุมของแต่ละโรงเรียนแบบ Real-time",
              href: "/attendance",
            },
          ].map((card) => (
            <Link key={card.href} href={card.href} className="no-underline">
              <div className="card-royal h-full flex flex-col items-center text-center p-8 group cursor-pointer">
                <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center text-gold-600 mb-4 group-hover:bg-gold/20 transition-colors">
                  <card.icon size={24} />
                </div>
                <h3 className="text-base font-bold text-royal-800 mb-2">{card.title}</h3>
                <p className="text-sm text-royal-500 leading-relaxed">{card.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Info Banner */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="card-royal text-center py-6">
          <p className="text-royal-600 font-semibold flex items-center justify-center gap-2">
            <Calendar size={16} /> วันพฤหัสบดี ที่ 12 มีนาคม 2569
          </p>
          <p className="text-royal-400 text-sm flex items-center justify-center gap-2 mt-1">
            <MapPin size={14} /> ณ โรงเรียนรัตนโกสินทร์สมโภชลาดกระบัง
          </p>
        </div>
      </section>
    </div>
  );
}
