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
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBidang, setFilterBidang] = useState("");

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
          const hasSSW = (c.sertifikatSSW && c.sertifikatSSW.includes("http")) ||
                         (c.sertifikatSSW2 && c.sertifikatSSW2.includes("http"));
          const isAvailable = !c.statusProgres || c.statusProgres === "Pending Nunggu Job";
          return hasSSW && isAvailable;
        });
      setCandidates(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const loadMyJobs = async () => {
    try {
      // For Admin, show all Open jobs. For Partner, show only their created jobs.
      let q;
      if (userData?.role === "admin") {
        q = query(collection(db, "jobs"), where("statusJob", "==", "Open"));
      } else {
        q = query(collection(db, "jobs"), where("createdBy", "==", user.uid));
      }
      const snap = await getDocs(q);
      setMyJobs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
  };

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
        studentId: selectedStudent.id,
        studentName: selectedStudent.namaLengkap,
        partnerId: user.uid,
        partnerName: userData.fullName,
        jobId: selectedJob.id,
        jobTitle: selectedJob.namaJob,
        notes: requestData.notes,
        status: "Pending",
        createdAt: new Date().toISOString(),
      });
      alert("Request siswa berhasil diajukan ke admin!");
      setShowRequestModal(false);
      setShowDetailModal(false);
      setRequestData({ jobId: "", notes: "" });
    } catch (err) { alert(err.message); }
    setSubmitting(false);
  };

  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      const matchSearch = !searchTerm || c.namaLengkap?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchBidang = !filterBidang || c.bidangKerja === filterBidang;
      return matchSearch && matchBidang;
    });
  }, [candidates, searchTerm, filterBidang]);

  const uniqueBidang = [...new Set(candidates.map(c => c.bidangKerja).filter(Boolean))].sort();

  const selectedJobDetailForRequest = useMemo(() => {
    return myJobs.find(j => j.id === requestData.jobId);
  }, [requestData.jobId, myJobs]);

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-gray-800 tracking-tight uppercase">Pencarian Siswa Ready Job</h1>
            <p className="text-gray-500 text-sm">List siswa yang sudah memiliki sertifikat SSW & siap disalurkan</p>
          </div>
          <div className="bg-purple-50 text-purple-700 px-4 py-2 rounded-xl text-xs font-black border border-purple-100 uppercase tracking-widest">
            {candidates.length} Siswa Siap Kerja
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="md:col-span-2 relative">
             <input className="input-field pl-10 h-12 border-none shadow-sm bg-white" placeholder="Cari nama siswa..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
             <svg className="w-5 h-5 absolute left-3 top-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <select className="input-field h-12 border-none shadow-sm bg-white font-bold" value={filterBidang} onChange={(e) => setFilterBidang(e.target.value)}>
            <option value="">Semua Bidang Kerja</option>
            {uniqueBidang.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredCandidates.map((c) => (
            <div
              key={c.id}
              onClick={() => handleOpenDetail(c)}
              className="card group hover:border-purple-600 transition-all duration-300 flex flex-col h-full bg-white border-2 border-gray-50 shadow-sm hover:shadow-xl rounded-[2.5rem] p-4 cursor-pointer overflow-hidden"
            >
              {/* LARGE FULL-WIDTH IMAGE */}
              <div className="relative aspect-[3/4.5] rounded-[2rem] overflow-hidden mb-6 bg-slate-200 shadow-inner group-hover:scale-[1.02] transition-transform duration-500">
                <DriveImage url={c.pasPhoto} alt={c.namaLengkap} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>
                <div className="absolute bottom-6 left-6 right-6 text-white">
                   <span className="text-[10px] font-black text-purple-300 uppercase tracking-widest block mb-1">{c.bidangKerja || "Umum"}</span>
                   <h3 className="font-black uppercase tracking-tight text-xl leading-tight truncate">{c.namaLengkap}</h3>
                   <div className="flex gap-2 mt-3">
                      {c.sertifikatSSW && <span className="bg-blue-600/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-white/20">SSW 1</span>}
                      {c.sertifikatSSW2 && <span className="bg-indigo-600/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-white/20">SSW 2</span>}
                   </div>
                </div>
              </div>

              <div className="px-2 pb-2 space-y-4">
                 <div className="grid grid-cols-2 gap-4 text-[10px] border-b border-slate-50 pb-4">
                    <div>
                       <p className="font-black text-slate-300 uppercase tracking-[0.1em] mb-0.5">Umur / Kelamin</p>
                       <p className="font-bold text-slate-700 uppercase">
                          {c.tanggalLahir ? (new Date().getFullYear() - new Date(c.tanggalLahir).getFullYear()) : "?"} Thn • {c.jenisKelamin}
                       </p>
                    </div>
                    <div className="text-right">
                       <p className="font-black text-slate-300 uppercase tracking-[0.1em] mb-0.5">Bahasa</p>
                       <p className="font-bold text-indigo-600 uppercase">{c.levelBahasa || "-"}</p>
                    </div>
                 </div>

                 <div className="bg-slate-50 p-4 rounded-2xl flex-grow">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">Jikoshoukai Singkat</p>
                    <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2 font-medium italic">"{c.promosiDiri || "Tidak ada deskripsi singkat."}"</p>
                 </div>

                 <div className="flex items-center justify-between pt-2">
                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">Ready for Match</span>
                    <span className="text-[9px] font-black text-purple-600 uppercase tracking-widest group-hover:translate-x-1 transition-transform flex items-center gap-1.5">View Detail <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg></span>
                 </div>
              </div>
            </div>
          ))}
        </div>

        {filteredCandidates.length === 0 && (
          <div className="py-24 text-center">
             <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Tidak ada siswa yang sesuai kriteria.</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedStudent && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl overflow-hidden max-h-[95vh] flex flex-col">
            <div className="p-10 overflow-y-auto custom-scrollbar">
               <div className="flex flex-col md:flex-row gap-10">
                  {/* Left: Identity Card */}
                  <div className="w-full md:w-1/3 space-y-6">
                     <div className="relative aspect-[3/4.2] rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white">
                        <DriveImage url={selectedStudent.pasPhoto} alt={selectedStudent.namaLengkap} />
                        <div className="absolute bottom-4 left-4 right-4 flex gap-2">
                           {selectedStudent.sertifikatSSW && <span className="bg-blue-600 text-white text-[8px] font-black px-3 py-1 rounded-full uppercase shadow-lg tracking-widest">SSW 1</span>}
                           {selectedStudent.sertifikatSSW2 && <span className="bg-indigo-600 text-white text-[8px] font-black px-3 py-1 rounded-full uppercase shadow-lg tracking-widest">SSW 2</span>}
                        </div>
                     </div>
                     <div className="bg-slate-50 p-6 rounded-3xl space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tinggi / Berat</span>
                           <span className="font-bold text-slate-700">{selectedStudent.tinggiBadan}cm / {selectedStudent.beratBadan}kg</span>
                        </div>
                        <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Agama</span>
                           <span className="font-bold text-slate-700 uppercase">{selectedStudent.agama}</span>
                        </div>
                        <div className="flex justify-between items-center">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Menikah</span>
                           <span className="font-bold text-slate-700 uppercase text-[11px]">{selectedStudent.statusPernikahan}</span>
                        </div>
                     </div>
                  </div>

                  {/* Right: Detailed Info */}
                  <div className="flex-1 space-y-8">
                     <div>
                        <div className="flex justify-between items-start mb-2">
                           <span className="text-[10px] font-black text-purple-600 uppercase tracking-[0.3em] bg-purple-50 px-3 py-1 rounded-full">{selectedStudent.bidangKerja || "UMUM"}</span>
                           <button onClick={() => setShowDetailModal(false)} className="text-slate-300 hover:text-slate-800 text-2xl transition-colors">&times;</button>
                        </div>
                        <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tight leading-none mb-1">{selectedStudent.namaLengkap}</h2>
                        <p className="text-lg font-bold text-slate-400 uppercase tracking-[0.1em]">Panggilan: {selectedStudent.namaPanggilan}</p>
                     </div>

                     <div className="grid grid-cols-2 md:grid-cols-3 gap-6 py-6 border-y border-slate-100">
                        <div className="space-y-1">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Usia Sekarang</p>
                           <p className="text-xl font-black text-slate-800">{selectedStudent.tanggalLahir ? (new Date().getFullYear() - new Date(selectedStudent.tanggalLahir).getFullYear()) : "?"} TAHUN</p>
                        </div>
                        <div className="space-y-1">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jenis Kelamin</p>
                           <p className="text-xl font-black text-slate-800">{selectedStudent.jenisKelamin}</p>
                        </div>
                        <div className="space-y-1">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sertifikat Bahasa</p>
                           <p className="text-xl font-black text-indigo-600 uppercase">{selectedStudent.levelBahasa || "-"}</p>
                        </div>
                     </div>

                     <div className="space-y-6">
                        <div className="p-6 bg-slate-50 rounded-3xl space-y-3">
                           <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                              <span className="w-1 h-3 bg-purple-600 rounded-full"></span>
                              Kelebihan & Kekurangan
                           </h4>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-white p-4 rounded-2xl border border-slate-100">
                                 <p className="text-[9px] font-black text-emerald-500 uppercase mb-2 tracking-widest">Strengths (Kelebihan)</p>
                                 <p className="text-xs text-slate-600 font-medium leading-relaxed">{selectedStudent.kelebihan}</p>
                              </div>
                              <div className="bg-white p-4 rounded-2xl border border-slate-100">
                                 <p className="text-[9px] font-black text-rose-500 uppercase mb-2 tracking-widest">Weaknesses (Kekurangan)</p>
                                 <p className="text-xs text-slate-600 font-medium leading-relaxed">{selectedStudent.kekurangan}</p>
                              </div>
                           </div>
                        </div>

                        <div className="space-y-3">
                           <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                              <span className="w-1 h-3 bg-purple-600 rounded-full"></span>
                              Jikoshoukai (Self Promotion)
                           </h4>
                           <p className="text-sm text-slate-600 leading-relaxed bg-indigo-50/30 p-8 rounded-[2rem] border border-indigo-50 font-medium italic">
                              "{selectedStudent.promosiDiri || "Tidak ada promosi diri khusus."}"
                           </p>
                        </div>
                     </div>

                     <div className="flex gap-4 pt-6">
                        <button
                           onClick={() => setShowRequestModal(true)}
                           className="flex-1 py-4 bg-purple-600 text-white font-black rounded-2xl uppercase text-xs tracking-[0.1em] shadow-2xl shadow-purple-200 hover:bg-purple-700 transition-all flex items-center justify-center gap-3"
                        >
                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                           AJUKAN REQUEST MATCHING SISWA INI
                        </button>
                        <button
                           onClick={() => setShowDetailModal(false)}
                           className="px-10 py-4 border-2 border-slate-100 text-slate-400 font-black rounded-2xl uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all"
                        >
                           Tutup Detail
                        </button>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Request Modal */}
      {showRequestModal && selectedStudent && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col">
            <div className="p-10 overflow-y-auto custom-scrollbar space-y-8">
               <div className="text-center">
                  <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tight mb-2">Request Matching Siswa</h3>
                  <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Ajukan <span className="text-purple-600">{selectedStudent.namaLengkap}</span> untuk Matching Job</p>
               </div>

               <form onSubmit={handleSubmitRequest} className="space-y-6">
                  <div>
                     <label className="form-label text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">1. Pilih Lowongan Tersedia</label>
                     <select
                        className="input-field bg-slate-50 border-none font-bold text-sm h-14 px-6 rounded-2xl shadow-inner outline-none focus:ring-2 focus:ring-purple-500"
                        value={requestData.jobId}
                        onChange={(e) => setRequestData({...requestData, jobId: e.target.value})}
                        required
                     >
                        <option value="">-- Pilih Lowongan Kerja Anda --</option>
                        {myJobs.map(j => <option key={j.id} value={j.id}>[{j.kodeJob}] {j.namaJob} - {j.lokasi}</option>)}
                     </select>
                  </div>

                  {/* Dynamic Job Preview when selected */}
                  {selectedJobDetailForRequest && (
                    <div className="p-6 bg-purple-50 rounded-[2rem] border border-purple-100 space-y-4 animate-fadeIn">
                       <div className="flex justify-between items-start">
                          <div>
                             <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-1">Preview Detail Job</p>
                             <h4 className="font-black text-purple-900 uppercase text-lg leading-tight">{selectedJobDetailForRequest.namaJob}</h4>
                          </div>
                          <span className="bg-white px-3 py-1 rounded-full text-[9px] font-black text-purple-600 uppercase border border-purple-100">{selectedJobDetailForRequest.kodeJob}</span>
                       </div>
                       <div className="grid grid-cols-2 gap-4 text-[10px]">
                          <div>
                             <p className="text-slate-400 font-bold uppercase">Penempatan</p>
                             <p className="font-black text-slate-700">{selectedJobDetailForRequest.lokasi}</p>
                          </div>
                          <div>
                             <p className="text-slate-400 font-bold uppercase">Estimasi Gaji</p>
                             <p className="font-black text-emerald-600">{selectedJobDetailForRequest.gaji || "-"}</p>
                          </div>
                          <div className="col-span-2 pt-2">
                             <p className="text-slate-400 font-bold uppercase mb-1">Syarat Khusus</p>
                             <p className="text-slate-600 leading-relaxed italic">{selectedJobDetailForRequest.syaratKhusus || "-"}</p>
                          </div>
                       </div>
                    </div>
                  )}

                  <div>
                     <label className="form-label text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">2. Catatan untuk Admin (Optional)</label>
                     <textarea className="input-field bg-slate-50 border-none font-medium text-xs p-6 rounded-2xl shadow-inner outline-none focus:ring-2 focus:ring-purple-500" rows="4" value={requestData.notes} onChange={(e) => setRequestData({...requestData, notes: e.target.value})} placeholder="Berikan alasan atau keterangan tambahan untuk admin..." />
                  </div>

                  <div className="flex gap-4 pt-6">
                     <button type="button" onClick={() => setShowRequestModal(false)} className="flex-1 py-4 font-black text-slate-300 uppercase text-[10px] tracking-[0.2em] hover:text-slate-500 transition-colors">KEMBALI</button>
                     <button
                        type="submit"
                        className="flex-2 py-4 px-12 bg-gradient-to-r from-purple-600 to-indigo-700 text-white font-black rounded-2xl uppercase text-[10px] tracking-[0.2em] shadow-2xl shadow-purple-200 hover:scale-[1.02] transition-all disabled:opacity-50"
                        disabled={submitting}
                     >
                        {submitting ? "SUBMITTING..." : "SUBMIT REQUEST MATCHING →"}
                     </button>
                  </div>
               </form>
            </div>
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
