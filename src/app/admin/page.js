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
  const [filterKategori, setFilterKategori] = useState("");

  useEffect(() => {
    if (!authLoading && (!user || !["admin", "viewer", "approval"].includes(userData?.role))) {
      router.push("/");
      return;
    }
    if (user && ["admin", "viewer", "approval"].includes(userData?.role)) {
      loadCandidates();
    }
  }, [user, userData, authLoading]);

  const loadCandidates = async () => {
    setRefreshing(true);
    try {
      const q = query(collection(db, "candidates"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

      data.sort((a, b) => {
        const getTimestamp = (item) => {
          const dateStr = item.updatedAt || item.submittedAt;
          if (!dateStr) return 0;
          const t = new Date(dateStr).getTime();
          return isNaN(t) ? 0 : t;
        };
        return getTimestamp(b) - getTimestamp(a);
      });

      setCandidates(data);
    } catch (err) {
      console.error("Error loading candidates:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      const matchSearch = !searchTerm ||
        c.namaLengkap?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.kodeJob?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.namaTsk?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.namaPerusahaanProgres?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.keteranganProgres?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchBidang = !filterBidang || c.bidangKerja === filterBidang;
      const matchKategori = !filterKategori || c.kategoriKandidat === filterKategori;

      let matchStatus = true;
      if (filterStatus === "Belum Ada Status") {
        matchStatus = !c.statusProgres;
      } else if (filterStatus) {
        matchStatus = c.statusProgres === filterStatus;
      }

      return matchSearch && matchBidang && matchKategori && matchStatus;
    });
  }, [candidates, searchTerm, filterStatus, filterBidang, filterKategori]);

  const stats = useMemo(() => {
    const summary = {
      total: candidates.length,
      filteredTotal: filteredCandidates.length,
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
      byBidang: {},
      byCategory: {}
    };

    candidates.forEach(c => {
      const status = c.statusProgres;
      if (status && summary.byStatus.hasOwnProperty(status)) {
        summary.byStatus[status]++;
      } else if (!status) {
        summary.byStatus["Belum Ada Status"]++;
      }
      const bidang = c.bidangKerja || "Tidak Diketahui";
      summary.byBidang[bidang] = (summary.byBidang[bidang] || 0) + 1;
      const cat = c.kategoriKandidat || "Lainnya";
      summary.byCategory[cat] = (summary.byCategory[cat] || 0) + 1;
    });

    return summary;
  }, [candidates, filteredCandidates]);

  const uniqueBidang = useMemo(() => [...new Set(candidates.map(c => c.bidangKerja).filter(Boolean))].sort(), [candidates]);
  const uniqueKategori = useMemo(() => [...new Set(candidates.map(c => c.kategoriKandidat).filter(Boolean))].sort(), [candidates]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const statusConfig = {
    "Nihongo check": { color: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-100", icon: "v" },
    "Belum Lolos Nihongo check": { color: "bg-rose-500", text: "text-rose-700", bg: "bg-rose-50", border: "border-rose-100", icon: "x" },
    "Pending Nunggu Job": { color: "bg-orange-500", text: "text-orange-700", bg: "bg-orange-50", border: "border-orange-100", icon: "!" },
    "Penjadwalan Interview": { color: "bg-violet-500", text: "text-violet-700", bg: "bg-violet-50", border: "border-violet-100", icon: "cal" },
    "On Proses": { color: "bg-sky-500", text: "text-sky-700", bg: "bg-sky-50", border: "border-sky-100", icon: "★" },
    "Tidak Lolos Interview": { color: "bg-pink-500", text: "text-pink-700", bg: "bg-pink-50", border: "border-pink-100", icon: "x" },
    "Status On Job (Selesai)": { color: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-100", icon: "check" },
    "Cancel": { color: "bg-gray-500", text: "text-gray-700", bg: "bg-gray-50", border: "border-gray-100", icon: "x" },
    "Belum Ada Status": { color: "bg-slate-400", text: "text-slate-600", bg: "bg-slate-50", border: "border-slate-100", icon: "?" }
  };

  return (
    <>
      <Navbar />
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 bg-[#F8F9FC] min-h-screen">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 uppercase tracking-tighter">Dashboard Statistik</h1>
            <p className="text-gray-500 text-sm sm:text-base font-bold uppercase tracking-widest mt-1">Ringkasan data kandidat portal CV IJEF</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadCandidates}
              disabled={refreshing}
              className="bg-white border border-gray-200 text-gray-800 px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest shadow-sm hover:bg-gray-50 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {refreshing && <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600"></div>}
              Refresh Data
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
          <div
            onClick={() => setFilterStatus("")}
            className={`cursor-pointer card p-6 relative overflow-hidden transition-all duration-300 ${!filterStatus ? "bg-indigo-900 text-white shadow-2xl scale-[1.02]" : "bg-white border-transparent hover:border-indigo-100 shadow-sm"}`}
          >
            <div className="flex justify-between items-start">
              <div className={`p-3 rounded-xl ${!filterStatus ? "bg-white/20" : "bg-indigo-50"}`}>
                <svg className={`w-8 h-8 ${!filterStatus ? "text-white" : "text-indigo-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              </div>
              <span className={`text-4xl font-black ${!filterStatus ? "text-white" : "text-gray-900"}`}>{stats.total}</span>
            </div>
            <h3 className={`mt-6 text-[10px] font-black uppercase tracking-widest ${!filterStatus ? "text-white/80" : "text-gray-400"}`}>Total Kandidat</h3>
          </div>

          {Object.entries(stats.byStatus).map(([status, count]) => {
            const config = statusConfig[status] || statusConfig["Belum Ada Status"];
            const isActive = filterStatus === status;
            return (
              <div
                key={status}
                onClick={() => setFilterStatus(prev => prev === status ? "" : status)}
                className={`cursor-pointer card p-6 border-2 transition-all duration-200 flex flex-col justify-between rounded-[2rem] ${isActive ? `ring-4 ring-offset-2 ${config.border} border-current shadow-2xl scale-102` : `bg-white ${config.border} hover:bg-gray-50 border-gray-100 shadow-sm`}`}
              >
                <div className="flex justify-between items-start">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl ${config.bg} ${config.text}`}>
                     {config.icon}
                  </div>
                  <span className="text-4xl font-black text-gray-900">{count}</span>
                </div>
                <div>
                  <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mt-4 line-clamp-1">{status}</h3>
                  <div className="w-full bg-gray-100 h-2 mt-2 rounded-full overflow-hidden">
                    <div className={`h-full ${config.color}`} style={{ width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%` }}></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="card p-10 mb-10 border border-indigo-50 shadow-2xl bg-white rounded-[3rem]">
          <div className="flex justify-between items-center mb-10">
            <div className="flex items-center gap-4">
               <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
               </div>
               <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Pipeline Progres Kandidat</h2>
            </div>
            <div className="bg-indigo-50 text-indigo-700 px-6 py-2 rounded-full text-sm font-black uppercase tracking-widest">
               Total: {stats.total} Kandidat
            </div>
          </div>

          <div className="w-full h-12 bg-gray-100 rounded-3xl overflow-hidden flex mb-12 shadow-inner border-4 border-slate-50">
            {Object.entries(stats.byStatus).map(([status, count]) => {
              if (count === 0) return null;
              const config = statusConfig[status] || statusConfig["Belum Ada Status"];
              const percent = (count / stats.total) * 100;
              return (
                <div key={status} className={`${config.color} h-full border-r-2 border-white/20 relative group`} style={{ width: `${percent}%` }}>
                  {percent > 5 && <span className="flex items-center justify-center h-full text-[11px] font-black text-white drop-shadow-md">{Math.round(percent)}%</span>}
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Object.entries(stats.byStatus).map(([status, count]) => {
              const config = statusConfig[status];
              const percent = stats.total > 0 ? (count / stats.total) * 100 : 0;
              return (
                <div key={status} onClick={() => setFilterStatus(prev => prev === status ? "" : status)} className={`p-4 rounded-[1.5rem] border-2 transition-all cursor-pointer ${filterStatus === status ? `${config.bg} ${config.border} ring-4 ring-offset-0 ring-indigo-200 shadow-lg` : "bg-white border-gray-50 hover:bg-gray-50"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-3 h-3 rounded-full ${config.color}`}></div>
                    <span className="text-[10px] font-black text-gray-600 uppercase truncate">{status}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-xl font-black text-gray-800">{count} <span className="text-[10px] opacity-40 font-bold">Orang</span></span>
                    <span className="text-[11px] font-black text-gray-400">{percent.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
           <div className="card p-6 border border-gray-100 shadow-xl bg-white rounded-[2rem]">
             <div className="flex justify-between items-center mb-8 text-xl font-black text-gray-800 uppercase">BERDASARKAN BIDANG KERJA</div>
             <div className="space-y-5 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
               {Object.entries(stats.byBidang).sort((a, b) => b[1] - a[1]).map(([bidang, count]) => (
                 <div key={bidang} onClick={() => setFilterBidang(prev => prev === bidang ? "" : bidang)} className={`cursor-pointer group rounded-xl p-3 transition-all ${filterBidang === bidang ? "bg-blue-50 shadow-sm" : "hover:bg-gray-50"}`}>
                   <div className="flex justify-between text-sm font-black uppercase mb-2">
                     <span className={filterBidang === bidang ? "text-blue-700" : "text-gray-700"}>{bidang}</span>
                     <span>{count} Kandidat ({Math.round((count/stats.total)*100)}%)</span>
                   </div>
                   <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                     <div className={`h-full transition-all duration-500 ${filterBidang === bidang ? "bg-blue-600" : "bg-blue-400"}`} style={{ width: `${(count / stats.total) * 100}%` }}></div>
                   </div>
                 </div>
               ))}
             </div>
           </div>

           <div className="card p-6 border border-gray-100 shadow-xl bg-white rounded-[2rem]">
              <div className="flex justify-between items-center mb-8 text-xl font-black text-gray-800 uppercase">BERDASARKAN KATEGORI</div>
              <div className="space-y-6">
                {Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
                  <div key={cat} onClick={() => setFilterKategori(prev => prev === cat ? "" : cat)} className={`cursor-pointer group flex items-center p-5 rounded-2xl border-2 transition-all ${filterKategori === cat ? "bg-purple-50 border-purple-200" : "bg-white border-transparent hover:bg-gray-50"}`}>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-4">
                        <span className="px-4 py-1.5 rounded-xl text-sm font-black uppercase tracking-widest bg-slate-50 text-slate-700">{cat}</span>
                        <span className="text-3xl font-black text-gray-800 leading-none">{count}</span>
                      </div>
                      <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 transition-all duration-700" style={{ width: `${(count / stats.total) * 100}%` }}></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
           </div>
        </div>

        <div className="card !p-0 overflow-hidden border-none shadow-2xl bg-white rounded-[3rem] mb-20">
          <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row gap-6 bg-white sticky top-0 z-20">
             <input className="flex-1 h-14 bg-slate-50 border-none rounded-2xl px-12 font-black text-base text-slate-800 outline-none" placeholder="Cari kandidat..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
             <select className="md:w-72 h-14 px-8 bg-slate-50 border-none rounded-2xl text-xs font-black uppercase tracking-widest text-slate-800 outline-none" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">Semua Status ({stats.total})</option>
                {Object.keys(stats.byStatus).map(s => <option key={s} value={s}>{s}</option>)}
             </select>
          </div>
          <div className="overflow-x-auto px-8 pb-8">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-900 text-white font-black text-[11px] uppercase tracking-widest">
                  <th className="py-7 px-8 rounded-l-[2rem]">Kandidat</th>
                  <th className="py-7 px-8 text-center">Status</th>
                  <th className="py-7 px-8">Keterangan</th>
                  <th className="py-7 px-8 text-center rounded-r-[2rem]">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredCandidates.map((c) => {
                  const config = statusConfig[c.statusProgres] || statusConfig["Belum Ada Status"];
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 transition-all cursor-default">
                      <td className="py-5 px-8">
                        <div className="flex items-center gap-5">
                           <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg ring-4 ring-white shrink-0"><DriveImage url={c.pasPhoto} alt={c.namaLengkap} size="w-full h-full" className="rounded-xl" /></div>
                           <div><h4 className="text-sm font-black text-slate-900 uppercase">{c.namaLengkap}</h4><p className="text-[10px] text-slate-400 font-bold uppercase mt-2">{c.namaPanggilan} • {c.bidangKerja}</p></div>
                        </div>
                      </td>
                      <td className="py-5 px-8 text-center"><span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border ${config.bg} ${config.text} ${config.border}`}>{c.statusProgres || "BELUM ADA"}</span></td>
                      <td className="py-5 px-8 max-w-[350px]"><p className="text-[11px] text-slate-500 font-medium leading-relaxed italic line-clamp-2 uppercase">{c.keteranganProgres || "-"}</p></td>
                      <td className="py-5 px-8 text-center">
                        <div className="flex justify-center gap-4">
                          <Link href={`/admin/edit/${c.id}`} className="p-3.5 bg-slate-900 text-white rounded-2xl hover:bg-indigo-600 transition-all shadow-xl active:scale-95"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></Link>
                          <Link href={`/admin/cv/${c.id}`} className="p-3.5 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #CBD5E1; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .card { animation: fadeIn 0.4s ease-out forwards; }
      `}</style>
    </>
  );
}
