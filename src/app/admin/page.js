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
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setCandidates(data);
    } catch (err) { console.error(err); }
    setLoading(false); setRefreshing(false);
  };

  // Filter Logic
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      const matchSearch = !searchTerm || c.namaLengkap?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = !filterStatus || (filterStatus === "Belum Ada Status" ? !c.statusProgres : c.statusProgres === filterStatus);
      return matchSearch && matchStatus;
    });
  }, [candidates, searchTerm, filterStatus]);

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
      <div className="max-w-full mx-auto px-6 py-8 bg-[#F8F9FC] min-h-screen font-sans">
        <div className="flex justify-between items-center mb-8">
           <div>
              <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">DASHBOARD STATISTIK ADMIN</h1>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">International Japan Employment Foundation</p>
           </div>
           <button onClick={loadCandidates} className="bg-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-sm hover:bg-slate-50 border border-slate-100 transition-all">REFRESH DATA</button>
        </div>

        {/* Status Grid v3.0 Style */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
           <div onClick={() => setFilterStatus("")} className={`cursor-pointer p-6 rounded-[2.5rem] border-4 transition-all ${!filterStatus ? 'bg-slate-900 text-white shadow-2xl scale-105' : 'bg-white border-white shadow-sm'}`}>
              <p className="text-[10px] font-black uppercase opacity-60">TOTAL KANDIDAT</p>
              <h3 className="text-4xl font-black mt-1">{stats.total}</h3>
           </div>
           {Object.entries(stats.byStatus).map(([status, count]) => {
             const isActive = filterStatus === status;
             return (
               <div key={status} onClick={() => setFilterStatus(status)} className={`cursor-pointer p-6 rounded-[2.5rem] border-4 transition-all ${isActive ? 'bg-indigo-600 border-indigo-200 text-white shadow-2xl scale-105' : 'bg-white border-white shadow-sm hover:border-indigo-50'}`}>
                  <p className="text-[10px] font-black uppercase opacity-60 truncate">{status}</p>
                  <h3 className="text-2xl font-black mt-1">{count}</h3>
               </div>
             )
           })}
        </div>

        {/* Pipeline Progress */}
        <div className="card p-10 bg-white border border-slate-100 rounded-[3rem] shadow-xl shadow-slate-200/40 mb-10">
           <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-8">PIPELINE PROGRES KANDIDAT</h2>
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

        {/* Quick Table */}
        <div className="card overflow-hidden !p-0 border border-slate-100 shadow-2xl rounded-[3rem] bg-white">
           <div className="p-8 border-b border-slate-50">
              <input className="w-full h-14 bg-slate-50 border-none rounded-2xl px-6 font-bold text-sm" placeholder="Cari kandidat..." value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} />
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead>
                    <tr className="bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest">
                       <th className="py-6 px-8">Kandidat</th>
                       <th className="py-6 px-8">Status Terkini</th>
                       <th className="py-6 px-8 text-center">Tindakan</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {filteredCandidates.slice(0, 15).map(c => (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                         <td className="py-4 px-8">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-xl overflow-hidden ring-2 ring-white shadow-sm shrink-0"><DriveImage url={c.pasPhoto} alt={c.namaLengkap} size="w-full h-full" className="rounded-xl" /></div>
                               <div><p className="font-black text-slate-800 uppercase text-xs">{c.namaLengkap}</p><p className="text-[10px] text-slate-400 font-bold uppercase">{c.bidangKerja}</p></div>
                            </div>
                         </td>
                         <td className="py-4 px-8"><span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase border ${statusConfig[c.statusProgres]?.bg || 'bg-slate-50'} ${statusConfig[c.statusProgres]?.text || 'text-slate-500'}`}>{c.statusProgres || "BELUM ADA"}</span></td>
                         <td className="py-4 px-8 text-center">
                            <Link href={`/admin/edit/${c.id}`} className="inline-block p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></Link>
                         </td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      </div>
    </>
  );
}
