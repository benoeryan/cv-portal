"use client";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, doc, deleteDoc } from "firebase/firestore";
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

      // Default sorting: Newest first
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

  // Filter Logic
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

  // Dynamic Statistics
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
      // Status Stats
      const status = c.statusProgres;
      if (status && summary.byStatus.hasOwnProperty(status)) {
        summary.byStatus[status]++;
      } else if (!status) {
        summary.byStatus["Belum Ada Status"]++;
      }

      // Bidang Stats
      const bidang = c.bidangKerja || "Tidak Diketahui";
      summary.byBidang[bidang] = (summary.byBidang[bidang] || 0) + 1;

      // Category Stats
      const cat = c.kategoriKandidat || "Lainnya";
      summary.byCategory[cat] = (summary.byCategory[cat] || 0) + 1;
    });

    return summary;
  }, [candidates, filteredCandidates]);

  const uniqueBidang = useMemo(() => [...new Set(candidates.map(c => c.bidangKerja).filter(Boolean))].sort(), [candidates]);
  const uniqueKategori = useMemo(() => [...new Set(candidates.map(c => c.kategoriKandidat).filter(Boolean))].sort(), [candidates]);

  const toggleStatusFilter = (status) => {
    setFilterStatus(prev => prev === status ? "" : status);
  };

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
    "On Proses": { color: "bg-sky-500", text: "text-sky-700", bg: "bg-sky-50", border: "border-sky-100", icon: "☆" },
    "Tidak Lolos Interview": { color: "bg-pink-500", text: "text-pink-700", bg: "bg-pink-50", border: "border-pink-100", icon: "x" },
    "Status On Job (Selesai)": { color: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-100", icon: "check" },
    "Cancel": { color: "bg-gray-500", text: "text-gray-700", bg: "bg-gray-50", border: "border-gray-100", icon: "x" },
    "Belum Ada Status": { color: "bg-slate-400", text: "text-slate-600", bg: "bg-slate-50", border: "border-slate-100", icon: "?" }
  };

  return (
    <>
      <Navbar />
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 bg-[#F8F9FC] min-h-screen">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard Statistik</h1>
            <p className="text-gray-500 text-sm">Ringkasan data kandidat portal CV IJEF</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadCandidates}
              disabled={refreshing}
              className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {refreshing && <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600"></div>}
              {refreshing ? "Memperbarui..." : "Refresh Data"}
            </button>
          </div>
        </div>

        {/* Status Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <div
            onClick={() => setFilterStatus("")}
            className={`cursor-pointer card p-5 relative overflow-hidden transition-all duration-300 ${
              !filterStatus ? "bg-gradient-to-br from-[#2D1B69] to-[#4C2A9E] text-white shadow-xl scale-[1.02]" : "bg-white border-transparent hover:border-indigo-200"
            }`}
          >
            <div className="flex justify-between items-start">
              <div className={`p-2 rounded-lg ${!filterStatus ? "bg-white/20" : "bg-indigo-50"}`}>
                <svg className={`w-5 h-5 ${!filterStatus ? "text-white" : "text-indigo-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              </div>
              <span className={`text-xl font-bold ${!filterStatus ? "text-white" : "text-gray-900"}`}>{stats.total}</span>
            </div>
            <h3 className={`mt-4 text-xs font-bold uppercase tracking-wider ${!filterStatus ? "text-white/80" : "text-gray-400"}`}>Total Kandidat</h3>
            <div className="mt-2 flex items-center text-[10px] opacity-70">
              <span className="flex-1">✓ Filter Aktif</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 17L17 7M17 7H7M17 7V17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>

          {Object.entries(stats.byStatus).map(([status, count]) => {
            const config = statusConfig[status] || statusConfig["Belum Ada Status"];
            const isActive = filterStatus === status;
            return (
              <div
                key={status}
                onClick={() => toggleStatusFilter(status)}
                className={`cursor-pointer card p-4 border-2 transition-all duration-200 flex flex-col justify-between ${
                  isActive ? `ring-2 ring-offset-1 ${config.border} border-current shadow-lg scale-[1.02]` : `bg-white ${config.border} hover:bg-gray-50 border-gray-100`
                }`}
                style={{ borderColor: isActive ? undefined : 'transparent' }}
              >
                <div className="flex justify-between items-start">
                  <div className={`p-1.5 rounded-lg ${config.bg} ${config.text}`}>
                     <span className="font-bold text-xs">{config.icon === 'v' ? 'N' : config.icon === 'cal' ? '📅' : config.icon}</span>
                  </div>
                  <span className="text-xl font-bold text-gray-900">{count}</span>
                </div>
                <div>
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-3 line-clamp-1">{status}</h3>
                  <div className="w-full bg-gray-100 h-1.5 mt-2 rounded-full overflow-hidden">
                    <div className={`h-full ${config.color}`} style={{ width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%` }}></div>
                  </div>
                  <div className="mt-2 text-[9px] text-gray-400 flex justify-between">
                    <span>Filter Status</span>
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 17L17 7M17 7H7M17 7V17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pipeline Distribution Section */}
        <div className="card p-6 mb-8 border border-indigo-50 shadow-sm bg-white">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
               </div>
               <div>
                  <h2 className="text-lg font-bold text-gray-800">Distribusi Progres Pipeline Kandidat</h2>
                  <p className="text-xs text-gray-400">Visualisasi tahapan seleksi & status seluruh kandidat</p>
               </div>
            </div>
            <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">
               Total: {stats.total} Kandidat
            </div>
          </div>

          {/* Pipeline Bar */}
          <div className="w-full h-8 bg-gray-100 rounded-lg overflow-hidden flex mb-8 shadow-inner border border-gray-50">
            {Object.entries(stats.byStatus).map(([status, count]) => {
              if (count === 0) return null;
              const config = statusConfig[status] || statusConfig["Belum Ada Status"];
              const percent = (count / stats.total) * 100;
              return (
                <div
                  key={status}
                  className={`${config.color} h-full border-r border-white/20 last:border-0 relative group cursor-help`}
                  style={{ width: `${percent}%` }}
                >
                  <div className="hidden group-hover:flex absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10 shadow-xl">
                    {status}: {count} ({Math.round(percent)}%)
                  </div>
                  {percent > 5 && (
                    <span className="flex items-center justify-center h-full text-[10px] font-bold text-white drop-shadow-md">
                      {Math.round(percent)}%
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pipeline Legend Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {Object.entries(stats.byStatus).map(([status, count]) => {
              const config = statusConfig[status];
              const percent = stats.total > 0 ? (count / stats.total) * 100 : 0;
              return (
                <div
                  key={status}
                  onClick={() => toggleStatusFilter(status)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    filterStatus === status ? `${config.bg} ${config.border} ring-1 ring-offset-0 ring-indigo-200` : "bg-white border-gray-50 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${config.color}`}></div>
                    <span className="text-[10px] font-bold text-gray-600 truncate">{status}</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <div className={`${config.bg} ${config.text} px-2 py-0.5 rounded text-[10px] font-bold`}>
                      {count} Orang
                    </div>
                    <span className="text-[10px] font-bold text-gray-400">{percent.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Filters and List Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
           {/* Bidang Kerja Table */}
           <div className="card p-5 border border-gray-100 shadow-sm">
             <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                   <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                   <h3 className="text-sm font-bold text-gray-800 uppercase tracking-tight">Berdasarkan Bidang Kerja</h3>
                </div>
                <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded-full">{uniqueBidang.length} Sektor</span>
             </div>
             <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
               {Object.entries(stats.byBidang)
                 .sort((a, b) => b[1] - a[1])
                 .map(([bidang, count]) => (
                 <div
                   key={bidang}
                   onClick={() => setFilterBidang(prev => prev === bidang ? "" : bidang)}
                   className={`cursor-pointer group rounded-lg p-2 transition-colors ${filterBidang === bidang ? "bg-blue-50" : "hover:bg-gray-50"}`}
                 >
                   <div className="flex justify-between text-[11px] mb-1.5">
                     <span className={`font-bold transition-colors ${filterBidang === bidang ? "text-blue-700" : "text-gray-700 group-hover:text-blue-600"}`}>{bidang}</span>
                     <span className="text-gray-400 font-medium">{count} Kandidat ({Math.round((count/stats.total)*100)}%)</span>
                   </div>
                   <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                     <div
                       className={`h-full transition-all ${filterBidang === bidang ? "bg-blue-600" : "bg-blue-400 group-hover:bg-blue-500"}`}
                       style={{ width: `${(count / stats.total) * 100}%` }}
                     ></div>
                   </div>
                 </div>
               ))}
             </div>
           </div>

           {/* Kategori & List Wrapper */}
           <div className="lg:col-span-2 flex flex-col gap-8">
              <div className="card p-5 border border-gray-100 shadow-sm flex-1">
                <div className="flex justify-between items-center mb-6">
                   <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                      <h3 className="text-sm font-bold text-gray-800 uppercase tracking-tight">Berdasarkan Kategori</h3>
                   </div>
                   <span className="text-[10px] font-bold bg-purple-50 text-purple-600 px-2 py-1 rounded-full">{uniqueKategori.length} Kategori Utama</span>
                </div>
                <div className="space-y-6">
                  {Object.entries(stats.byCategory)
                    .sort((a, b) => b[1] - a[1])
                    .map(([cat, count]) => (
                    <div
                      key={cat}
                      onClick={() => setFilterKategori(prev => prev === cat ? "" : cat)}
                      className={`cursor-pointer group flex items-center p-3 rounded-xl border transition-all ${
                        filterKategori === cat ? "bg-purple-50 border-purple-200 shadow-sm" : "bg-white border-transparent hover:border-gray-100 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-3">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${
                            cat === "NEW COMER" ? "bg-green-100 text-green-700" :
                            cat === "EX-MAGANG/EX-TRAINEER" ? "bg-purple-100 text-purple-700" :
                            "bg-orange-100 text-orange-700"
                          }`}>{cat}</span>
                          <span className="text-lg font-black text-gray-800">{count}</span>
                        </div>
                        <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              cat === "NEW COMER" ? "bg-green-500" :
                              cat === "EX-MAGANG/EX-TRAINEER" ? "bg-purple-500" :
                              "bg-orange-500"
                            }`}
                            style={{ width: `${(count / stats.total) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t border-gray-100">
                  <button
                    onClick={() => {
                       setFilterStatus("");
                       setFilterBidang("");
                       setFilterKategori("");
                       setSearchTerm("");
                    }}
                    className="w-full py-3 bg-[#6366F1] text-white font-bold rounded-xl hover:bg-[#4F46E5] transition-all shadow-md shadow-indigo-200"
                  >
                    Lihat Detail Semua Kandidat →
                  </button>
                </div>
              </div>
           </div>
        </div>

        {/* Dynamic Candidate List Table */}
        <div className="card !p-0 overflow-hidden border border-gray-100 shadow-xl bg-white rounded-2xl mb-20">
          <div className="p-6 border-b border-gray-100 bg-white sticky top-0 z-20">
             <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                   <svg className="w-4 h-4 absolute left-3 top-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                   <input
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Cari nama kandidat, TSK, perusahaan, atau keterangan progres..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                   />
                </div>
                <div className="flex gap-2">
                   <select
                      className="bg-gray-50 border-none rounded-xl text-xs font-bold px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                   >
                      <option value="">Semua Status ({stats.total})</option>
                      {Object.keys(stats.byStatus).map(s => <option key={s} value={s}>{s}</option>)}
                   </select>
                   <select
                      className="bg-gray-50 border-none rounded-xl text-xs font-bold px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                      value={filterBidang}
                      onChange={(e) => setFilterBidang(e.target.value)}
                   >
                      <option value="">Semua Bidang Kerja</option>
                      {uniqueBidang.map(b => <option key={b} value={b}>{b}</option>)}
                   </select>
                </div>
             </div>
             <div className="mt-4 flex justify-between items-center">
                <p className="text-xs font-bold text-gray-400">Menampilkan <span className="text-indigo-600">{filteredCandidates.length}</span> dari {stats.total} kandidat</p>
                {(filterStatus || filterBidang || filterKategori || searchTerm) && (
                   <button onClick={() => {
                      setFilterStatus("");
                      setFilterBidang("");
                      setFilterKategori("");
                      setSearchTerm("");
                   }} className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-700">Hapus Semua Filter</button>
                )}
             </div>
          </div>

          <div className="overflow-x-auto overflow-y-auto max-h-[800px] custom-scrollbar relative">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1E293B] text-white sticky top-0 z-30">
                  <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest bg-[#1E293B]">Kandidat</th>
                  <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest bg-[#1E293B]">Status Progres</th>
                  <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest bg-[#1E293B]">Keterangan Progres</th>
                  <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest bg-[#1E293B]">Perusahaan & Lokasi JP</th>
                  <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest bg-[#1E293B]">Nama TSK</th>
                  <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest bg-[#1E293B]">Target Keberangkatan</th>
                  <th className="py-4 px-6 text-center text-[10px] font-black uppercase tracking-widest bg-[#1E293B]">Direct Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCandidates.map((c) => {
                  const config = statusConfig[c.statusProgres] || statusConfig["Belum Ada Status"];
                  return (
                    <tr key={c.id} className="hover:bg-indigo-50/30 transition-colors group">
                      <td className="py-5 px-6">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden ring-2 ring-white shadow-sm shrink-0">
                              <DriveImage url={c.pasPhoto || c.sertifikatBahasaJepang} alt={c.namaLengkap} />
                           </div>
                           <div className="min-w-0">
                              <h4 className="text-xs font-black text-gray-800 uppercase truncate leading-tight group-hover:text-indigo-600 transition-colors">{c.namaLengkap}</h4>
                              <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-tighter">
                                 {c.namaPanggilan} • <span className="text-indigo-400">{c.bidangKerja}</span>
                              </p>
                           </div>
                        </div>
                      </td>
                      <td className="py-5 px-6">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${config.bg} ${config.text} border ${config.border}`}>
                          {c.statusProgres || "NEW"}
                        </span>
                      </td>
                      <td className="py-5 px-6 max-w-[200px]">
                        <p className="text-[10px] text-gray-500 font-medium leading-relaxed italic line-clamp-3">
                           {c.keteranganProgres || "- Belum ada -"}
                        </p>
                      </td>
                      <td className="py-5 px-6">
                        {c.namaPerusahaanProgres ? (
                          <div className="text-[10px]">
                             <p className="font-bold text-gray-800">{c.namaPerusahaanProgres}</p>
                             <p className="text-gray-400 flex items-center gap-1 mt-0.5">
                               <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                               {c.lokasiPerusahaan || "-"}
                             </p>
                          </div>
                        ) : <span className="text-[10px] text-gray-300 italic">- Belum ada -</span>}
                      </td>
                      <td className="py-5 px-6">
                        <p className="text-[10px] font-bold text-gray-600 line-clamp-2">{c.namaTsk || "-"}</p>
                      </td>
                      <td className="py-5 px-6">
                        <p className="text-[10px] font-black text-gray-400">{c.jadwalKeberangkatan || "-"}</p>
                      </td>
                      <td className="py-5 px-6">
                        <div className="flex justify-center items-center gap-2">
                          <Link
                             href={`/admin/edit/${c.id}`}
                             className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 flex items-center gap-1 text-[9px] font-bold"
                          >
                             <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                             Edit Progres
                          </Link>
                          <Link
                             href={`/admin/cv/${c.id}`}
                             className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                             title="Lihat Detail CV"
                          >
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredCandidates.length === 0 && (
              <div className="py-20 text-center">
                 <div className="mb-4 inline-block p-4 bg-gray-50 rounded-full text-gray-300">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 </div>
                 <h3 className="text-gray-800 font-bold">Kandidat Tidak Ditemukan</h3>
                 <p className="text-gray-400 text-xs mt-1">Coba sesuaikan filter atau kata kunci pencarian Anda.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #E2E8F0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #CBD5E1;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .card {
          animation: fadeIn 0.4s ease-out forwards;
        }
      `}</style>
    </>
  );
}
