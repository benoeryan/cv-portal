"use client";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, query, where, orderBy } from "firebase/firestore";
import Navbar from "@/components/Navbar";
import DriveImage from "@/components/DriveImage";

export default function PartnerCandidateSearchPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dashboard & Advanced Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState(""); // "bidang", "domisili", "level", "kategori"
  const [filterValue, setFilterValue] = useState("");

  // Modals State
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [myJobs, setMyJobs] = useState([]);
  const [requestData, setRequestData] = useState({ jobId: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !["partner", "admin"].includes(userData?.role))) {
      router.push("/");
      return;
    }
    if (user && ["partner", "admin"].includes(userData?.role)) {
      loadCandidates();
      loadMyJobs();
    }
  }, [user, userData, authLoading]);

  const loadCandidates = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "candidates"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(c => {
          const hasSSW = (c.sertifikatSSW && String(c.sertifikatSSW).includes("http")) ||
                         (c.sertifikatSSW2 && String(c.sertifikatSSW2).includes("http"));
          const isAvailable = !c.statusProgres || c.statusProgres === "Pending Nunggu Job";
          return hasSSW && isAvailable;
        });
      setCandidates(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const loadMyJobs = async () => {
    try {
      let q;
      if (userData?.role === "admin") q = query(collection(db, "jobs"), where("statusJob", "==", "Open"));
      else q = query(collection(db, "jobs"), where("createdBy", "==", user.uid));
      const snap = await getDocs(q);
      setMyJobs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
  };

  const stats = useMemo(() => {
    const s = { bidang: {}, domisili: { "INDO": 0, "JEPANG": 0 }, level: {}, kategori: {} };
    candidates.forEach(c => {
      const b = c.bidangKerja || "Umum"; s.bidang[b] = (s.bidang[b] || 0) + 1;
      const d = c.domisiliSiswa || "INDO"; s.domisili[d] = (s.domisili[d] || 0) + 1;
      const l = c.levelBahasa || "N/A"; s.level[l] = (s.level[l] || 0) + 1;
      const k = c.kategoriKandidat || "Lainnya"; s.kategori[k] = (s.kategori[k] || 0) + 1;
    });
    return {
      bidang: Object.entries(s.bidang).sort((a,b) => b[1]-a[1]).slice(0, 6),
      domisili: Object.entries(s.domisili),
      level: Object.entries(s.level).sort((a,b) => b[1]-a[1]).slice(0, 4),
    };
  }, [candidates]);

  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      const matchSearch = !searchTerm || c.namaLengkap?.toLowerCase().includes(searchTerm.toLowerCase());
      let matchDash = true;
      if (filterType === "bidang") matchDash = c.bidangKerja === filterValue;
      if (filterType === "domisili") matchDash = c.domisiliSiswa === filterValue;
      if (filterType === "level") matchDash = c.levelBahasa === filterValue;
      return matchSearch && matchDash;
    });
  }, [candidates, searchTerm, filterType, filterValue]);

  const handleOpenDetail = (student) => {
    setSelectedStudent(student);
    setShowDetailModal(true);
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!requestData.jobId) { alert("Pilih job terlebih dahulu!"); return; }
    setSubmitting(true);
    try {
      const selectedJob = myJobs.find(j => j.id === requestData.jobId);
      await addDoc(collection(db, "requests"), {
        studentId: selectedStudent.id, studentName: selectedStudent.namaLengkap,
        partnerId: user.uid, partnerName: userData.fullName,
        jobId: selectedJob.id, jobTitle: selectedJob.namaJob,
        notes: requestData.notes, status: "Pending", createdAt: new Date().toISOString(),
      });
      alert("Request matching diajukan!"); setShowRequestModal(false); setShowDetailModal(false);
    } catch (err) { alert(err.message); }
    setSubmitting(false);
  };

  if (authLoading || loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <>
      <Navbar />
      <div className="max-w-full mx-auto px-8 py-10 bg-[#F8F9FC] min-h-screen space-y-12">
        <div className="text-center space-y-2">
            <h1 className="text-4xl font-black text-slate-800 uppercase tracking-tighter">Matchmaking Siswa v4.0</h1>
            <p className="text-slate-400 text-sm font-bold uppercase tracking-[0.3em]">Cari & Pilih Kandidat Terbaik Sesuai Kebutuhan Job Anda</p>
        </div>

        {/* INTERACTIVE DASHBOARD SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
           {/* Column 1: Sektor Dashboard */}
           <div className="lg:col-span-2 card p-8 bg-white border-2 border-white rounded-[3.5rem] shadow-xl shadow-slate-200/50">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Sektor / Bidang Kerja</h3>
                 <span className="bg-purple-50 text-purple-600 px-3 py-1 rounded-full text-[10px] font-black">{candidates.length} TOTAL</span>
              </div>
              <div className="flex flex-wrap gap-3">
                 <div onClick={() => {setFilterType(""); setFilterValue("");}} className={`cursor-pointer px-5 py-3 rounded-2xl border-2 transition-all font-black text-[10px] uppercase tracking-widest ${!filterType ? 'bg-slate-900 border-slate-900 text-white' : 'bg-slate-50 border-transparent text-slate-400 hover:border-slate-200'}`}>Semua</div>
                 {stats.bidang.map(([b, count]) => (
                   <div key={b} onClick={() => {setFilterType("bidang"); setFilterValue(b);}} className={`cursor-pointer px-5 py-3 rounded-2xl border-2 transition-all flex items-center gap-3 ${filterType === 'bidang' && filterValue === b ? 'bg-purple-600 border-purple-200 text-white shadow-lg scale-105' : 'bg-white border-slate-100 text-slate-700 hover:border-purple-300'}`}>
                      <span className="text-[10px] font-black uppercase tracking-widest">{b}</span>
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black ${filterType === 'bidang' && filterValue === b ? 'bg-white/20 text-white' : 'bg-purple-50 text-purple-600'}`}>{count}</span>
                   </div>
                 ))}
              </div>
           </div>

           {/* Column 2: Domisili & Language */}
           <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-2 gap-6 h-full">
                 <div className="card p-8 bg-indigo-600 text-white rounded-[3.5rem] shadow-xl shadow-indigo-200 flex flex-col justify-between">
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Siswa di Indonesia</p>
                    <div className="flex items-end justify-between">
                       <h3 className="text-5xl font-black">{stats.domisili.find(d => d[0]==='INDO')?.[1] || 0}</h3>
                       <button onClick={() => {setFilterType("domisili"); setFilterValue("INDO");}} className="bg-white/20 p-3 rounded-2xl hover:bg-white/40 transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg></button>
                    </div>
                 </div>
                 <div className="card p-8 bg-rose-600 text-white rounded-[3.5rem] shadow-xl shadow-rose-200 flex flex-col justify-between">
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Siswa di Jepang</p>
                    <div className="flex items-end justify-between">
                       <h3 className="text-5xl font-black">{stats.domisili.find(d => d[0]==='JEPANG')?.[1] || 0}</h3>
                       <button onClick={() => {setFilterType("domisili"); setFilterValue("JEPANG");}} className="bg-white/20 p-3 rounded-2xl hover:bg-white/40 transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg></button>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* SEARCH BAR */}
        <div className="max-w-4xl mx-auto relative group">
           <input className="w-full h-20 pl-16 pr-8 bg-white rounded-[2.5rem] border-none shadow-2xl shadow-slate-200 font-bold text-xl outline-none focus:ring-4 focus:ring-purple-100 transition-all" placeholder="Cari nama kandidat spesifik..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
           <svg className="w-8 h-8 absolute left-6 top-6 text-slate-300 group-hover:text-purple-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
           {filterType && <div className="absolute right-8 top-6 bg-purple-50 text-purple-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest animate-fadeIn">Filter: {filterValue}</div>}
        </div>

        {/* CANDIDATE LIST */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-10">
          {filteredCandidates.map((c) => (
            <div key={c.id} onClick={() => handleOpenDetail(c)} className="group relative bg-white rounded-[3.5rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-700 cursor-pointer flex flex-col h-full border-[6px] border-white hover:border-purple-100 active:scale-95">
               <div className="relative aspect-[3/4.8] overflow-hidden">
                  <DriveImage url={c.pasPhoto} alt={c.namaLengkap} size="w-full h-full" className="group-hover:scale-110 transition-transform duration-1000 object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/10 to-transparent opacity-90 group-hover:opacity-100 transition-opacity"></div>

                  {/* Status Overlay */}
                  <div className="absolute top-6 left-6 flex flex-col gap-2">
                     <span className="bg-emerald-500 text-white text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">Ready Match</span>
                     {c.levelBahasa && <span className="bg-indigo-600 text-white text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">{c.levelBahasa}</span>}
                  </div>

                  <div className="absolute bottom-8 left-8 right-8 text-white">
                     <span className="text-[10px] font-black text-purple-400 uppercase tracking-[0.3em] mb-2 block">{c.bidangKerja}</span>
                     <h3 className="text-2xl font-black uppercase leading-tight tracking-tighter drop-shadow-2xl">{c.namaLengkap}</h3>
                     <div className="mt-4 flex items-center gap-4 text-[10px] font-black uppercase tracking-widest opacity-60">
                        <span>{c.domisiliSiswa === 'JEPANG' ? '🇯🇵 JP' : '🇮🇩 ID'}</span>
                        <span className="w-1 h-1 rounded-full bg-white/30"></span>
                        <span>{c.tanggalLahir ? (new Date().getFullYear() - new Date(c.tanggalLahir).getFullYear()) : "?"} THN</span>
                     </div>
                  </div>
               </div>

               <div className="p-8 space-y-6">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Self Intro</p>
                     <p className="text-[11px] text-slate-600 line-clamp-2 italic font-medium mt-1 leading-relaxed">"{c.promosiDiri || "Siswa siap memberikan performa terbaik."}"</p>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-purple-600 font-black text-[10px] uppercase tracking-[0.2em] group-hover:translate-x-2 transition-transform">
                     Review Profile <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                  </div>
               </div>
            </div>
          ))}
        </div>

        {filteredCandidates.length === 0 && (
          <div className="py-24 text-center">
             <div className="inline-block p-10 bg-white rounded-full shadow-inner mb-6 text-slate-200 animate-pulse"><svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></div>
             <h3 className="text-xl font-black text-slate-800 uppercase">Kandidat Tidak Ditemukan</h3>
             <p className="text-slate-400 text-sm mt-2 font-bold uppercase tracking-widest">Coba sesuaikan filter atau kata kunci Anda</p>
          </div>
        )}
      </div>

      {/* DETAIL MODAL FULL UI OVERHAUL */}
      {showDetailModal && selectedStudent && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-2xl animate-fadeIn">
           <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-6xl overflow-hidden max-h-[95vh] flex flex-col md:flex-row">
              <div className="w-full md:w-2/5 relative bg-slate-100 overflow-hidden">
                 <DriveImage url={selectedStudent.pasPhoto} alt={selectedStudent.namaLengkap} size="w-full h-full" className="object-cover" />
                 <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent"></div>
                 <div className="absolute bottom-12 left-12 right-12 text-white space-y-2">
                    <span className="text-xs font-black text-purple-400 uppercase tracking-[0.4em]">{selectedStudent.bidangKerja}</span>
                    <h2 className="text-5xl font-black uppercase leading-none tracking-tighter">{selectedStudent.namaLengkap}</h2>
                    <p className="text-xl font-bold opacity-60 uppercase tracking-widest italic pt-2">"{selectedStudent.namaPanggilan}"</p>
                 </div>
                 <button onClick={() => setShowDetailModal(false)} className="absolute top-10 right-10 w-14 h-14 bg-white/20 backdrop-blur-md rounded-full text-white text-4xl font-light hover:bg-white/40 transition-all flex items-center justify-center">&times;</button>
              </div>

              <div className="flex-1 p-14 overflow-y-auto custom-scrollbar space-y-12 bg-white">
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                    <div className="p-8 bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 flex flex-col items-center justify-center space-y-1">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Usia Sekarang</p>
                       <p className="text-3xl font-black text-slate-800">{selectedStudent.tanggalLahir ? (new Date().getFullYear() - new Date(selectedStudent.tanggalLahir).getFullYear()) : "?"} Thn</p>
                    </div>
                    <div className="p-8 bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 flex flex-col items-center justify-center space-y-1">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jenis Kelamin</p>
                       <p className="text-2xl font-black text-slate-800 uppercase tracking-tighter">{selectedStudent.jenisKelamin}</p>
                    </div>
                    <div className="p-8 bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 flex flex-col items-center justify-center space-y-1">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sertifikasi Bahasa</p>
                       <p className="text-3xl font-black text-indigo-600 uppercase">{selectedStudent.levelBahasa || "-"}</p>
                    </div>
                 </div>

                 <div className="space-y-6">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-4"><div className="w-1.5 h-6 bg-purple-600 rounded-full"></div>Promosi Diri (Self-PR)</h4>
                    <div className="relative">
                       <p className="text-xl text-slate-600 leading-relaxed font-medium italic bg-purple-50/30 p-12 rounded-[3.5rem] border border-purple-100 shadow-inner">
                         "{selectedStudent.promosiDiri || "Tidak ada promosi diri khusus."}"
                       </p>
                       <svg className="w-20 h-20 absolute -bottom-6 -right-6 text-purple-100 opacity-50" fill="currentColor" viewBox="0 0 20 20"><path d="M14.017 21L14.017 18C14.017 16.8954 13.1216 16 12.017 16L9.017 16V10L14.017 10L14.017 21ZM4.017 21L4.017 18C4.017 16.8954 3.12157 16 2.017 16L0.017 16V10L5.017 10L5.017 21H4.017Z" /></svg>
                    </div>
                 </div>

                 <div className="flex gap-6 pt-10">
                    <button onClick={() => setShowRequestModal(true)} className="flex-1 py-8 bg-gradient-to-r from-purple-600 to-indigo-700 text-white font-black rounded-[2.5rem] shadow-2xl shadow-purple-200 uppercase tracking-[0.2em] text-xs hover:scale-105 active:scale-95 transition-all">AJUKAN REQUEST MATCHING SEKARANG →</button>
                    <button onClick={() => setShowDetailModal(false)} className="px-14 py-8 border-2 border-slate-100 rounded-[2.5rem] font-black text-slate-400 uppercase text-[10px] tracking-widest hover:bg-slate-50">TUTUP PROFIL</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* REQUEST MODAL REMAINING FUNCTIONAL BUT POLISHED */}
      {showRequestModal && selectedStudent && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-[3.5rem] shadow-2xl w-full max-w-2xl p-14 space-y-10">
             <div className="text-center">
                <h3 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Submit Match Request</h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Menghubungkan <span className="text-purple-600">{selectedStudent.namaLengkap}</span> ke Job Anda</p>
             </div>
             <form onSubmit={handleSubmitRequest} className="space-y-8">
                <div className="space-y-4">
                   <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">1. Pilih Lowongan Anda</label>
                   <select className="input-field h-16 bg-slate-50 border-none font-bold rounded-2xl text-indigo-600 px-8" value={requestData.jobId} onChange={(e) => setRequestData({...requestData, jobId: e.target.value})} required>
                      <option value="">-- PILIH DAFTAR JOB AKTIF --</option>
                      {myJobs.map(j => <option key={j.id} value={j.id}>[{j.kodeJob}] {j.namaJob}</option>)}
                   </select>
                </div>
                <div className="space-y-4">
                   <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">2. Catatan (Opsional)</label>
                   <textarea className="input-field bg-slate-50 border-none font-medium p-8 rounded-3xl" rows="4" value={requestData.notes} onChange={(e) => setRequestData({...requestData, notes: e.target.value})} placeholder="Tambahkan alasan mengapa kandidat ini cocok untuk job Anda..." />
                </div>
                <div className="flex gap-4 pt-4">
                   <button type="button" onClick={() => setShowRequestModal(false)} className="flex-1 py-5 font-black text-slate-300 uppercase text-[10px] tracking-widest">Batal</button>
                   <button type="submit" className="flex-[2] py-5 bg-slate-900 text-white font-black rounded-2xl shadow-2xl shadow-slate-200 uppercase text-[10px] tracking-widest hover:bg-indigo-600 transition-all" disabled={submitting}>{submitting ? "SUBMITTING..." : "CONFIRM REQUEST MATCHING →"}</button>
                </div>
             </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </>
  );
}
