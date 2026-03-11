import Link from "next/link";
import { Landmark, Vote, Calendar, MapPin, Shield, Users } from "lucide-react";

const schoolLogos = [
	{ name: "โรงเรียนเตรียมอุดมศึกษาพัฒนาการ สุวรรณภูมิ", url: "https://upload.wikimedia.org/wikipedia/commons/4/47/Phra_Kiao_Triamnom_Colored.png" },
	{ name: "โรงเรียนเตรียมอุดมศึกษาน้อมเกล้า", url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Phra_Kiao_Triamnom_Colored.png/960px-Phra_Kiao_Triamnom_Colored.png" },
	{ name: "โรงเรียนเทพศิรินทร์ร่มเกล้า", url: "https://dsr.ac.th/wp-content/uploads/2017/11/DSRvector-768x826.png" },
	{ name: "โรงเรียนนวมินทราชินูทิศ เตรียมอุดมศึกษาน้อมเกล้า", url: "https://fth1.com/uppic/10106510/news/10106510_0_20231130-104017.jpg" },
	{ name: "โรงเรียนพรตพิทยพยัต", url: "https://prot.ac.th/_files_school/10105750/workstudent/10105750_0_20151212-184742.png" },
	{ name: "โรงเรียนมัธยมวัดหนองจอก", url: "https://tesf.or.th/esportswhatschooltour2024/images/schoollogo/nj.png" },
	{ name: "โรงเรียนรัตนโกสินทร์สมโภชลาดกระบัง", url: "https://upload.wikimedia.org/wikipedia/commons/9/9f/RSL001.png" },
	{ name: "โรงเรียนบดินทรเดชา (สิงห์ สิงหเสนี) 4", url: "https://upload.wikimedia.org/wikipedia/th/thumb/f/fc/%E0%B8%95%E0%B8%A3%E0%B8%B2%E0%B8%9E%E0%B8%A3%E0%B8%B0%E0%B9%80%E0%B8%81%E0%B8%B5%E0%B9%89%E0%B8%A2%E0%B8%A7_%E0%B8%9A.%E0%B8%94.%E0%B9%94.png/250px-%E0%B8%95%E0%B8%A3%E0%B8%B2%E0%B8%9E%E0%B8%A3%E0%B8%B0%E0%B9%80%E0%B8%81%E0%B8%B5%E0%B9%89%E0%B8%A2%E0%B8%A7_%E0%B8%9A.%E0%B8%94.%E0%B9%94.png" },
	{ name: "โรงเรียนเตรียมอุดมศึกษา สุวินทวงศ์", url: "https://i0.wp.com/athipportfolio.wordpress.com/wp-content/uploads/2017/08/10105309_0_20130923-171137.png?w=2500&h=&ssl=1" },
];

const HOST_LOGO = "https://upload.wikimedia.org/wikipedia/commons/9/9f/RSL001.png";

export default function Home() {
	return (
		<div className="animate-fade-in">
			{/* Hero Section */}
			<section className="hero-gradient py-16 md:py-24 relative overflow-hidden">
				{/* Subtle watermark */}
				<div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
					<img src={HOST_LOGO} alt="" className="w-[400px] h-[400px] object-contain" />
				</div>
				<div className="max-w-4xl mx-auto px-4 text-center relative">
					{/* Emblem */}
					<div className="mx-auto mb-6">
						<img src={HOST_LOGO} alt="ตราสัญลักษณ์" className="w-24 h-24 md:w-28 md:h-28 object-contain mx-auto drop-shadow-lg" />
					</div>

					<h1 className="text-3xl md:text-5xl font-extrabold text-royal-900 mb-3 leading-tight">
						สภานักเรียน
					</h1>
					<h2 className="text-lg md:text-2xl font-semibold text-gold-600 mb-1">
						สหวิทยาเขตวชิรบูรพา
					</h2>

					<div className="ornament-divider max-w-xs mx-auto my-6">
						<div className="diamond" />
					</div>

					<p className="text-royal-600 text-base md:text-lg max-w-2xl mx-auto mb-1 leading-relaxed">
						อบรมโครงการส่งเสริมภาวะผู้นำและศักยภาพสภานักเรียน
					</p>
					<p className="text-royal-400 text-sm md:text-base mb-10">
						โรงเรียนในสหวิทยาเขตวชิรบูรพา สำนักงานเขตพื้นที่การศึกษามัธยมศึกษากรุงเทพมหานคร เขต 2
					</p>

					{/* CTA Buttons */}
					<div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
						<Link href="/vote" className="btn-gold text-base px-8 py-3.5 flex items-center gap-2 text-lg">
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
					{/* Use flex-wrap with justify-center so incomplete last row is centered */}
					<div className="flex flex-wrap justify-center gap-5 md:gap-8">
						{schoolLogos.map((s, i) => (
							<div key={i} className="flex flex-col items-center gap-2.5 text-center" style={{ width: "clamp(90px, 18%, 140px)" }}>
								{s.url ? (
									<img src={s.url} alt={s.name} loading="lazy" className="school-avatar-lg" />
								) : (
									<div className="w-14 h-14 rounded-full bg-gold/10 flex items-center justify-center">
										<Landmark size={20} className="text-gold-500" />
									</div>
								)}
								<span className="text-[11px] text-royal-500 leading-tight">{s.name}</span>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Info Banner */}
			<section className="max-w-4xl mx-auto px-4 py-14">
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
