import { FileText, FileSpreadsheet, BarChart3, Download } from "lucide-react";

export default function Export() {
  return (
    <div className="animate-fade-in max-w-xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gold-300 to-gold-600 flex items-center justify-center text-white mx-auto mb-4 shadow-gold">
          <BarChart3 size={30} />
        </div>
        <h2 className="text-2xl font-extrabold text-royal-900">ออกรายงาน</h2>
        <div className="ornament-divider max-w-xs mx-auto mt-2">
          <div className="diamond" />
        </div>
        <p className="text-sm text-royal-400 mt-2">ส่งออกข้อมูลผลการลงมติและรายงานการประชุม</p>
      </div>

      <div className="card-royal space-y-4">
        <a href="/api/export?type=excel" className="btn-gold w-full text-center flex items-center justify-center gap-2.5 py-4 text-lg group">
          <FileSpreadsheet size={22} /> ดาวน์โหลด CSV (เปิดใน Excel ได้)
          <Download size={16} className="ml-auto opacity-50 group-hover:opacity-100 transition-opacity" />
        </a>
        <a href="/api/export?type=text" className="btn-outline-gold w-full text-center flex items-center justify-center gap-2.5 py-4 text-lg group">
          <FileText size={22} /> ดาวน์โหลดรายงาน (Text)
          <Download size={16} className="ml-auto opacity-50 group-hover:opacity-100 transition-opacity" />
        </a>
      </div>
    </div>
  );
}
