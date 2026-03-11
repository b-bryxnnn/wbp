export default function Export() {
  return (
    <div className="animate-fade-in max-w-xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold text-royal-900">📊 ออกรายงาน</h2>
        <div className="ornament-divider max-w-xs mx-auto mt-2">
          <div className="diamond" />
        </div>
      </div>

      <div className="card-royal space-y-4">
        <p className="text-sm text-royal-400 text-center">เลือกรูปแบบการส่งออกข้อมูล</p>
        <a href="/api/export?type=pdf" className="btn-gold w-full text-center block py-4 text-lg">
          📄 Export PDF
        </a>
        <a href="/api/export?type=excel" className="btn-outline-gold w-full text-center block py-4 text-lg">
          📊 Export Excel
        </a>
      </div>
    </div>
  );
}
