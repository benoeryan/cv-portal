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
  const [viewMode, setViewMode] = useState("card"); // Default to card as requested
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
      // Filter only Open jobs or jobs created by the user
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
      <div className="max-w-full mx-auto px-6 py-8 bg-[#F8F9FC] min-h-screen font-sans">
        <div className="flex justify-between items-center mb-10">
           <div>
              <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Portal Lowongan Kerja</h1>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Cari dan Daftarkan Kandidat Anda</p>
           </div>
           <div className="flex bg-white p-2 rounded-2xl shadow-lg border border-slate-50 shrink-0">
              <button onClick={() => setViewMode("table")} className={`px-8 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all ${viewMode==='table'?'bg-[#0F172A] text-white shadow-xl':'text-slate-400 hover:bg-slate-50'}`}>Listing Data</button>
              <button onClick={() => setViewMode("card")} className={`px-8 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all ${viewMode==='card'?'bg-[#0F172A] text-white shadow-xl':'text-slate-400 hover:bg-slate-50'}`}>Tampilan Kartu</button>
           </div>
        </div>

        {/* Search Bar */}
        <div className="max-w-4xl mx-auto mb-10 relative">
           <input className="w-full h-16 pl-14 pr-8 bg-white rounded-3xl border-none shadow-xl font-black text-lg text-slate-900" placeholder="Cari Lowongan..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
           <svg className="w-6 h-6 absolute left-5 top-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>

        {/* LISTING DATA VIEW */}
        {viewMode === "table" ? (
          <div className="card overflow-hidden !p-0 border-none shadow-2xl rounded-[3rem] bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white uppercase font-black text-[10px] tracking-widest">
                    <th className="py-7 px-8">Lowongan</th>
                    <th className="py-7 px-8">Perusahaan</th>
                    <th className="py-7 px-8 text-center">Status</th>
                    <th className="py-7 px-8 text-center">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredJobs.map((j) => (
                    <tr key={j.id} className="hover:bg-slate-50 transition-all">
                      <td className="py-6 px-8"><div className="font-black text-slate-900 uppercase text-xs">{j.namaJob}</div><div className="text-[10px] text-slate-400 font-bold mt-1 uppercase">{j.kodeJob}</div></td>
                      <td className="py-6 px-8"><div className="font-black text-slate-700 text-xs">{j.perusahaan}</div></td>
                      <td className="py-6 px-8 text-center"><span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border-2 ${j.statusJob?.toUpperCase() === 'OPEN' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>Aktif</span></td>
                      <td className="py-6 px-8 text-center">
                        <div className="flex justify-center gap-3">
                           <button onClick={() => { setSelectedJob(j); setShowDetailModal(true); }} className="px-5 py-2 bg-blue-50 text-blue-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-sm">Lihat Detail</button>
                           <button onClick={() => router.push(`/candidate/form?jobCode=${j.kodeJob}`)} className="px-5 py-2 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-sm">Daftar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* CARD VIEW - EXACTLY AS IMAGE 1 */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
             {filteredJobs.map((j) => (
               <div key={j.id} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col hover:shadow-2xl transition-all duration-500">
                  <div className="p-8 space-y-5">
                     <div className="flex justify-between items-start">
                        <div className="flex gap-2">
                           <span className="bg-purple-50 text-purple-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase">{j.kodeJob || "0"}</span>
                           <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase">Aktif</span>
                        </div>
                        <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-tight">{j.lokasi || "Berbagai Prefektur di Jepang"}</span>
                     </div>
                     <div>
                        <h3 className="font-black text-slate-800 text-lg uppercase leading-tight">{j.namaJob || "---"}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1.5">{j.kategori || "Semua Non-IJEF"}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">TSK / Partner: {j.kumiaiPartner || "-"}</p>
                     </div>
                     <div className="bg-slate-50/70 rounded-2xl p-6 space-y-4 border border-slate-50 shadow-inner">
                        <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-tighter"><span className="text-slate-400">Gaji:</span><span className="text-orange-600 text-right">{j.gaji || "-"}</span></div>
                        <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-tighter"><span className="text-slate-400">Gender & Kuota:</span><span className="text-slate-800 text-right">{j.jenisKelamin?.charAt(0) || "P"} • {j.jumlahKandidat || "1"} Org</span></div>
                        <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-tighter"><span className="text-slate-400">Biaya Proses:</span><span className="text-indigo-600 text-right">{j.biayaJob || "-"}</span></div>
                     </div>
                     <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4">
                        <p className="text-[8px] font-black text-amber-500 uppercase tracking-[0.2em] mb-1.5">Kualifikasi:</p>
                        <p className="text-[10px] font-bold text-amber-900 line-clamp-1">{j.syaratKhusus || "-"}</p>
                     </div>
                     <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">Keterangan:</p>
                        <p className="text-[10px] font-bold text-slate-800 line-clamp-1">{j.keterangan || "-"}</p>
                     </div>
                  </div>
                  <div className="px-8 py-5 bg-slate-50/30 border-t border-slate-100/50 flex justify-between items-center">
                     <button onClick={() => { setSelectedJob(j); setShowDetailModal(true); }} className="flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase tracking-widest hover:text-indigo-800 transition-all">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        Lihat Detail
                     </button>
                     <button onClick={() => router.push(`/candidate/form?jobCode=${j.kodeJob}`)} className="bg-slate-900 text-white px-6 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-indigo-600 transition-all active:scale-95 shadow-lg">Daftarkan Siswa</button>
                  </div>
               </div>
             ))}
          </div>
        )}
      </div>

      {/* DETAIL VIEW MODAL - EXACTLY AS IMAGE 2 */}
      {showDetailModal && selectedJob && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-md animate-fadeIn font-sans">
           <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden max-h-[95vh] flex flex-col">
              <div className="p-10 overflow-y-auto custom-scrollbar space-y-7">
                 <div className="flex justify-between items-start">
                    <div className="flex gap-2">
                       <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-md text-[10px] font-black uppercase">KODE: {selectedJob.kodeJob || "0"}</span>
                       <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-md text-[10px] font-black uppercase">STATUS: Aktif</span>
                    </div>
                    <button onClick={() => setShowDetailModal(false)} className="text-slate-300 hover:text-slate-800 text-4xl font-light leading-none">&times;</button>
                 </div>
                 <div>
                    <h2 className="text-3xl font-black text-slate-900 uppercase leading-none tracking-tighter">{selectedJob.namaJob}</h2>
                    <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">{selectedJob.kategori || "Semua Non-IJEF"}</p>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-sm"><p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">PREFEKTUR / DAERAH</p><p className="text-[11px] font-black text-slate-800 uppercase">{selectedJob.lokasi || "Berbagai Prefektur di Jepang"}</p></div>
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-sm"><p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">GAJI STANDAR / RATE</p><p className="text-[11px] font-black text-orange-600 uppercase italic">{selectedJob.gaji || "-"}</p></div>
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-sm"><p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">KEBUTUHAN KUOTA</p><p className="text-[11px] font-black text-emerald-600 uppercase">{selectedJob.jumlahKandidat || "1"} Orang Kandidat</p></div>
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-sm"><p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">JENIS KELAMIN TARGET</p><p className="text-[11px] font-black text-slate-800 uppercase">{selectedJob.jenisKelamin || "-"}</p></div>
                 </div>
                 <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-sm"><p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">TSK / SUMBER JOB PARTNER</p><p className="text-[11px] font-black text-indigo-600 uppercase tracking-widest">{selectedJob.kumiaiPartner || "-"}</p></div>
                 <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-sm"><p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">MITRA PERUSAHAAN & KUMIAI</p><p className="text-[11px] font-black text-slate-800 uppercase">Mitra Perusahaan ({selectedJob.perusahaan || "-"}) • TSK / Sumber: {selectedJob.kumiaiPartner || "-"}</p></div>
                 <div className="bg-white border border-amber-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-amber-50 px-5 py-2.5 border-b border-amber-100"><p className="text-[9px] font-black text-amber-700 uppercase">KUALIFIKASI PERSYARATAN</p></div>
                    <div className="p-5"><p className="text-[11px] font-black text-amber-900 uppercase leading-relaxed">{selectedJob.syaratKhusus || "-"}</p></div>
                 </div>
                 <div className="bg-white border border-indigo-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-indigo-50 px-5 py-2.5 border-b border-indigo-100"><p className="text-[9px] font-black text-indigo-700 uppercase">BIAYA PROSES & TANGGUNGAN</p></div>
                    <div className="p-5"><p className="text-[11px] font-black text-indigo-900 uppercase leading-relaxed">{selectedJob.biayaJob || "-"}</p></div>
                 </div>
                 <div className="bg-white border border-emerald-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-emerald-50 px-5 py-2.5 border-b border-emerald-100"><p className="text-[9px] font-black text-emerald-700 uppercase">FASILITAS ASRAMA & TUNJANGAN</p></div>
                    <div className="p-5"><p className="text-[11px] font-black text-emerald-900 uppercase leading-relaxed">{selectedJob.benefit || "-"}</p></div>
                 </div>
                 <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-slate-50 px-5 py-2.5 border-b border-slate-100"><p className="text-[9px] font-black text-slate-700 uppercase">KETERANGAN & CATATAN TAMBAHAN</p></div>
                    <div className="p-5"><p className="text-[11px] font-black text-slate-800 uppercase leading-relaxed">{selectedJob.keterangan || "-"}</p></div>
                 </div>
                 <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-200 space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase border-b border-slate-200 pb-3 mb-4 tracking-widest">RINCIAN RINGKASAN LOWONGAN</p>
                    <div className="text-[11px] font-bold text-slate-600 space-y-2 uppercase leading-relaxed font-mono">
                       <p>📌 DETAIL LOWONGAN PEKERJAAN</p>
                       <p>• Posisi / List Job: {selectedJob.namaJob}</p>
                       <p>• Kode Job: {selectedJob.kodeJob || "0"}</p>
                       <p>• Kategori Target: {selectedJob.kategori}</p>
                       <p>• Lokasi / Prefektur: {selectedJob.lokasi}</p>
                       <p>• Target Gender: {selectedJob.jenisKelamin}</p>
                       <p>• Standar Gaji: {selectedJob.gaji}</p>
                       <p>• Kuota Penerimaan: {selectedJob.jumlahKandidat} Orang Candidate</p>
                       <p>• Partner TSK / Sumber: {selectedJob.kumiaiPartner}</p>
                       <p className="mt-4">📑 KUALIFIKASI & PERSYARATAN:</p>
                       <p className="normal-case font-medium">{selectedJob.syaratKhusus}</p>
                       <p className="mt-4">💰 BIAYA PROSES & TANGGUNGAN:</p>
                       <p className="normal-case font-medium">{selectedJob.biayaJob || "-"}</p>
                       <p className="mt-4">🏢 FASILITAS & ASRAMA:</p>
                       <p className="normal-case font-medium">{selectedJob.benefit}</p>
                       <p className="mt-4">ℹ️ KETERANGAN TAMBAHAN:</p>
                       <p className="normal-case font-medium">{selectedJob.keterangan}</p>
                    </div>
                 </div>
              </div>
              <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 flex justify-between">
                 <button onClick={() => router.push(`/candidate/form?jobCode=${selectedJob.kodeJob}`)} className="bg-emerald-600 text-white px-10 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all">Daftarkan Siswa Sekarang →</button>
                 <button onClick={() => setShowDetailModal(false)} className="bg-[#0F172A] text-white px-10 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all">Tutup Detail</button>
              </div>
           </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #CBD5E1; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </>
  );
}
