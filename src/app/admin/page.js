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
        <div className="flex justify-between items-center mb-8">
           <div className="space-y-1">
              <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter leading-none">DASHBOARD STATISTIK</h1>
              <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">Ringkasan data kandidat portal CV IJEF</p>
           </div>
           <button onClick={loadCandidates} className="bg-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-sm hover:bg-slate-50 border border-slate-100 transition-all">Refresh Data</button>
        </div>

        {/* Status Cards - REVERTED TO EXACT V3 STYLE */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
           <div onClick={() => setFilterStatus("")} className={`cursor-pointer card p-6 relative overflow-hidden transition-all duration-300 ${!filterStatus ? 'bg-indigo-900 text-white shadow-2xl scale-[1.02]' : 'bg-white border-transparent hover:border-indigo-100 shadow-sm'}`}>
              <div className="flex justify-between items-start">
                 <div className={`p-2 rounded-lg ${!filterStatus ? 'bg-white/20' : 'bg-indigo-50 text-indigo-600'}`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                 </div>
                 <span className="text-3xl font-black">{stats.total}</span>
              </div>
              <p className={`mt-4 text-[10px] font-black uppercase tracking-widest ${!filterStatus ? 'text-white/70' : 'text-slate-400'}`}>Total Kandidat</p>
              {!filterStatus && <div className="mt-2 text-[10px] opacity-70">✓ Filter Aktif</div>}
           </div>

           {Object.entries(stats.byStatus).map(([status, count]) => {
             const config = statusConfig[status] || statusConfig["Belum Ada Status"];
             const isActive = filterStatus === status;
             return (
               <div key={status} onClick={() => setFilterStatus(status)} className={`cursor-pointer card p-6 border-2 transition-all duration-200 flex flex-col justify-between ${isActive ? `ring-4 ring-offset-2 ${config.border} border-current shadow-2xl scale-[1.02]` : 'bg-white border-white hover:bg-slate-50 shadow-sm'}`}>
                  <div className="flex justify-between items-start">
                     <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${config.bg} ${config.text}`}>{config.icon}</div>
                     <span className="text-3xl font-black text-slate-800">{count}</span>
                  </div>
                  <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4 truncate">{status}</p>
                     <div className="w-full bg-slate-100 h-1.5 mt-2 rounded-full overflow-hidden">
                        <div className={`h-full ${config.color}`} style={{ width: `${(count/stats.total)*100}%` }}></div>
                     </div>
                  </div>
               </div>
             )
           })}
        </div>

        {/* Pipeline Bar */}
        <div className="card p-10 bg-white border border-slate-100 rounded-[3rem] shadow-xl shadow-slate-200/40 mb-10">
           <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></div>
                 <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">PIPELINE PROGRES KANDIDAT</h2>
              </div>
              <div className="bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full text-xs font-black">Total: {stats.total} Kandidat</div>
           </div>
           <div className="flex h-10 w-full rounded-2xl overflow-hidden border-4 border-slate-50 shadow-inner">
              {Object.entries(stats.byStatus).map(([status, count]) => (
                count > 0 && <div key={status} className={`${statusConfig[status]?.color || 'bg-slate-300'} h-full border-r-2 border-white/20`} style={{ width: `${(count/stats.total)*100}%` }}></div>
              ))}
           </div>
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-8">
              {Object.entries(stats.byStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between p-3 rounded-xl border border-slate-50">
                   <div className="flex items-center gap-2 truncate">
                      <div className={`w-2.5 h-2.5 rounded-full ${statusConfig[status]?.color}`}></div>
                      <span className="text-[9px] font-black text-slate-500 uppercase truncate">{status}</span>
                   </div>
                   <span className="text-[10px] font-black text-slate-800 ml-2">{count}</span>
                </div>
              ))}
           </div>
        </div>

        {/* NEW: DASHBOARD BIDANG KERJA */}
        <div className="card p-10 bg-white border border-slate-100 rounded-[3rem] shadow-xl shadow-slate-200/40 mb-10">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8 text-center">KATEGORI BIDANG KERJA (SEKTOR SSW)</p>
           <div className="flex flex-wrap justify-center gap-3">
              <div onClick={() => setFilterBidang("")} className={`cursor-pointer px-6 py-3 rounded-2xl border-2 transition-all font-black text-[10px] uppercase tracking-widest ${!filterBidang ? 'bg-slate-900 border-slate-900 text-white' : 'bg-slate-50 border-transparent text-slate-400 hover:border-slate-200'}`}>Semua Bidang</div>
              {Object.entries(stats.byBidang).sort((a,b)=>b[1]-a[1]).map(([b, count]) => (
                <div key={b} onClick={() => setFilterBidang(b)} className={`cursor-pointer px-6 py-3 rounded-2xl border-2 transition-all flex items-center gap-3 ${filterBidang === b ? 'bg-purple-600 border-purple-200 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-600 hover:border-purple-300'}`}>
                   <span className="text-[10px] font-black uppercase">{b}</span>
                   <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black ${filterBidang === b ? 'bg-white/20 text-white' : 'bg-purple-50 text-purple-600'}`}>{count}</span>
                </div>
              ))}
           </div>
        </div>

        {/* Quick Search \u0026 Table */}
        <div className="card overflow-hidden !p-0 border border-slate-100 shadow-2xl rounded-[3rem] bg-white">
           <div className="p-8 border-b border-slate-50 flex gap-4 bg-white sticky top-0 z-20">
              <input className="flex-1 h-14 bg-slate-50 border-none rounded-2xl px-6 font-black text-sm text-slate-800" placeholder="Cari nama kandidat, TSK, atau perusahaan..." value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} />
              <div className="flex items-center px-6 bg-slate-50 rounded-2xl border-none">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-4">Filter Aktif:</span>
                 <span className="text-indigo-600 font-black text-[11px] uppercase">{filterStatus || "SEMUA STATUS"} ({filteredCandidates.length})</span>
              </div>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead>
                    <tr className="bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest">
                       <th className="py-7 px-8">Kandidat</th>
                       <th className="py-7 px-8">Status Progres</th>
                       <th className="py-7 px-8">Keterangan</th>
                       <th className="py-7 px-8 text-center">Aksi</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {filteredCandidates.map(c => (
                      <tr key={c.id} className="hover:bg-indigo-50/20 transition-all cursor-default group">
                         <td className="py-5 px-8">
                            <div className="flex items-center gap-4">
                               <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-md ring-4 ring-white shrink-0"><DriveImage url={c.pasPhoto} alt={c.namaLengkap} size="w-full h-full" className="rounded-2xl" /></div>
                               <div><p className="font-black text-slate-800 uppercase text-xs">{c.namaLengkap}</p><p className="text-[10px] text-slate-400 font-black uppercase mt-1.5">{c.bidangKerja} ΓÇó "{c.namaPanggilan}"</p></div>
                            </div>
                         </td>
                         <td className="py-5 px-8"><span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border-2 ${statusConfig[c.statusProgres]?.bg || 'bg-slate-50'} ${statusConfig[c.statusProgres]?.text || 'text-slate-500'} ${statusConfig[c.statusProgres]?.border || 'border-slate-100'}`}>{c.statusProgres || "BELUM ADA STATUS"}</span></td>
                         <td className="py-5 px-8 max-w-[300px]"><p className="text-[10px] text-slate-500 font-medium leading-relaxed italic line-clamp-2 uppercase">{c.keteranganProgres || "-"}</p></td>
                         <td className="py-5 px-8 text-center">
                            <Link href={`/admin/edit/${c.id}`} className="inline-block p-3.5 bg-slate-900 text-white rounded-2xl hover:bg-indigo-600 transition-all shadow-xl active:scale-95"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></Link>
                         </td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 10px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </>
  );
}
