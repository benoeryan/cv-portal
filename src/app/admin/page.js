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
      // Status
      const st = c.statusProgres;
      if (st && s.byStatus.hasOwnProperty(st)) s.byStatus[st]++;
      else if (!st) s.byStatus["Belum Ada Status"]++;

      // Bidang
      const bd = c.bidangKerja || "LAINNYA";
      s.byBidang[bd] = (s.byBidang[bd] || 0) + 1;
    });
    return s;
  }, [candidates]);

  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      const matchSearch = !searchTerm || c.namaLengkap?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = !filterStatus || (filterStatus === "Belum Ada Status" ? !c.statusProgres : c.statusProgres === filterStatus);
      const matchBidang = !filterBidang || c.bidangKerja === filterBidang;
      return matchSearch && matchStatus && matchBidang;
    });
  }, [candidates, searchTerm, filterStatus, filterBidang]);

  const sortedBidang = useMemo(() => {
    return Object.entries(stats.byBidang).sort((a, b) => b[1] - a[1]);
  }, [stats.byBidang]);

  if (authLoading || loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  const statusConfig = {
    "Nihongo check": { color: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-100" },
    "Belum Lolos Nihongo check": { color: "bg-rose-500", text: "text-rose-700", bg: "bg-rose-50", border: "border-rose-100" },
    "Pending Nunggu Job": { color: "bg-orange-500", text: "text-orange-700", bg: "bg-orange-50", border: "border-orange-100" },
    "Penjadwalan Interview": { color: "bg-violet-500", text: "text-violet-700", bg: "bg-violet-50", border: "border-violet-100" },
    "On Proses": { color: "bg-sky-500", text: "text-sky-700", bg: "bg-sky-50", border: "border-sky-100" },
    "Tidak Lolos Interview": { color: "bg-pink-500", text: "text-pink-700", bg: "bg-pink-50", border: "border-pink-100" },
    "Status On Job (Selesai)": { color: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-100" },
    "Cancel": { color: "bg-gray-500", text: "text-gray-700", bg: "bg-gray-50", border: "border-gray-100" },
    "Belum Ada Status": { color: "bg-slate-400", text: "text-slate-600", bg: "bg-slate-50", border: "border-slate-100" }
  };

  return (
    <>
      <Navbar />
      <div className="max-w-full mx-auto px-6 py-10 bg-[#F8F9FC] min-h-screen font-sans flex flex-col">
        <div className="flex justify-between items-center mb-8 shrink-0">
           <div>
              <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">DASHBOARD STATISTIK ADMIN</h1>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Ringkasan data kandidat portal CV IJEF</p>
           </div>
           <button onClick={loadCandidates} className="bg-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-sm hover:bg-slate-50 border border-slate-100 transition-all">REFRESH DATA</button>
        </div>

        {/* Status Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-10 shrink-0">
           <div onClick={() => {setFilterStatus(""); setFilterBidang("");}} className={`cursor-pointer p-6 rounded-[2.5rem] border-4 transition-all flex flex-col justify-center ${(!filterStatus && !filterBidang) ? 'bg-slate-900 border-slate-700 text-white shadow-2xl scale-105' : 'bg-white border-white shadow-sm'}`}>
              <p className="text-[10px] font-black uppercase opacity-60 tracking-widest">TOTAL KANDIDAT</p>
              <h3 className="text-4xl font-black mt-1">{stats.total}</h3>
           </div>
           {Object.entries(stats.byStatus).map(([status, count]) => {
             const isActive = filterStatus === status;
             return (
               <div key={status} onClick={() => setFilterStatus(status)} className={`cursor-pointer p-6 rounded-[2.5rem] border-4 transition-all flex flex-col justify-center ${isActive ? 'bg-indigo-600 border-indigo-200 text-white shadow-2xl scale-105' : 'bg-white border-white shadow-sm hover:border-indigo-50'}`}>
                  <p className="text-[10px] font-black uppercase opacity-60 tracking-widest truncate">{status}</p>
                  <h3 className="text-2xl font-black mt-1">{count}</h3>
               </div>
             )
           })}
        </div>

        {/* Pipeline Progress */}
        <div className="card p-10 bg-white border border-slate-100 rounded-[3rem] shadow-xl shadow-slate-200/40 mb-10 shrink-0">
           <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8">PIPELINE PROGRES KANDIDAT</h2>
           <div className="flex h-10 w-full rounded-2xl overflow-hidden border-4 border-slate-50">
              {Object.entries(stats.byStatus).map(([status, count]) => (
                count > 0 && <div key={status} className={`${statusConfig[status]?.color || 'bg-slate-300'} h-full border-r-2 border-white/20`} style={{ width: `${(count/stats.total)*100}%` }}></div>
              ))}
           </div>
           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-2 mt-8">
              {Object.entries(statusConfig).map(([status, config]) => (
                <div key={status} className="flex items-center gap-2">
                   <div className={`w-3 h-3 rounded-full ${config.color}`}></div>
                   <span className="text-[8px] font-black text-slate-500 uppercase truncate">{status}</span>
                </div>
              ))}
           </div>
        </div>

        {/* Dashboard Bidang Kerja / Sektor */}
        <div className="card p-10 bg-white border border-slate-100 rounded-[3rem] shadow-xl shadow-slate-200/40 mb-10 shrink-0">
           <div className="flex justify-between items-center mb-8">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">KATEGORI BIDANG KERJA (SEKTOR SSW)</h2>
              <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase">Klik Sektor untuk Filter</span>
           </div>
           <div className="flex flex-wrap gap-4">
              <div
                onClick={() => setFilterBidang("")}
                className={`cursor-pointer px-6 py-3 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${!filterBidang ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-slate-50 border-transparent text-slate-400 hover:border-slate-200'}`}
              >
                Semua Bidang
              </div>
              {sortedBidang.map(([bidang, count]) => (
                <div
                  key={bidang}
                  onClick={() => setFilterBidang(bidang)}
                  className={`cursor-pointer px-6 py-3 rounded-2xl border-2 flex items-center gap-4 transition-all ${filterBidang === bidang ? 'bg-purple-600 border-purple-300 text-white shadow-xl scale-105' : 'bg-white border-slate-100 text-slate-700 hover:border-purple-200'}`}
                >
                   <span className="text-[10px] font-black uppercase tracking-tight">{bidang}</span>
                   <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${filterBidang === bidang ? 'bg-white/20 text-white' : 'bg-purple-50 text-purple-600'}`}>{count}</span>
                </div>
              ))}
           </div>
        </div>

        {/* Candidate List - Full screen height layout */}
        <div className="flex-1 flex flex-col min-h-0 card !p-0 border border-slate-100 shadow-2xl rounded-[3rem] bg-white overflow-hidden">
           <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row gap-6 shrink-0 bg-white">
              <div className="flex-1 relative">
                 <input className="w-full h-16 bg-slate-50 border-none rounded-[2rem] px-12 font-black text-lg text-slate-800 outline-none focus:ring-4 focus:ring-indigo-100 transition-all" placeholder="Cari kandidat, perusahaan, atau TSK..." value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} />
                 <svg className="w-6 h-6 absolute left-4 top-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              {(filterStatus || filterBidang || searchTerm) && (
                 <button
                  onClick={()=>{setFilterStatus(""); setFilterBidang(""); setSearchTerm("");}}
                  className="bg-rose-50 text-rose-600 px-10 h-16 rounded-[2rem] font-black uppercase text-[11px] tracking-widest border border-rose-100 hover:bg-rose-100 transition-all active:scale-95"
                 >
                   RESET SEMUA FILTER ✕
                 </button>
              )}
           </div>

           <div className="overflow-x-auto flex-1 custom-scrollbar">
              <table className="w-full text-left border-collapse">
                 <thead>
                    <tr className="bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest sticky top-0 z-10">
                       <th className="py-7 px-8">Data Kandidat</th>
                       <th className="py-7 px-8">Status Progres</th>
                       <th className="py-7 px-8">Keterangan</th>
                       <th className="py-7 px-8 text-center">Tindakan</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {filteredCandidates.map(c => (
                      <tr key={c.id} className="hover:bg-indigo-50/30 transition-all cursor-default group">
                         <td className="py-6 px-8">
                            <div className="flex items-center gap-5">
                               <div className="w-16 h-16 rounded-3xl overflow-hidden shadow-xl ring-4 ring-white shrink-0 bg-slate-100"><DriveImage url={c.pasPhoto} alt={c.namaLengkap} size="w-full h-full" className="rounded-2xl" /></div>
                               <div><p className="font-black text-slate-900 uppercase text-sm leading-none">{c.namaLengkap}</p><p className="text-[11px] text-slate-400 font-bold uppercase mt-2">{c.bidangKerja} • "{c.namaPanggilan}"</p></div>
                            </div>
                         </td>
                         <td className="py-6 px-8"><span className={`px-5 py-2 rounded-full text-[10px] font-black uppercase border-2 ${statusConfig[c.statusProgres]?.bg || 'bg-slate-50'} ${statusConfig[c.statusProgres]?.text || 'text-slate-500'} ${statusConfig[c.statusProgres]?.border || 'border-slate-100'}`}>{c.statusProgres || "BELUM ADA STATUS"}</span></td>
                         <td className="py-6 px-8 max-w-[300px]">
                            <p className="text-[11px] text-slate-500 font-medium leading-relaxed italic line-clamp-2 uppercase">
                               {c.keteranganProgres || "-"}
                            </p>
                         </td>
                         <td className="py-6 px-8 text-center">
                            <Link href={`/admin/edit/${c.id}`} className="inline-block p-4 bg-slate-900 text-white rounded-[1.5rem] hover:bg-indigo-600 transition-all shadow-xl active:scale-95"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></Link>
                         </td>
                      </tr>
                    ))}
                    {filteredCandidates.length === 0 && (
                       <tr>
                          <td colSpan="4" className="py-32 text-center text-slate-300 font-black uppercase tracking-widest">Kandidat Tidak Ditemukan</td>
                       </tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94A3B8; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </>
  );
}
