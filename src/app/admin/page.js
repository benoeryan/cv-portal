"use client";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import DriveImage from "@/components/DriveImage";

export default function AdminDashboard() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  // Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterBidang, setFilterBidang] = useState("");

  useEffect(() => {
    if (!authLoading && (!user || !["admin", "viewer", "approval"].includes(userData?.role))) {
      router.push("/"); return;
    }
    if (user) loadCandidates();
  }, [user, userData, authLoading]);

  const loadCandidates = async () => {
    setRefreshing(true);
    try {
      const q = query(collection(db, "candidates"), orderBy("submittedAt", "desc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setCandidates(data);
    } catch (err) { console.error(err); }
    setLoading(false); setRefreshing(false);
  };

  const stats = useMemo(() => {
    const s = {
      total: candidates.length,
      byStatus: {
        "Nihongo check": 0,
        "Belum Lolos Nihongo check": 0,
        "Pending Nunggu Job": 0,
        "Penjadwalan Interview": 0,
        "On Proses": 0,
        "Tidak Lolos Interview": 0,
        "Status On Job (Selesai)": 0,
        "Cancel": 0,
        "Belum Ada Status": 0
      },
      byBidang: {}
    };
    candidates.forEach(c => {
      const st = c.statusProgres;
      if (st && s.byStatus.hasOwnProperty(st)) s.byStatus[st]++;
      else if (!st) s.byStatus["Belum Ada Status"]++;

      const bd = c.bidangKerja || "LAINNYA";
      s.byBidang[bd] = (s.byBidang[bd] || 0) + 1;
    });
    return s;
  }, [candidates]);

  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      const matchSearch = !searchTerm ||
        c.namaLengkap?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.namaPanggilan?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = !filterStatus || (filterStatus === "Belum Ada Status" ? !c.statusProgres : c.statusProgres === filterStatus);
      const matchBidang = !filterBidang || c.bidangKerja === filterBidang;
      return matchSearch && matchStatus && matchBidang;
    });
  }, [candidates, searchTerm, filterStatus, filterBidang]);

  if (authLoading || loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  const statusConfig = {
    "Nihongo check": { color: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-100", icon: "N" },
    "Belum Lolos Nihongo check": { color: "bg-rose-500", text: "text-rose-700", bg: "bg-rose-50", border: "border-rose-100", icon: "x" },
    "Pending Nunggu Job": { color: "bg-orange-500", text: "text-orange-700", bg: "bg-orange-50", border: "border-orange-100", icon: "!" },
    "Penjadwalan Interview": { color: "bg-violet-500", text: "text-violet-700", bg: "bg-violet-50", border: "border-violet-100", icon: "📅" },
    "On Proses": { color: "bg-sky-500", text: "text-sky-700", bg: "bg-sky-50", border: "border-sky-100", icon: "★" },
    "Tidak Lolos Interview": { color: "bg-pink-500", text: "text-pink-700", bg: "bg-pink-50", border: "border-pink-100", icon: "x" },
    "Status On Job (Selesai)": { color: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-100", icon: "✓" },
    "Cancel": { color: "bg-gray-500", text: "text-gray-700", bg: "bg-gray-50", border: "border-gray-100", icon: "x" },
    "Belum Ada Status": { color: "bg-slate-400", text: "text-slate-600", bg: "bg-slate-50", border: "border-slate-100", icon: "?" }
  };

  return (
    <>
      <Navbar />
      <div className="max-w-full mx-auto px-6 py-10 bg-[#F8F9FC] min-h-screen font-sans">
        <div className="flex justify-between items-center mb-10">
           <div className="space-y-1">
              <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter leading-none">DASHBOARD STATISTIK ADMIN</h1>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Ringkasan data kandidat portal CV IJEF</p>
           </div>
           <button onClick={loadCandidates} className="bg-white px-8 py-4 rounded-3xl font-black text-[11px] uppercase tracking-widest shadow-xl border-none hover:bg-slate-50 transition-all active:scale-95">REFRESH DATA</button>
        </div>

        {/* Status Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-12">
           <div onClick={() => setFilterStatus("")} className={`cursor-pointer p-8 rounded-[3.5rem] border-4 transition-all flex flex-col justify-center ${!filterStatus ? 'bg-slate-900 border-slate-700 text-white shadow-2xl scale-105' : 'bg-white border-white shadow-sm hover:border-slate-100'}`}>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">TOTAL KANDIDAT</p>
              <h3 className="text-5xl font-black mt-2">{stats.total}</h3>
           </div>
           {Object.entries(stats.byStatus).map(([status, count]) => {
             const config = statusConfig[status] || statusConfig["Belum Ada Status"];
             const isActive = filterStatus === status;
             return (
               <div key={status} onClick={() => setFilterStatus(status)} className={`cursor-pointer p-8 rounded-[3.5rem] border-4 transition-all flex flex-col justify-center ${isActive ? `${config.color} border-white text-white shadow-2xl scale-105` : 'bg-white border-white shadow-sm hover:border-slate-100'}`}>
                  <p className={`text-[10px] font-black uppercase tracking-widest truncate ${isActive ? 'opacity-80' : 'text-slate-400'}`}>{status}</p>
                  <h3 className="text-4xl font-black mt-2">{count}</h3>
                  {!isActive \u0026\u0026 (
                    <div className="w-full bg-slate-100 h-1.5 mt-4 rounded-full overflow-hidden">
                       <div className={`h-full ${config.color}`} style={{ width: `${(count/stats.total)*100}%` }}></div>
                    </div>
                  )}
               </div>
             )
           })}
        </div>

        {/* Pipeline Bar With Percentages */}
        <div className="card p-12 bg-white border border-slate-100 rounded-[4rem] shadow-2xl shadow-slate-200/40 mb-12">
           <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] mb-10 text-center">Visualisasi Pipeline Progres</h2>
           <div className="flex h-16 w-full rounded-[2rem] overflow-hidden border-[8px] border-slate-50 shadow-inner">
              {Object.entries(stats.byStatus).map(([status, count]) => {
                const percent = stats.total \u003e 0 ? (count / stats.total) * 100 : 0;
                return count \u003e 0 \u0026\u0026 (
                  <div
                    key={status}
                    className={`${statusConfig[status]?.color || 'bg-slate-300'} h-full border-r-2 border-white/20 flex items-center justify-center`}
                    style={{ width: `${percent}%` }}
                    title={`${status}: ${count} (${Math.round(percent)}%)`}
                  >
                    {percent \u003e 5 \u0026\u0026 <span className="text-[10px] font-black text-white drop-shadow-md">{Math.round(percent)}%</span>}
                  </div>
                );
              })}
           </div>

           {/* Detailed Legend With Percentages */}
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-10">
              {Object.entries(stats.byStatus).map(([status, count]) => {
                const config = statusConfig[status];
                const percent = stats.total \u003e 0 ? (count / stats.total) * 100 : 0;
                return (
                  <div key={status} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                       <div className={`w-3 h-3 rounded-full ${config.color}`}></div>
                       <span className="text-[9px] font-black text-slate-600 uppercase truncate">{status}</span>
                    </div>
                    <div className="flex justify-between items-end mt-1">
                       <span className="text-lg font-black text-slate-800 leading-none">{count} <span className="text-[10px] font-bold text-slate-400">Org</span></span>
                       <span className={`text-[10px] font-black ${config.text}`}>{percent.toFixed(1)}%</span>
                    </div>
                  </div>
                );
              })}
           </div>
        </div>

        {/* Dashboard Bidang Kerja */}
        <div className="card p-10 bg-white border border-slate-100 rounded-[3rem] shadow-xl shadow-slate-200/40 mb-10">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8 text-center">KATEGORI BIDANG KERJA (SEKTOR SSW)</p>
           <div className="flex flex-wrap justify-center gap-3">
              <div onClick={() => setFilterBidang("")} className={`cursor-pointer px-6 py-3 rounded-2xl border-2 transition-all font-black text-[10px] uppercase tracking-widest ${!filterBidang ? 'bg-slate-900 border-slate-900 text-white' : 'bg-slate-50 border-transparent text-slate-400 hover:border-slate-200'}`}>Semua Bidang</div>
              {Object.entries(stats.byBidang).sort((a,b)=>\u0062[1]-a[1]).map(([b, count]) => (
                <div key={b} onClick={() => setFilterBidang(b)} className={`cursor-pointer px-6 py-3 rounded-2xl border-2 transition-all flex items-center gap-3 ${filterBidang === b ? 'bg-purple-600 border-purple-200 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-600 hover:border-purple-300'}`}>
                   <span className="text-[10px] font-black uppercase">{b}</span>
                   <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black ${filterBidang === b ? 'bg-white/20 text-white' : 'bg-purple-50 text-purple-600'}`}>{count}</span>
                </div>
              ))}
           </div>
        </div>

        {/* Quick Search \u0026 Table */}
        <div className="card overflow-hidden !p-0 border border-slate-100 shadow-2xl rounded-[3rem] bg-white">
           <div className="p-10 border-b border-slate-50 flex gap-6 bg-white sticky top-0 z-20">
              <input className="flex-1 h-16 bg-slate-50 border-none rounded-3xl px-8 font-black text-lg text-slate-800" placeholder="Cari Nama Kandidat..." value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} />
              { (filterStatus || filterBidang) \u0026\u0026 <button onClick={()=>{setFilterStatus(""); setFilterBidang("");}} className="bg-rose-50 text-rose-600 px-10 rounded-3xl font-black uppercase text-[11px] tracking-widest border border-rose-100 active:scale-95 transition-all">Reset Filter Γ£ò</button> }
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead>
                    <tr className="bg-slate-900 text-white font-black text-[11px] uppercase tracking-[0.2em]">
                       <th className="py-8 px-10">Data Kandidat</th>
                       <th className="py-8 px-10">Status Terakhir</th>
                       <th className="py-8 px-10">Keterangan</th>
                       <th className="py-8 px-10 text-center">Aksi</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {filteredCandidates.slice(0, 15).map(c \u003d\u003e (
                      <tr key={c.id} className="hover:bg-indigo-50/20 transition-all cursor-default group">
                         <td className="py-6 px-10">
                            <div className="flex items-center gap-5">
                               <div className="w-14 h-14 rounded-[1.5rem] overflow-hidden shadow-lg ring-4 ring-white shrink-0 bg-slate-100"><DriveImage url={c.pasPhoto} alt={c.namaLengkap} size="w-full h-full" className="rounded-2xl" /></div>
                               <div><p className="font-black text-slate-900 uppercase text-sm leading-none">{c.namaLengkap}</p><p className="text-[11px] text-slate-400 font-bold uppercase mt-2">"{c.namaPanggilan}" ΓÇó {c.bidangKerja}</p></div>
                            </div>
                         </td>
                         <td className="py-6 px-10"><span className={`px-5 py-2 rounded-full text-[10px] font-black uppercase border-2 ${statusConfig[c.statusProgres]?.bg || 'bg-slate-50'} ${statusConfig[c.statusProgres]?.text || 'text-slate-500'} ${statusConfig[c.statusProgres]?.border || 'border-slate-100'}`}>{c.statusProgres || "BELUM ADA STATUS"}</span></td>
                         <td className="py-6 px-10 max-w-[300px]"><p className="text-[10px] text-slate-500 font-medium leading-relaxed italic line-clamp-2 uppercase">{c.keteranganProgres || "-"}</p></td>
                         <td className="py-6 px-10 text-center">
                            <div className="flex justify-center gap-3">
                               <button onClick={() \u003d\u003e { setSelectedCandidate(c); setShowDetailModal(true); }} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm">View Profile</button>
                               <Link href={`/admin/cv/${c.id}`} className="px-4 py-2 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl">Template CV</Link>
                            </div>
                         </td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      </div>

      {/* DETAIL MODAL (REPLACES JIKO MODAL WITH FULL INFO) */}
      {showDetailModal \u0026\u0026 selectedCandidate \u0026\u0026 (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-slate-900/95 backdrop-blur-xl animate-fadeIn font-sans">
           <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-6xl overflow-hidden max-h-[95vh] flex flex-col md:flex-row">
              {/* Left Photo Area */}
              <div className="w-full md:w-2/5 relative bg-slate-100 overflow-hidden shrink-0">
                 <DriveImage url={selectedCandidate.pasPhoto} alt={selectedCandidate.namaLengkap} size\u003d\"w-full h-full\" className=\"object-cover object-top\" />
                 <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"></div>
                 <div className="absolute bottom-12 left-12 right-12 text-white">
                    <span className="text-xs font-black text-purple-400 uppercase tracking-[0.4em]">{selectedCandidate.bidangKerja}</span>
                    <h2 className="text-4xl font-black uppercase leading-none tracking-tighter mt-2">{selectedCandidate.namaLengkap}</h2>
                    <p className="text-xl font-bold opacity-60 uppercase tracking-widest italic pt-3">\"{selectedCandidate.namaPanggilan}\"</p>
                 </div>
                 <button onClick={() \u003d\u003e setShowDetailModal(false)} className="absolute top-10 right-10 w-14 h-14 bg-white/20 backdrop-blur-md rounded-full text-white text-4xl font-light hover:bg-white/40 transition-all flex items-center justify-center font-sans">ΓÇò</button>
              </div>

              {/* Right Data Area */}
              <div className="flex-1 p-12 overflow-y-auto custom-scrollbar space-y-12 bg-white">
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 font-sans"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Usia</p><p className="text-2xl font-black text-slate-800">{selectedCandidate.tanggalLahir ? (new Date().getFullYear() - new Date(selectedCandidate.tanggalLahir).getFullYear()) : \"---\"} THN</p></div>
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 font-sans"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Gender</p><p className="text-xl font-black text-slate-800 uppercase">{selectedCandidate.jenisKelamin}</p></div>
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 font-sans"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Agama</p><p className="text-xl font-black text-slate-800 uppercase">{selectedCandidate.agama || \"-\"}</p></div>
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 font-sans"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Status Nikah</p><p className="text-sm font-black text-slate-800 uppercase">{selectedCandidate.statusPernikahan || \"-\"}</p></div>
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 font-sans"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Sektor SSW</p><p className="text-sm font-black text-purple-600 uppercase">{selectedCandidate.bidangKerja || \"-\"}</p></div>
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 font-sans"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Bahasa</p><p className="text-sm font-black text-indigo-600 uppercase">{selectedCandidate.levelBahasa || \"-\"}</p></div>
                 </div>

                 <div className="p-8 bg-indigo-50/30 rounded-[2.5rem] border border-indigo-50 flex justify-around items-center font-sans">
                    <div className="text-center font-sans"><p className="text-[10px] font-black text-indigo-400 uppercase mb-1 tracking-widest">Tinggi Badan</p><p className="text-2xl font-black text-slate-700">{selectedCandidate.tinggiBadan} <span className="text-xs">CM</span></p></div>
                    <div className="w-px h-10 bg-indigo-100"></div>
                    <div className="text-center font-sans"><p className="text-[10px] font-black text-indigo-400 uppercase mb-1 tracking-widest">Berat Badan</p><p className="text-2xl font-black text-slate-700">{selectedCandidate.beratBadan} <span className="text-xs">KG</span></p></div>
                    <div className="w-px h-10 bg-indigo-100"></div>
                    <div className="text-center font-sans"><p className="text-[10px] font-black text-indigo-400 uppercase mb-1 tracking-widest">Domisili</p><p className="text-sm font-black text-slate-700 uppercase">{selectedCandidate.domisiliSiswa || \"INDO\"}</p></div>
                 </div>

                 <div className="grid grid-cols-2 gap-8 font-sans">
                    <div className="space-y-4 font-sans"><h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Kelebihan</h4><p className="text-xs text-slate-600 bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100 font-medium italic\">{selectedCandidate.kelebihan || \"---\"}</p></div>
                    <div className="space-y-4 font-sans"><h4 className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Kekurangan</h4><p className="text-xs text-slate-600 bg-rose-50/50 p-6 rounded-3xl border border-rose-100 font-medium italic\">{selectedCandidate.kekurangan || \"---\"}</p></div>
                 </div>

                 <div className="space-y-6 font-sans">
                    <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-4 font-sans"><div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>Jikoshoukai Singkat</h4>
                    <p className="text-lg text-slate-600 leading-relaxed font-medium italic bg-purple-50/30 p-10 rounded-[3rem] border border-purple-100 shadow-inner font-sans leading-relaxed\">\"{selectedCandidate.promosiDiri || \"---\"}\"</p>
                 </div>

                 <div className="p-8 bg-slate-900 rounded-[3rem] text-white flex justify-between items-center relative overflow-hidden shadow-2xl font-sans shrink-0">
                    <div className="relative z-10 font-sans"><p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-2 font-sans">Status Progres Rekrutmen ΓÇó Job Matching</p><h4 className="text-2xl font-black uppercase tracking-tighter font-sans\">{selectedCandidate.statusProgres || \"Pending Nunggu Job\"} ΓÇó Ready Match</h4></div>
                    <div className="absolute top-0 right-0 p-8 opacity-[0.05] pointer-events-none font-sans"><svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" /></svg></div>
                 </div>

                 <div className="flex gap-6 pt-6 font-sans shrink-0">
                    <button onClick={() \u003d\u003e {setShowDetailModal(false); router.push(`/admin/edit/${selectedCandidate.id}`);}} className="flex-1 py-6 bg-slate-900 text-white font-black rounded-[2.5rem] shadow-2xl uppercase tracking-[0.2em] text-xs hover:bg-indigo-600 transition-all font-sans\">Edit Progres Kandidat ΓåÆ</button>
                    <button onClick={() \u003d\u003e setShowDetailModal(false)} className="px-14 py-6 border-2 border-slate-100 rounded-[2.5rem] font-black text-slate-400 uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all font-sans\">Tutup Detail</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 10px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    \u003c/\u003e\n  );\n}\n"
