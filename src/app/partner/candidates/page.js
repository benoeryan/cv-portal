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
  const [filterType, setFilterType] = useState(""); // "bidang", "domisili", "gender"
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
      router.push("/"); return;
    }
    if (user && ["partner", "admin"].includes(userData?.role)) {
      loadCandidates(); loadMyJobs();
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
    const s = { bidang: {}, domisili: { "INDO": 0, "JEPANG": 0 }, gender: { "LAKI-LAKI": 0, "PEREMPUAN": 0 } };
    candidates.forEach(c => {
      const b = c.bidangKerja || "Umum"; s.bidang[b] = (s.bidang[b] || 0) + 1;
      const d = c.domisiliSiswa === "JEPANG" ? "JEPANG" : "INDO"; s.domisili[d] = (s.domisili[d] || 0) + 1;
      const g = c.jenisKelamin === "LAKI-LAKI" ? "LAKI-LAKI" : "PEREMPUAN"; s.gender[g]++;
    });
    return {
      bidang: Object.entries(s.bidang).sort((a,b) => b[1]-a[1]).slice(0, 6),
      domisili: Object.entries(s.domisili),
      gender: Object.entries(s.gender)
    };
  }, [candidates]);

  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      const matchSearch = !searchTerm || c.namaLengkap?.toLowerCase().includes(searchTerm.toLowerCase());
      let matchDash = true;
      if (filterType === "bidang") matchDash = c.bidangKerja === filterValue;
      if (filterType === "domisili") matchDash = (c.domisiliSiswa || "INDO") === filterValue;
      if (filterType === "gender") matchDash = c.jenisKelamin === filterValue;
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
      <div className="max-w-full mx-auto px-8 py-12 bg-[#F8F9FC] min-h-screen font-sans">
        <div className="text-center mb-12">
            <h1 className="text-4xl font-black text-slate-800 uppercase tracking-tighter">Pencarian Siswa Ready Match v5.0</h1>
            <p className="text-slate-400 text-sm font-bold uppercase tracking-[0.3em] mt-2">Daftar Kandidat Bersertifikat SSW & Siap Matching Job</p>
        </div>

        {/* TOP DASHBOARD: GENDER & DOMISILI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12 max-w-6xl mx-auto">
           <div onClick={() => {setFilterType("gender"); setFilterValue("LAKI-LAKI");}} className={`card p-8 rounded-[3rem] border-4 transition-all cursor-pointer flex flex-col justify-center items-center text-center ${filterType === 'gender' && filterValue === 'LAKI-LAKI' ? 'bg-blue-600 border-blue-200 text-white shadow-2xl scale-105' : 'bg-white border-white shadow-sm hover:border-blue-100'}`}>
              <h3 className="text-5xl font-black">{stats.gender.find(g => g[0]==='LAKI-LAKI')?.[1] || 0}</h3>
              <p className="text-[10px] font-black uppercase tracking-widest mt-2 opacity-60">Siswa Laki-laki</p>
           </div>
           <div onClick={() => {setFilterType("gender"); setFilterValue("PEREMPUAN");}} className={`card p-8 rounded-[3rem] border-4 transition-all cursor-pointer flex flex-col justify-center items-center text-center ${filterType === 'gender' && filterValue === 'PEREMPUAN' ? 'bg-rose-500 border-rose-200 text-white shadow-2xl scale-105' : 'bg-white border-white shadow-sm hover:border-rose-100'}`}>
              <h3 className="text-5xl font-black">{stats.gender.find(g => g[0]==='PEREMPUAN')?.[1] || 0}</h3>
              <p className="text-[10px] font-black uppercase tracking-widest mt-2 opacity-60">Siswa Perempuan</p>
           </div>
           <div onClick={() => {setFilterType("domisili"); setFilterValue("INDO");}} className={`card p-8 rounded-[3rem] border-4 transition-all cursor-pointer flex flex-col justify-center items-center text-center ${filterType === 'domisili' && filterValue === 'INDO' ? 'bg-indigo-600 border-indigo-200 text-white shadow-2xl scale-105' : 'bg-white border-white shadow-sm hover:border-indigo-100'}`}>
              <h3 className="text-5xl font-black">{stats.domisili.find(d => d[0]==='INDO')?.[1] || 0}</h3>
              <p className="text-[10px] font-black uppercase tracking-widest mt-2 opacity-60">Di Indonesia</p>
           </div>
           <div onClick={() => {setFilterType("domisili"); setFilterValue("JEPANG");}} className={`card p-8 rounded-[3rem] border-4 transition-all cursor-pointer flex flex-col justify-center items-center text-center ${filterType === 'domisili' && filterValue === 'JEPANG' ? 'bg-slate-900 border-slate-700 text-white shadow-2xl scale-105' : 'bg-white border-white shadow-sm hover:border-slate-800'}`}>
              <h3 className="text-5xl font-black">{stats.domisili.find(d => d[0]==='JEPANG')?.[1] || 0}</h3>
              <p className="text-[10px] font-black uppercase tracking-widest mt-2 opacity-60">Di Jepang</p>
           </div>
        </div>

        {/* SEKTOR DASHBOARD */}
        <div className="card p-8 bg-white border-2 border-white rounded-[3rem] shadow-xl shadow-slate-200/40 mb-12">
           <div className="flex flex-wrap justify-center gap-3">
              <div onClick={() => {setFilterType(""); setFilterValue("");}} className={`cursor-pointer px-8 py-4 rounded-3xl border-2 transition-all font-black text-[10px] uppercase tracking-widest ${!filterType ? 'bg-slate-900 border-slate-900 text-white' : 'bg-slate-50 border-transparent text-slate-400 hover:border-slate-200'}`}>Semua Bidang</div>
              {stats.bidang.map(([b, count]) => (
                <div key={b} onClick={() => {setFilterType("bidang"); setFilterValue(b);}} className={`cursor-pointer px-8 py-4 rounded-3xl border-2 transition-all flex items-center gap-4 ${filterType === 'bidang' && filterValue === b ? 'bg-purple-600 border-purple-200 text-white shadow-lg scale-105' : 'bg-white border-slate-100 text-slate-700 hover:border-purple-300'}`}>
                   <span className="text-[10px] font-black uppercase">{b}</span>
                   <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${filterType === 'bidang' && filterValue === b ? 'bg-white/20 text-white' : 'bg-purple-50 text-purple-600'}`}>{count}</span>
                </div>
              ))}
           </div>
        </div>

        {/* SEARCH BAR */}
        <div className="max-w-4xl mx-auto relative mb-12">
           <input className="w-full h-20 pl-16 pr-8 bg-white rounded-[2.5rem] border-none shadow-2xl shadow-slate-200 font-black text-xl outline-none" placeholder="Cari nama kandidat..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
           <svg className="w-8 h-8 absolute left-6 top-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>

        {/* CANDIDATE LIST */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-10">
          {filteredCandidates.map((c) => (
            <div key={c.id} onClick={() => handleOpenDetail(c)} className="group bg-white rounded-[4rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-700 cursor-pointer flex flex-col h-full border-[6px] border-white hover:border-purple-100 relative">
               <div className="relative aspect-[3/5] overflow-hidden bg-slate-200">
                  {/* FOTO JANGAN KEPOTONG: Gunakan object-cover object-top untuk memastikan wajah terlihat penuh */}
                  <DriveImage url={c.pasPhoto} alt={c.namaLengkap} size="w-full h-full" className="group-hover:scale-105 transition-transform duration-1000 object-cover object-top" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-transparent opacity-90"></div>

                  <div className="absolute bottom-10 left-10 right-10 text-white">
                     <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-2 block">{c.bidangKerja}</span>
                     <h3 className="text-2xl font-black uppercase leading-tight tracking-tighter drop-shadow-2xl">{c.namaLengkap}</h3>
                     <div className="mt-4 flex items-center gap-4 text-[10px] font-black uppercase tracking-widest opacity-60">
                        <span>{c.domisiliSiswa === 'JEPANG' ? '🇯🇵 JEPANG' : '🇮🇩 INDO'}</span>
                        <span className="w-1 h-1 rounded-full bg-white/30"></span>
                        <span>{c.tanggalLahir ? (new Date().getFullYear() - new Date(c.tanggalLahir).getFullYear()) : "?"} THN</span>
                     </div>
                  </div>
               </div>
               <div className="p-10 space-y-6">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                     <p className="text-[9px] text-slate-400 font-bold uppercase mb-1 tracking-widest">Bahasa</p>
                     <p className="text-[10px] font-black text-indigo-600 uppercase">{c.levelBahasa || "-"}</p>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-purple-600 font-black text-[10px] uppercase tracking-widest group-hover:translate-x-3 transition-transform">
                     LIHAT PROFIL LENGKAP <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                  </div>
               </div>
            </div>
          ))}
        </div>
      </div>

      {/* DETAIL MODAL (FULL UI) */}
      {showDetailModal && selectedStudent && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-900/95 backdrop-blur-2xl animate-fadeIn">
           <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-6xl overflow-hidden max-h-[95vh] flex flex-col md:flex-row">
              <div className="w-full md:w-2/5 relative bg-slate-100 overflow-hidden">
                 <DriveImage url={selectedStudent.pasPhoto} alt={selectedStudent.namaLengkap} size="w-full h-full" className="object-cover object-top" />
                 <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"></div>
                 <div className="absolute bottom-12 left-12 right-12 text-white">
                    <span className="text-xs font-black text-purple-400 uppercase tracking-[0.4em]">{selectedStudent.bidangKerja}</span>
                    <h2 className="text-5xl font-black uppercase leading-none tracking-tighter mt-2">{selectedStudent.namaLengkap}</h2>
                    <p className="text-xl font-bold opacity-60 uppercase tracking-widest italic pt-3">"{selectedStudent.namaPanggilan}"</p>
                 </div>
                 <button onClick={() => setShowDetailModal(false)} className="absolute top-10 right-10 w-14 h-14 bg-white/20 backdrop-blur-md rounded-full text-white text-4xl font-light hover:bg-white/40 transition-all flex items-center justify-center">&times;</button>
              </div>

              <div className="flex-1 p-12 overflow-y-auto custom-scrollbar space-y-12 bg-white">
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Usia</p><p className="text-2xl font-black text-slate-800">{selectedStudent.tanggalLahir ? (new Date().getFullYear() - new Date(selectedStudent.tanggalLahir).getFullYear()) : "---"} THN</p></div>
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Gender</p><p className="text-xl font-black text-slate-800 uppercase">{selectedStudent.jenisKelamin}</p></div>
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Agama</p><p className="text-xl font-black text-slate-800 uppercase">{selectedStudent.agama || "-"}</p></div>
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Status Nikah</p><p className="text-sm font-black text-slate-800 uppercase">{selectedStudent.statusPernikahan || "-"}</p></div>
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Bidang SSW</p><p className="text-sm font-black text-purple-600 uppercase">{selectedStudent.bidangKerja || "-"}</p></div>
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Bahasa</p><p className="text-sm font-black text-indigo-600 uppercase">{selectedStudent.levelBahasa || "-"}</p></div>
                 </div>

                 <div className="p-8 bg-indigo-50/30 rounded-[2.5rem] border border-indigo-50 flex justify-around items-center">
                    <div className="text-center"><p className="text-[10px] font-black text-indigo-400 uppercase mb-1">Tinggi Badan</p><p className="text-2xl font-black text-slate-700">{selectedStudent.tinggiBadan} <span className="text-xs">CM</span></p></div>
                    <div className="w-px h-10 bg-indigo-100"></div>
                    <div className="text-center"><p className="text-[10px] font-black text-indigo-400 uppercase mb-1">Berat Badan</p><p className="text-2xl font-black text-slate-700">{selectedStudent.beratBadan} <span className="text-xs">KG</span></p></div>
                    <div className="w-px h-10 bg-indigo-100"></div>
                    <div className="text-center"><p className="text-[10px] font-black text-indigo-400 uppercase mb-1">Domisili</p><p className="text-sm font-black text-slate-700 uppercase">{selectedStudent.domisiliSiswa || "INDO"}</p></div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4"><h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Kelebihan</h4><p className="text-xs text-slate-600 bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100 font-medium italic">{selectedStudent.kelebihan || "---"}</p></div>
                    <div className="space-y-4"><h4 className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Kekurangan</h4><p className="text-xs text-slate-600 bg-rose-50/50 p-6 rounded-3xl border border-rose-100 font-medium italic">{selectedStudent.kekurangan || "---"}</p></div>
                 </div>

                 <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-4"><div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>Jikoshoukai Singkat</h4>
                    <p className="text-lg text-slate-600 leading-relaxed font-medium italic bg-purple-50/30 p-10 rounded-[3rem] border border-purple-100 shadow-inner">"{selectedStudent.promosiDiri || "---"}"</p>
                 </div>

                 <div className="p-8 bg-slate-900 rounded-[3rem] text-white flex justify-between items-center relative overflow-hidden">
                    <div className="relative z-10"><p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-2">Status Rekrutmen</p><h4 className="text-2xl font-black uppercase tracking-tighter">{selectedStudent.statusProgres || "Pending Nunggu Job"}</h4></div>
                    <span className="relative z-10 bg-indigo-500 px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest">Ready Match</span>
                 </div>

                 <div className="flex gap-6 pt-6">
                    <button onClick={() => setShowRequestModal(true)} className="flex-1 py-8 bg-gradient-to-r from-purple-600 to-indigo-700 text-white font-black rounded-[2.5rem] shadow-2xl shadow-purple-200 uppercase tracking-[0.2em] text-xs hover:scale-105 active:scale-95 transition-all">AJUKAN REQUEST MATCHING SEKARANG →</button>
                    <button onClick={() => setShowDetailModal(false)} className="px-14 py-8 border-2 border-slate-100 rounded-[2.5rem] font-black text-slate-400 uppercase text-[10px] tracking-widest hover:bg-slate-50">BATAL</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* REQUEST MODAL REMAINING THE SAME */}
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
