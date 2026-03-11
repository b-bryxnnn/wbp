import Link from "next/link";

export default function Home() {
  return (
    <div className="animate-fade-in">
      {/* ===== Hero Section ===== */}
      <section className="relative overflow-hidden py-16 md:py-24 pattern-bg">
        {/* Decorative circles */}
        <div className="absolute top-10 left-10 w-40 h-40 rounded-full bg-gold/5 blur-3xl" />
        <div className="absolute bottom-10 right-10 w-56 h-56 rounded-full bg-gold/5 blur-3xl" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          {/* Emblem */}
          <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-gradient-to-br from-gold-300 to-gold-600 flex items-center justify-center text-4xl shadow-gold-lg">
            🏛
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold text-royal-900 mb-3 leading-tight">
            ระบบโหวตลงมติ
          </h1>
          <h2 className="text-xl md:text-2xl font-semibold text-gold-600 mb-2">
            สภานักเรียน
          </h2>

          <div className="ornament-divider max-w-xs mx-auto my-6">
            <div className="diamond" />
          </div>

          <p className="text-royal-600 text-base md:text-lg max-w-2xl mx-auto mb-2 leading-relaxed">
            อบรมโครงการส่งเสริมภาวะผู้นำและศักยภาพสภานักเรียน
          </p>
          <p className="text-royal-400 text-sm md:text-base mb-10">
            โรงเรียนในสหวิทยาเขตวชิรบูรพา
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/admin" className="btn-gold text-lg px-8 py-3">
              ⚙️ เข้าสู่หน้าผู้ดูแลระบบ
            </Link>
            <Link href="/vote" className="btn-outline-gold text-lg px-8 py-3">
              🗳 เข้าสู่หน้าลงมติ
            </Link>
          </div>
        </div>
      </section>

      {/* ===== Feature Cards ===== */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: "🗳",
              title: "ลงมติแบบ Real-time",
              desc: "โหวตเห็นด้วย ไม่เห็นด้วย หรืองดออกเสียง ผลลัพธ์อัปเดตทันที",
              href: "/vote",
            },
            {
              icon: "📺",
              title: "จอแสดงผลขนาดใหญ่",
              desc: "แสดงผลโหวต Countdown และสถานะองค์ประชุมบนจอใหญ่",
              href: "/bigscreen",
            },
            {
              icon: "📋",
              title: "เช็คชื่อสด",
              desc: "ตรวจสอบการเข้าร่วมประชุมของแต่ละโรงเรียนแบบ Real-time",
              href: "/attendance",
            },
          ].map((card) => (
            <Link key={card.href} href={card.href} className="no-underline">
              <div className="card-royal h-full flex flex-col items-center text-center p-8 group cursor-pointer">
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">
                  {card.icon}
                </div>
                <h3 className="text-lg font-bold text-royal-800 mb-2">{card.title}</h3>
                <p className="text-sm text-royal-500 leading-relaxed">{card.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ===== Info Banner ===== */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="card-royal text-center py-8">
          <p className="text-royal-600 font-semibold text-lg mb-1">📅 วันพฤหัสบดี ที่ 12 มีนาคม 2569</p>
          <p className="text-royal-400">ณ โรงเรียนรัตนโกสินทร์สมโภชลาดกระบัง</p>
        </div>
      </section>
    </div>
  );
}
