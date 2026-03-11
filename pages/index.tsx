import Link from "next/link";
import { Landmark, Vote, Calendar, MapPin, Shield, Users, Sparkles } from "lucide-react";

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
			<section className="hero-gradient py-20 md:py-28 relative overflow-hidden">
				{/* Decorative elements */}
				<div className="absolute inset-0 pointer-events-none">
					<div className="absolute -left-32 top-10 w-80 h-80 rounded-full bg-gold/20 blur-3xl" />
					<div className="absolute right-[-10%] bottom-[-10%] w-[420px] h-[420px] rounded-full bg-gold/15 blur-3xl" />
				</div>
				<div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gold to-transparent" />

				<div className="max-w-4xl mx-auto px-4 text-center relative">
					{/* Emblem */}
					<div className="mx-auto mb-8">
						<div className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-white shadow-2xl border-4 border-gold/30 flex items-center justify-center mx-auto">
							<img src={HOST_LOGO} alt="ตราสัญลักษณ์" className="w-20 h-20 md:w-24 md:h-24 object-contain" />
						</div>
					</div>

					<div className="space-y-3 mb-6">
						<p className="text-gold-700 text-sm md:text-base font-semibold tracking-[0.2em] uppercase flex items-center justify-center gap-2">
							<Sparkles size={14} /> ยินดีต้อนรับ <Sparkles size={14} />
						</p>
						<h1 className="text-3xl md:text-5xl font-extrabold text-royal-900 leading-tight text-balance">
							โรงเรียนรัตนโกสินทร์สมโภชลาดกระบัง
						</h1>
						<h2 className="text-xl md:text-3xl font-bold text-royal-700 text-balance">
							มีความยินดีอย่างยิ่งที่ได้ต้อนรับคณะผู้แทนสภานักเรียนในเครือสหวิทยาเขตวชิรบูรพา
						</h2>
					</div>

					<div className="ornament-divider max-w-xs mx-auto my-6">
						<div className="diamond" />
					</div>

																						<p className="text-royal-600 text-base md:text-lg max-w-2xl mx-auto mb-1 leading-relaxed font-medium text-balance">
																							อบรมโครงการส่งเสริมภาวะผู้นำและศักยภาพสภานักเรียน พร้อมระบบลงมติออนไลน์
																						</p>
					<p className="text-royal-400 text-sm md:text-base mb-10">
						สำนักงานเขตพื้นที่การศึกษามัธยมศึกษากรุงเทพมหานคร เขต 2
					</p>

					{/* CTA Buttons */}
					<div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
						<Link href="/vote" className="btn-gold text-base px-10 py-4 flex items-center gap-2 text-lg shadow-lg hover:shadow-xl">
							<Vote size={22} /> เข้าสู่หน้าลงมติ
						</Link>
					</div>
				</div>
			</section>

			{/* School Logos Showcase */}
			<section className="py-12 border-y border-gold/10 bg-white/50">
				<div className="max-w-5xl mx-auto px-4">
					<p className="text-center text-sm font-bold text-royal-500 mb-8 flex items-center justify-center gap-2">
						<Users size={16} /> โรงเรียนในสหวิทยาเขตวชิรบูรพาที่เข้าร่วม
					</p>
					<div className="flex flex-wrap justify-center gap-6 md:gap-10">
						{schoolLogos.map((s, i) => (
							<div key={i} className="flex flex-col items-center gap-3 text-center group" style={{ width: "clamp(90px, 18%, 130px)" }}>
								{s.url ? (
									<div className="w-16 h-16 rounded-full border-2 border-gold/20 bg-white p-1.5 shadow-sm group-hover:shadow-md group-hover:border-gold/40 transition-all">
										<img src={s.url} alt={s.name} loading="lazy" className="w-full h-full object-contain rounded-full" />
									</div>
								) : (
									<div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center">
										<Landmark size={24} className="text-gold-500" />
									</div>
								)}
								<span className="text-[11px] text-royal-500 leading-tight font-medium">{s.name}</span>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Info Banner */}
			<section className="max-w-4xl mx-auto px-4 py-16">
				<div className="card-royal text-center py-10 relative overflow-hidden">
					<div className="absolute inset-0 bg-gradient-to-r from-gold/5 via-transparent to-gold/5 pointer-events-none" />
					<div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
					<div className="relative">
						<Shield size={28} className="mx-auto text-gold-500 mb-4" />
						<p className="text-royal-700 font-bold text-xl flex items-center justify-center gap-2">
							<Calendar size={20} /> วันพฤหัสบดี ที่ 12 มีนาคม 2569
						</p>
						<p className="text-royal-400 text-base flex items-center justify-center gap-2 mt-3">
							<MapPin size={16} /> ณ โรงเรียนรัตนโกสินทร์สมโภชลาดกระบัง
						</p>
						<p className="text-royal-300 text-xs mt-4">
							121 ถ. เคหะร่มเกล้า แขวงคลองสองต้นนุ่น เขตลาดกระบัง กรุงเทพมหานคร 10520
						</p>
					</div>
				</div>
			</section>
		</div>
	);
}
