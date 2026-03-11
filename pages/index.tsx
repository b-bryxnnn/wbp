import Link from "next/link";
import { Landmark, Vote, Monitor, ClipboardList, Calendar, MapPin, Settings, Users, Shield } from "lucide-react";

const schoolLogos = [
  { name: "เตรียมอุดมฯ สุวรรณภูมิ", url: "https://upload.wikimedia.org/wikipedia/commons/4/47/Phra_Kiao_Triamnom_Colored.png" },
  { name: "นวมินทราชินูทิศ เตรียมอุดมฯ น้อมเกล้า", url: "https://fth1.com/uppic/10106510/news/10106510_0_20231130-104017.jpg" },
  { name: "พรตพิทยพยัต", url: "https://prot.ac.th/_files_school/10105750/workstudent/10105750_0_20151212-184742.png" },
  { name: "รัตนโกสินทร์สมโภชลาดกระบัง", url: "https://upload.wikimedia.org/wikipedia/commons/9/9f/RSL001.png" },
  { name: "บดินทรเดชา 4", url: "https://upload.wikimedia.org/wikipedia/th/thumb/f/fc/%E0%B8%95%E0%B8%A3%E0%B8%B2%E0%B8%9E%E0%B8%A3%E0%B8%B0%E0%B9%80%E0%B8%81%E0%B8%B5%E0%B9%89%E0%B8%A2%E0%B8%A7_%E0%B8%9A.%E0%B8%94.%E0%B9%94.png/250px-%E0%B8%95%E0%B8%A3%E0%B8%B2%E0%B8%9E%E0%B8%A3%E0%B8%B0%E0%B9%80%E0%B8%81%E0%B8%B5%E0%B9%89%E0%B8%A2%E0%B8%A7_%E0%B8%9A.%E0%B8%94.%E0%B9%94.png" },
  { name: "เตรียมอุดมศึกษา สุวินทวงศ์", url: "https://i0.wp.com/athipportfolio.wordpress.com/wp-content/uploads/2017/08/10105309_0_20130923-171137.png?w=2500&h=&ssl=1" },
];

export default function Home() {
	return (
		<div className="animate-fade-in">
			{/* Hero Section */}
			<section className="hero-gradient py-16 md:py-24">
				<div className="max-w-4xl mx-auto px-4 text-center">
					{/* Emblem */}
					<div className="mx-auto mb-6 w-20 h-20 rounded-full bg-gradient-to-br from-gold-300 to-gold-600 flex items-center justify-center text-white shadow-gold">
						<Landmark size={36} />
					</div>

					<h1 className="text-3xl md:text-5xl font-extrabold text-royal-900 mb-3 leading-tight">
						ระบบโหวตลงมติ
					</h1>
					<h2 className="text-lg md:text-2xl font-semibold text-gold-600 mb-1">
						สภานักเรียน
					</h2>

					<div className="ornament-divider max-w-xs mx-auto my-6">
						<div className="diamond" />
					</div>

					<p className="text-royal-600 text-base md:text-lg max-w-2xl mx-auto mb-1 leading-relaxed">
						อบรมโครงการส่งเสริมภาวะผู้นำและศักยภาพสภานักเรียน
					</p>
					<p className="text-royal-400 text-sm md:text-base mb-10">
						โรงเรียนในสหวิทยาเขตวชิรบูรพา
					</p>

					{/* CTA Buttons */}
					<div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
						<Link
							href="/admin"
							className="btn-gold text-base px-8 py-3.5 flex items-center gap-2 text-lg"
						>
							<Settings size={20} /> เข้าสู่หน้าผู้ดูแลระบบ
						</Link>
						<Link
							href="/vote"
							className="btn-outline-gold text-base px-8 py-3.5 flex items-center gap-2 text-lg"
						>
							<Vote size={20} /> เข้าสู่หน้าลงมติ
						</Link>
					</div>
				</div>
			</section>

			{/* School Logos Showcase */}
			<section className="py-10 border-y border-gold/10 bg-white/50">
				<div className="max-w-5xl mx-auto px-4">
					<p className="text-center text-sm font-semibold text-royal-400 mb-6 flex items-center justify-center gap-2">
						<Users size={15} /> โรงเรียนในสหวิทยาเขตวชิรบูรพาที่เข้าร่วม
					</p>
					<div className="overflow-hidden">
						<div className="logo-marquee-track">
							{[...schoolLogos, ...schoolLogos].map((s, i) => (
								<div
									key={i}
									className="flex flex-col items-center gap-2 min-w-[90px]"
								>
									<img
										src={s.url}
										alt={s.name}
										loading="lazy"
										className="school-avatar-lg"
									/>
									<span className="text-xs text-royal-400 text-center whitespace-nowrap max-w-[90px] truncate">
										{s.name}
									</span>
								</div>
							))}
						</div>
					</div>
				</div>
			</section>

			{/* Feature Cards */}
			<section className="max-w-5xl mx-auto px-4 py-14">
				<div className="text-center mb-8">
					<h3 className="text-xl font-bold text-royal-800 mb-1">
						คุณสมบัติของระบบ
					</h3>
					<p className="text-sm text-royal-400">
						ครบทุกฟังก์ชันสำหรับการประชุมสภานักเรียน
					</p>
				</div>
				<div className="grid md:grid-cols-3 gap-6">
					{[
						{
							icon: Vote,
							title: "ลงมติแบบ Real-time",
							desc: "โหวตเห็นด้วย ไม่เห็นด้วย หรืองดออกเสียง ผลลัพธ์อัปเดตทันที",
							href: "/vote",
							color: "from-green-500 to-emerald-600",
						},
						{
							icon: Monitor,
							title: "จอแสดงผลขนาดใหญ่",
							desc: "แสดงผลโหวต Countdown และสถานะองค์ประชุมบนจอใหญ่",
							href: "/bigscreen",
							color: "from-blue-500 to-indigo-600",
						},
						{
							icon: ClipboardList,
							title: "เช็คชื่อสด",
							desc: "ตรวจสอบการเข้าร่วมประชุมของแต่ละโรงเรียนแบบ Real-time",
							href: "/attendance",
							color: "from-gold-400 to-gold-600",
						},
					].map((card) => (
						<Link
							key={card.href}
							href={card.href}
							className="no-underline group"
						>
							<div className="card-royal h-full flex flex-col items-center text-center p-8 group-hover:-translate-y-1 transition-transform duration-300">
								<div
									className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${card.color} flex items-center justify-center text-white mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}
								>
									<card.icon size={26} />
								</div>
								<h3 className="text-lg font-bold text-royal-800 mb-2">
									{card.title}
								</h3>
								<p className="text-sm text-royal-500 leading-relaxed">
									{card.desc}
								</p>
							</div>
						</Link>
					))}
				</div>
			</section>

			{/* Info Banner */}
			<section className="max-w-4xl mx-auto px-4 pb-14">
				<div className="card-royal text-center py-8 relative overflow-hidden">
					<div className="absolute inset-0 bg-gradient-to-r from-gold/5 via-transparent to-gold/5 pointer-events-none" />
					<div className="relative">
						<Shield size={24} className="mx-auto text-gold-500 mb-3" />
						<p className="text-royal-700 font-bold text-lg flex items-center justify-center gap-2">
							<Calendar size={18} /> วันพฤหัสบดี ที่ 12 มีนาคม 2569
						</p>
						<p className="text-royal-400 text-sm flex items-center justify-center gap-2 mt-2">
							<MapPin size={15} /> ณ โรงเรียนรัตนโกสินทร์สมโภชลาดกระบัง
						</p>
					</div>
				</div>
			</section>
		</div>
	);
}
