"use client";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import Navbar from "@/components/Navbar";

export default function PartnerJobListPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("card");
  const [searchTerm, setSearchTerm] = useState("");
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);

  useEffect(() => {
    if (!authLoading && (!user || !["partner", "admin"].includes(userData?.role))) {
      router.push("/"); return;
    }
    if (user) loadJobs();
  }, [user, userData, authLoading]);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "jobs"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setJobs(data.filter(j => j.statusJob?.toUpperCase() === "OPEN" || j.createdBy === user.uid));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter(j =>
      !searchTerm ||
      j.namaJob?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.kodeJob?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.perusahaan?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [jobs, searchTerm]);

  if (authLoading || loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <>
      <Navbar />
      <div className="max-w-full mx-auto px-6 py-10 bg-[#EDF2F7] min-h-screen font-sans">
        <div className="flex justify-between items-center mb-10">
           <div>
              <h1 className="text-4xl font-black text-slate-950 uppercase tracking-tighter">PORTAL LOWONGAN KERJA</h1>
              <p className="text-slate-500 text-[11px] font-black uppercase tracking-[0.4em] mt-1">IJEF PORTAL • KATALOG RESMI MITRA</p>
           </div>
           <div className="flex bg-white p-2.5 rounded-[1.5rem] shadow-xl border border-white shrink-0">
              <button onClick={() => setViewMode("table")} className={`px-10 py-4 rounded-xl font-black text-[12px] uppercase tracking-widest transition-all ${viewMode==='table'?'bg-slate-900 text-white shadow-2xl scale-105':'text-slate-400 hover:bg-slate-50'}`}>Listing Data</button>
              <button onClick={() => setViewMode("card")} className={`px-10 py-4 rounded-xl font-black text-[12px] uppercase tracking-widest transition-all ${viewMode==='card'?'bg-slate-900 text-white shadow-2xl scale-105':'text-slate-400 hover:bg-slate-50'}`}>Tampilan Kartu</button>
           </div>
        </div>

        {/* Search Bar */}
        <div className="max-w-4xl mx-auto mb-12 relative">
           <input className="w-full h-20 pl-16 pr-8 bg-white rounded-[2rem] border-none shadow-2xl font-black text-xl text-slate-950 placeholder:text-slate-300" placeholder="Cari Lowongan..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
           <svg className="w-8 h-8 absolute left-6 top-6 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>

        {/* LISTING DATA VIEW - LARGER FONT */}
        {viewMode === "table" ? (
          <div className="card overflow-hidden !p-0 border-none shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[3.5rem] bg-white border-4 border-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white uppercase font-black text-[13px] tracking-[0.15em] text-center border-b-4 border-white">
                    <th className="py-8 px-4">STATUS</th>
                    <th className="py-8 px-4">KODE JOB</th>
                    <th className="py-8 px-4 text-left">JUDUL PEKERJAAN (LIST JOB)</th>
                    <th className="py-8 px-4">DAERAH</th>
                    <th className="py-8 px-4">GENDER</th>
                    <th className="py-8 px-4">GAJI</th>
                    <th className="py-8 px-4">KUOTA</th>
                    <th className="py-8 px-4 text-left">KUALIFIKASI</th>
                    <th className="py-8 px-4">BIAYA PROSES</th>
                    <th className="py-8 px-4">KETERANGAN</th>
                    <th className="py-8 px-4">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredJobs.map((j) => (
                    <tr key={j.id} className="hover:bg-indigo-50/40 transition-all text-center group">
                      <td className="py-8 px-4"><span className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase border-2 ${j.statusJob === 'Open' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>Aktif</span></td>
                      <td className="py-8 px-4"><span className="bg-purple-100 text-purple-800 px-4 py-2 rounded-lg text-[11px] font-black uppercase border border-purple-100 shadow-sm">{j.kodeJob || "-"}</span></td>
                      <td className="py-8 px-4 text-left"><div className="font-black text-slate-950 text-[17px] uppercase leading-tight">{j.namaJob}</div><div className="text-[12px] text-slate-500 font-black mt-2 uppercase tracking-widest">{j.kategori}</div></td>
                      <td className="py-8 px-4"><span className="bg-indigo-100 text-indigo-800 px-4 py-2 rounded-lg text-[11px] font-black uppercase border border-indigo-200">{j.lokasi}</span></td>
                      <td className="py-8 px-4 text-[17px] font-black text-slate-900">{j.jenisKelamin?.charAt(0) || "P"}</td>
                      <td className="py-8 px-4 text-[17px] font-black text-orange-700">{j.gaji || "-"}</td>
                      <td className="py-8 px-4 text-[17px] font-black text-slate-950">{j.jumlahKandidat || "0"} Org</td>
                      <td className="py-8 px-4 text-left"><div className="bg-amber-50/30 border-2 border-amber-100 rounded-xl px-5 py-3 text-[13px] font-black text-amber-950 line-clamp-1 max-w-[200px] shadow-sm italic text-center">Kualifikasi: {j.syaratKhusus}</div></td>
                      <td className="py-8 px-4 text-[14px] font-black text-slate-500">{j.biayaJob || "-"}</td>
                      <td className="py-8 px-4 text-[14px] font-black text-slate-400">{j.keterangan || "0"}</td>
                      <td className="py-8 px-4">
                        <div className="flex justify-center gap-3">
                           <button onClick={() => { setSelectedJob(j); setShowDetailModal(true); }} className="px-6 py-3 bg-blue-100 text-blue-800 rounded-xl border border-blue-200 font-black text-[12px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-md active:scale-90">Detail</button>
                           <button onClick={() => router.push(`/candidate/form?jobCode=${j.kodeJob}`)} className="px-6 py-3 bg-[#0F172A] text-white rounded-xl font-black text-[12px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-md active:scale-90">Daftar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* CARD VIEW - 4 CARDS PER ROW, LARGER FONTS */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
             {filteredJobs.map((j) => (
               <div key={j.id} className="bg-white rounded-[3rem] shadow-2xl border-4 border-white hover:border-indigo-400 transition-all duration-500 overflow-hidden flex flex-col group relative">
                  <div className="p-8 space-y-6">
                     <div className="flex justify-between items-start">
                        <div className="flex gap-2.5">
                           <span className="bg-purple-100 text-purple-900 px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-sm border border-purple-200">{j.kodeJob || "-"}</span>
                           <span className="bg-emerald-100 text-emerald-900 px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-sm border border-emerald-200">Aktif</span>
                        </div>
                        <span className="bg-indigo-50 text-indigo-900 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-indigo-100">{j.lokasi || "Jepang"}</span>
                     </div>
                     <div>
                        <h3 className="font-black text-slate-950 text-[20px] uppercase leading-tight tracking-tighter line-clamp-2 min-h-[3.5rem]">{j.namaJob || "---"}</h3>
                        <p className="text-[12px] font-black text-slate-400 uppercase mt-2 tracking-widest">{j.kategori || "Semua Non-IJEF"}</p>
                     </div>
                     <div className="bg-slate-100/60 rounded-[2rem] p-7 space-y-5 border-2 border-slate-50 shadow-inner">
                        <div className="flex justify-between items-center text-[14px] font-black uppercase"><span className="text-slate-400 tracking-tighter">GAJI:</span><span className="text-orange-700 text-right text-[17px]">{j.gaji || "-"}</span></div>
                        <div className="flex justify-between items-center text-[14px] font-black uppercase"><span className="text-slate-950 text-right text-[15px]">{j.jenisKelamin?.charAt(0) || "P"} • {j.jumlahKandidat || "0"} ORG</span></div>
                        <div className="flex justify-between items-center text-[14px] font-black uppercase"><span className="text-slate-400 tracking-tighter">BIAYA:</span><span className="text-indigo-800 text-right">{j.biayaJob || "-"}</span></div>
                     </div>
                     <div className="bg-amber-100/40 border-2 border-amber-200/50 rounded-2xl p-5">
                        <p className="text-[9px] font-black text-amber-600 uppercase tracking-[0.2em] mb-2">Kualifikasi:</p>
                        <p className="text-[12px] font-black text-amber-950 line-clamp-1 italic">"{j.syaratKhusus || "-"}"</p>
                     </div>
                     <div className="bg-slate-100 border-2 border-slate-200/50 rounded-2xl p-5">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Keterangan:</p>
                        <p className="text-[12px] font-black text-slate-900 line-clamp-1">{j.keterangan || "-"}</p>
                     </div>
                  </div>
                  <div className="px-8 py-7 bg-slate-50 border-t-2 border-slate-100 flex justify-between items-center mt-auto">
                     <button onClick={() => { setSelectedJob(j); setShowDetailModal(true); }} className="flex items-center gap-2 text-indigo-700 font-black text-[12px] uppercase tracking-widest hover:text-indigo-950 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        DETAIL
                     </button>
                     <button onClick={() => router.push(`/candidate/form?jobCode=${j.kodeJob}`)} className="bg-slate-900 text-white px-8 py-3 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest hover:bg-indigo-600 transition-all active:scale-95 shadow-lg">Daftar Siswa</button>
                  </div>
               </div>
             ))}
          </div>
        )}
      </div>

      {/* DETAIL VIEW MODAL - EXACTLY AS IMAGE 2 */}
      {showDetailModal && selectedJob && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-md animate-fadeIn font-sans">
           <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden max-h-[95vh] flex flex-col border-8 border-white">
              <div className="p-10 overflow-y-auto custom-scrollbar space-y-7">
                 <div className="flex justify-between items-start">
                    <div className="flex gap-2.5">
                       <span className="bg-purple-100 text-purple-900 px-4 py-1.5 rounded-lg text-[11px] font-black uppercase border-2 border-purple-200">KODE: {selectedJob.kodeJob || "0"}</span>
                       <span className="bg-emerald-100 text-emerald-900 px-4 py-1.5 rounded-lg text-[11px] font-black uppercase border-2 border-emerald-200">STATUS: Aktif</span>
                    </div>
                    <button onClick={() => setShowDetailModal(false)} className="bg-slate-100 text-slate-400 hover:text-slate-900 w-12 h-12 rounded-full flex items-center justify-center text-3xl font-light transition-all shadow-inner">&times;</button>
                 </div>
                 <div>
                    <h2 className="text-4xl font-black text-slate-950 uppercase leading-none tracking-tighter">{selectedJob.namaJob}</h2>
                    <p className="text-xs font-black text-slate-400 mt-3 uppercase tracking-[0.2em]">{selectedJob.kategori || "Semua Non-IJEF"}</p>
                 </div>
                 <div className="grid grid-cols-2 gap-5">
                    <div className="bg-slate-100/50 p-6 rounded-2xl border-2 border-slate-100 shadow-sm"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">PREFEKTUR / DAERAH</p><p className="text-[13px] font-black text-slate-900 uppercase">{selectedJob.lokasi || "Berbagai Prefektur di Jepang"}</p></div>
                    <div className="bg-slate-100/50 p-6 rounded-2xl border-2 border-slate-100 shadow-sm"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">GAJI STANDAR / RATE</p><p className="text-[13px] font-black text-orange-700 uppercase italic">{selectedJob.gaji || "-"}</p></div>
                    <div className="bg-slate-100/50 p-6 rounded-2xl border-2 border-slate-100 shadow-sm"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">KEBUTUHAN KUOTA</p><p className="text-[13px] font-black text-emerald-800 uppercase">{selectedJob.jumlahKandidat || "1"} ORANG KANDIDAT</p></div>
                    <div className="bg-slate-100/50 p-6 rounded-2xl border-2 border-slate-100 shadow-sm"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">JENIS KELAMIN TARGET</p><p className="text-[13px] font-black text-slate-900 uppercase">{selectedJob.jenisKelamin || "-"}</p></div>
                 </div>

                 <div className="bg-white border-2 border-amber-300 rounded-3xl overflow-hidden shadow-xl">
                    <div className="bg-amber-100/50 px-6 py-3 border-b-2 border-amber-200"><p className="text-[10px] font-black text-amber-800 uppercase tracking-widest">KUALIFIKASI PERSYARATAN</p></div>
                    <div className="p-6"><p className="text-[13px] font-black text-amber-950 uppercase leading-relaxed">{selectedJob.syaratKhusus || "-"}</p></div>
                 </div>
                 <div className="bg-white border-2 border-indigo-300 rounded-3xl overflow-hidden shadow-xl">
                    <div className="bg-indigo-100/50 px-6 py-3 border-b-2 border-indigo-200"><p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">BIAYA PROSES & TANGGUNGAN</p></div>
                    <div className="p-6"><p className="text-[13px] font-black text-indigo-900 uppercase leading-relaxed">{selectedJob.biayaJob || "-"}</p></div>
                 </div>
                 <div className="bg-white border-2 border-emerald-300 rounded-3xl overflow-hidden shadow-xl">
                    <div className="bg-emerald-100/50 px-6 py-3 border-b-2 border-emerald-200"><p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">FASILITAS ASRAMA & TUNJANGAN</p></div>
                    <div className="p-6"><p className="text-[13px] font-black text-emerald-900 uppercase leading-relaxed">{selectedJob.benefit || "-"}</p></div>
                 </div>
                 <div className="bg-white border-2 border-slate-300 rounded-3xl overflow-hidden shadow-xl">
                    <div className="bg-slate-50 px-6 py-3 border-b-2 border-slate-200"><p className="text-[9px] font-black text-slate-700 uppercase tracking-widest">KETERANGAN & CATATAN TAMBAHAN</p></div>
                    <div className="p-6"><p className="text-[13px] font-black text-slate-800 uppercase leading-relaxed">{selectedJob.keterangan || "-"}</p></div>
                 </div>
                 <div className="bg-slate-50 p-10 rounded-[3rem] border-4 border-slate-100 space-y-6 shadow-inner">
                    <p className="text-[12px] font-black text-slate-400 uppercase border-b-2 border-slate-100 pb-4 mb-6 tracking-[0.3em]">RINCIAN RINGKASAN LOWONGAN</p>
                    <div className="text-[12px] font-bold text-slate-600 space-y-3 uppercase leading-relaxed font-mono">
                       <p className="text-indigo-600">📌 DETAIL LOWONGAN PEKERJAAN</p>
                       <p>• POSISI / LIST JOB: <span className="text-slate-900">{selectedJob.namaJob}</span></p>
                       <p>• KODE JOB: <span className="text-slate-900">{selectedJob.kodeJob || "0"}</span></p>
                       <p>• KATEGORI TARGET: <span className="text-slate-900">{selectedJob.kategori}</span></p>
                       <p>• LOKASI / PREFEKTUR: <span className="text-slate-900">{selectedJob.lokasi}</span></p>
                       <p>• TARGET GENDER: <span className="text-slate-900">{selectedJob.jenisKelamin}</span></p>
                       <p>• STANDAR GAJI: <span className="text-slate-900">{selectedJob.gaji}</span></p>
                       <p>• KUOTA PENERIMAAN: <span className="text-slate-900">{selectedJob.jumlahKandidat} ORANG CANDIDATE</span></p>
                       <p className="mt-8 text-indigo-600 font-black">📑 KUALIFIKASI & PERSYARATAN:</p>
                       <p className="normal-case font-medium text-slate-700 italic">{selectedJob.syaratKhusus}</p>
                       <p className="mt-6 text-indigo-600 font-black">💰 BIAYA PROSES & TANGGUNGAN:</p>
                       <p className="normal-case font-medium text-slate-700 italic">{selectedJob.biayaJob || "-"}</p>
                       <p className="mt-6 text-indigo-600 font-black">🏢 FASILITAS & ASRAMA:</p>
                       <p className="normal-case font-medium text-slate-700 italic">{selectedJob.benefit}</p>
                       <p className="mt-6 text-indigo-600 font-black">ℹ️ KETERANGAN TAMBAHAN:</p>
                       <p className="normal-case font-medium text-slate-700 italic">{selectedJob.keterangan}</p>
                    </div>
                 </div>
              </div>
              <div className="px-12 py-8 bg-slate-50 border-t border-slate-100 flex justify-between">
                 <button onClick={() => router.push(`/candidate/form?jobCode=${selectedJob.kodeJob}`)} className="bg-emerald-600 text-white px-12 py-5 rounded-[2rem] font-black uppercase text-[12px] tracking-widest shadow-xl active:scale-95 transition-all">DAFTARKAN SISWA SEKARANG →</button>
                 <button onClick={() => setShowDetailModal(false)} className="bg-indigo-600 text-white px-12 py-5 rounded-[2rem] font-black uppercase text-[12px] tracking-widest shadow-xl active:scale-95 transition-all">Tutup Detail</button>
              </div>
           </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 20px; border: 2px solid white; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94A3B8; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </>
  );
}
