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
      setCandidates(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
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
      }
    };
    candidates.forEach(c => {
      const st = c.statusProgres;
      if (st && s.byStatus.hasOwnProperty(st)) s.byStatus[st]++;
      else if (!st) s.byStatus["Belum Ada Status"]++;
    });
    return s;
  }, [candidates]);

  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      const matchSearch = !searchTerm || c.namaLengkap?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = !filterStatus || (filterStatus === "Belum Ada Status" ? !c.statusProgres : c.statusProgres === filterStatus);
      return matchSearch && matchStatus;
    });
  }, [candidates, searchTerm, filterStatus]);

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
      <div className="max-w-full mx-auto px-6 py-10 bg-[#F8F9FC] min-h-screen font-sans">
        <div className="flex justify-between items-center mb-10">
           <div>
              <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">DASHBOARD STATISTIK ADMIN</h1>
              <p className="text-slate-500 text-xs font-black uppercase tracking-[0.2em] mt-1">International Japan Employment Foundation</p>
           </div>
           <button onClick={loadCandidates} className="bg-white px-8 py-4 rounded-3xl font-black text-[11px] uppercase tracking-widest shadow-xl border-none hover:bg-slate-50 transition-all active:scale-95">REFRESH DATA</button>
        </div>

        {/* Status Grid Reverted and Colored */}
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
                  {!isActive && (
                    <div className="w-full bg-slate-100 h-1.5 mt-4 rounded-full overflow-hidden">
                       <div className={`h-full ${config.color}`} style={{ width: `${(count/stats.total)*100}%` }}></div>
                    </div>
                  )}
               </div>
             )
           })}
        </div>

        {/* Pipeline Bar */}
        <div className="card p-12 bg-white border border-slate-100 rounded-[4rem] shadow-2xl shadow-slate-200/40 mb-12">
           <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] mb-10 text-center">Visualisasi Pipeline Progres</h2>
           <div className="flex h-16 w-full rounded-[2rem] overflow-hidden border-[8px] border-slate-50 shadow-inner">
              {Object.entries(stats.byStatus).map(([status, count]) => (
                count > 0 && <div key={status} className={`${statusConfig[status]?.color || 'bg-slate-300'} h-full border-r-2 border-white/20`} style={{ width: `${(count/stats.total)*100}%` }} title={`${status}: ${count}`}></div>
              ))}
           </div>
           <div className="flex flex-wrap justify-center gap-6 mt-10">
              {Object.entries(statusConfig).map(([status, config]) => (
                <div key={status} className="flex items-center gap-3">
                   <div className={`w-4 h-4 rounded-full ${config.color} shadow-sm`}></div>
                   <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">{status}</span>
                </div>
              ))}
           </div>
        </div>

        {/* Quick Search */}
        <div className="card overflow-hidden !p-0 border border-slate-100 shadow-2xl rounded-[3rem] bg-white">
           <div className="p-10 border-b border-slate-50 flex gap-6">
              <input className="flex-1 h-16 bg-slate-50 border-none rounded-3xl px-8 font-black text-lg text-slate-800" placeholder="Cari Nama Kandidat..." value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} />
              {filterStatus && <button onClick={()=>setFilterStatus("")} className="bg-rose-50 text-rose-600 px-10 rounded-3xl font-black uppercase text-[11px] tracking-widest border border-rose-100 active:scale-95 transition-all">✕ Reset Filter</button>}
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead>
                    <tr className="bg-slate-900 text-white font-black text-[11px] uppercase tracking-[0.2em]">
                       <th className="py-8 px-10">Data Kandidat</th>
                       <th className="py-8 px-10">Sektor / Bidang</th>
                       <th className="py-8 px-10">Status Terakhir</th>
                       <th className="py-8 px-10 text-center">Aksi</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {filteredCandidates.slice(0, 15).map(c => (
                      <tr key={c.id} className="hover:bg-slate-50 transition-all cursor-default group">
                         <td className="py-6 px-10">
                            <div className="flex items-center gap-5">
                               <div className="w-14 h-14 rounded-[1.5rem] overflow-hidden shadow-lg ring-4 ring-white shrink-0"><DriveImage url={c.pasPhoto} alt={c.namaLengkap} size="w-full h-full" className="rounded-2xl" /></div>
                               <div><p className="font-black text-slate-900 uppercase text-sm leading-none">{c.namaLengkap}</p><p className="text-[11px] text-slate-400 font-bold uppercase mt-2">"{c.namaPanggilan}"</p></div>
                            </div>
                         </td>
                         <td className="py-6 px-10"><span className="text-[11px] font-black text-indigo-600 uppercase bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">{c.bidangKerja || "UMUM"}</span></td>
                         <td className="py-6 px-10"><span className={`px-5 py-2 rounded-full text-[10px] font-black uppercase border-2 ${statusConfig[c.statusProgres]?.bg || 'bg-slate-50'} ${statusConfig[c.statusProgres]?.text || 'text-slate-500'} ${statusConfig[c.statusProgres]?.border || 'border-slate-100'}`}>{c.statusProgres || "BELUM ADA STATUS"}</span></td>
                         <td className="py-6 px-10 text-center">
                            <Link href={`/admin/edit/${c.id}`} className="inline-block p-3.5 bg-slate-900 text-white rounded-2xl hover:bg-indigo-600 transition-all shadow-xl active:scale-95"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></Link>
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
