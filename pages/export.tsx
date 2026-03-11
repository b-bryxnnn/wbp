
export default function Export() {
  return (
    <div className="min-h-screen bg-darkblue text-gold flex flex-col items-center justify-center">
      <h2 className="text-3xl font-bold mb-4">ออกรายงาน/Export</h2>
      <div className="bg-graydark p-8 rounded-lg shadow-lg w-full max-w-xl">
        {/* ปุ่ม Export PDF/Excel */}
        <button className="px-6 py-3 bg-gold text-darkblue rounded-lg font-semibold shadow-lg hover:bg-yellow-400 transition mb-4">Export PDF</button>
        <button className="px-6 py-3 bg-gold text-darkblue rounded-lg font-semibold shadow-lg hover:bg-yellow-400 transition">Export Excel</button>
      </div>
    </div>
  );
}

