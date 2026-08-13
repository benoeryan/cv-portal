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

  // Dashboard & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState(""); // "sektor", "status", "domisili"
  const [filterValue, setFilterValue] = useState("");

  useEffect(() => {
    if (!authLoading && (!user || !["admin", "viewer", "approval"].includes(userData?.role))) {
      router.push("/"); return;
    }
    if (user) loadCandidates();
  }, [user, userData, authLoading]);

  const loadCandidates = async () => {
    try {
      const q = query(collection(db, "candidates"), orderBy("submittedAt", "desc"));
      const snapshot = await getDocs(q);
      setCandidates(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const stats = useMemo(() => {
    const s = { sektor: {}, status: {}, indo: 0, jepang: 0 };
    candidates.forEach(c => {
      const b = c.bidangKerja || "Umum"; s.sektor[b] = (s.sektor[b] || 0) + 1;
      const st = c.statusProgres || "Pending"; s.status[st] = (s.status[st] || 0) + 1;
      if (c.domisiliSiswa === 'JEPANG') s.jepang++; else s.indo++;
    });
    return {
      sektor: Object.entries(s.sektor).sort((a,b) => b[1]-a[1]).slice(0, 6),
      status: Object.entries(s.status).sort((a,b) => b[1]-a[1]),
      indo: s.indo, jepang: s.jepang
    };
  }, [candidates]);

  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      const matchSearch = !searchTerm || c.namaLengkap?.toLowerCase().includes(searchTerm.toLowerCase());
      let matchDash = true;
      if (filterType === "sektor") matchDash = c.bidangKerja === filterValue;
      if (filterType === "status") matchDash = c.statusProgres === filterValue;
      if (filterType === "domisili") matchDash = c.domisiliSiswa === filterValue;
      return matchSearch && matchDash;
    });
  }, [candidates, searchTerm, filterType, filterValue]);

  if (authLoading || loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <>
      <Navbar />
      <div className="max-w-full mx-auto px-8 py-10 bg-[#F8F9FC] min-h-screen space-y-10">
        <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Statistik Kandidat v4.0</h1>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">International Japan Employment Foundation</p>
            </div>
            <div className="flex gap-4">
               <div className="card px-6 py-3 bg-white border-2 border-white rounded-2xl shadow-sm text-center">
                  <p className="text-[8px] font-black text-slate-400 uppercase">Total Kandidat</p>
                  <p className="text-xl font-black text-slate-800">{candidates.length}</p>
               </div>
            </div>
        </div>

        {/* INTERACTIVE DASHBOARD */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
           {/* DOMISILI CARDS */}
           <div className="lg:col-span-1 space-y-4">
              <div onClick={() => {setFilterType("domisili"); setFilterValue("INDO");}} className={`card p-6 rounded-[2.5rem] border-4 cursor-pointer transition-all ${filterValue === 'INDO' ? 'bg-indigo-600 border-indigo-200 text-white shadow-xl' : 'bg-white border-white shadow-sm'}`}>
                 <p className="text-[10px] font-black uppercase opacity-60">Siswa di Indonesia</p>
                 <h3 className="text-4xl font-black mt-1">{stats.indo}</h3>
              </div>
              <div onClick={() => {setFilterType("domisili"); setFilterValue("JEPANG");}} className={`card p-6 rounded-[2.5rem] border-4 cursor-pointer transition-all ${filterValue === 'JEPANG' ? 'bg-rose-600 border-rose-200 text-white shadow-xl' : 'bg-white border-white shadow-sm'}`}>
                 <p className="text-[10px] font-black uppercase opacity-60">Siswa di Jepang</p>
                 <h3 className="text-4xl font-black mt-1">{stats.jepang}</h3>
              </div>
           </div>

           {/* SEKTOR BUBBLES */}
           <div className="lg:col-span-2 card p-8 bg-white border-2 border-white rounded-[3rem] shadow-xl shadow-slate-200/40">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Distribusi Sektor SSW</p>
              <div className="flex flex-wrap gap-3">
                 {stats.sektor.map(([b, count]) => (
                   <div key={b} onClick={() => {setFilterType("sektor"); setFilterValue(b);}} className={`cursor-pointer px-5 py-3 rounded-2xl border-2 transition-all flex items-center gap-3 ${filterValue === b ? 'bg-purple-600 text-white border-purple-200 scale-105' : 'bg-slate-50 border-transparent text-slate-600 hover:border-purple-200'}`}>
                      <span className="text-[10px] font-black uppercase">{b}</span>
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black ${filterValue === b ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-600'}`}>{count}</span>
                   </div>
                 ))}
              </div>
           </div>

           {/* STATUS LIST */}
           <div className="lg:col-span-1 card p-6 bg-white border-2 border-white rounded-[3rem] shadow-xl shadow-slate-200/40">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Status Progres</p>
              <div className="space-y-2 overflow-y-auto max-h-[150px] pr-2 custom-scrollbar">
                 {stats.status.map(([s, count]) => (
                   <div key={s} onClick={() => {setFilterType("status"); setFilterValue(s);}} className={`flex justify-between items-center p-2 rounded-xl cursor-pointer transition-colors ${filterValue === s ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-600'}`}>
                      <span className="text-[9px] font-bold uppercase truncate mr-2">{s}</span>
                      <span className="text-[10px] font-black">{count}</span>
                   </div>
                 ))}
              </div>
           </div>
        </div>

        {/* SEARCH & ACTION BAR */}
        <div className="flex gap-4">
           <div className="flex-1 relative">
              <input className="input-field pl-12 h-16 border-none shadow-xl bg-white rounded-3xl font-bold" placeholder="Cari nama kandidat..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              <svg className="w-6 h-6 absolute left-4 top-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
           </div>
           {filterType && <button onClick={() => {setFilterType(""); setFilterValue("");}} className="bg-slate-900 text-white px-10 rounded-3xl font-black uppercase text-[10px] tracking-widest">✕ Reset Filter</button>}
        </div>

        {/* CANDIDATE TABLE */}
        <div className="card overflow-hidden !p-0 border-none shadow-2xl rounded-[3rem] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest">
                  <th className="py-6 px-8">Kandidat</th>
                  <th className="py-6 px-8">Sektor / Domisili</th>
                  <th className="py-6 px-8 text-center">Bahasa</th>
                  <th className="py-6 px-8">Status Terkini</th>
                  <th className="py-6 px-8 text-center">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredCandidates.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-all group">
                    <td className="py-5 px-8">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-md ring-2 ring-white shrink-0">
                             <DriveImage url={c.pasPhoto} alt={c.namaLengkap} size="w-full h-full" className="rounded-2xl" />
                          </div>
                          <div>
                             <p className="font-black text-slate-800 uppercase text-xs leading-none">{c.namaLengkap}</p>
                             <p className="text-[10px] text-slate-400 font-bold mt-1.5 uppercase">"{c.namaPanggilan}"</p>
                          </div>
                       </div>
                    </td>
                    <td className="py-5 px-8">
                       <p className="text-[11px] font-black text-purple-600 uppercase">{c.bidangKerja}</p>
                       <p className={`text-[10px] font-bold mt-1 ${c.domisiliSiswa === 'JEPANG' ? 'text-rose-500' : 'text-indigo-500'}`}>
                         {c.domisiliSiswa === 'JEPANG' ? '🇯🇵 JEPANG' : '🇮🇩 INDONESIA'}
                       </p>
                    </td>
                    <td className="py-5 px-8 text-center">
                       <span className="bg-slate-100 px-2 py-1 rounded-lg text-[10px] font-black text-slate-600 uppercase">{c.levelBahasa || "-"}</span>
                    </td>
                    <td className="py-5 px-8">
                       <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border-2 ${
                         c.statusProgres?.includes("Job") ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                         c.statusProgres?.includes("Interview") ? "bg-blue-50 text-blue-600 border-blue-100" :
                         "bg-slate-50 text-slate-500 border-slate-100"
                       }`}>
                         {c.statusProgres || "PENDING"}
                       </span>
                    </td>
                    <td className="py-5 px-8">
                       <div className="flex justify-center gap-3">
                          <Link href={`/admin/cv/${c.id}`} className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          </Link>
                          <Link href={`/admin/edit/${c.id}`} className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-indigo-600 transition-all shadow-sm">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </Link>
                       </div>
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
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </>
  );
}
