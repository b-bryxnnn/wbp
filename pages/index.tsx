
export default function Home() {
  return (
    <div className="min-h-screen bg-darkblue text-gold flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold mb-4">ระบบโหวตลงมติ สภานักเรียน</h1>
      <p className="text-lg mb-8">อบรมส่งเสริมภาวะผู้นำและศักยภาพสภานักเรียน โรงเรียนในสหวิทยาเขตวชิรบูรพา</p>
      <div className="flex gap-4">
        <a href="/admin" className="px-6 py-3 bg-gold text-darkblue rounded-lg font-semibold shadow-lg hover:bg-yellow-400 transition">เข้าสู่หน้าผู้ดูแลระบบ</a>
        <a href="/vote" className="px-6 py-3 bg-graydark text-gold rounded-lg font-semibold shadow-lg hover:bg-gray-700 transition">เข้าสู่หน้าลงมติ</a>
      </div>
    </div>
  );
}

