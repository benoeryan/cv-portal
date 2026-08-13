"use client";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { db, storage } from "@/lib/firebase";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import Navbar from "@/components/Navbar";

export default function PartnerJobListPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);

  // Dashboard & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBidang, setFilterBidang] = useState("");

  // Form State for Partner Input Job
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    kodeJob: "",
    namaJob: "",
    perusahaan: "", // Hidden in list for privacy
    lokasi: "",
    bidang: "",
    kategori: "",
    gaji: "",
    keterangan: "",
    benefit: "",
    klasifikasiKandidat: "",
    deskripsiPekerjaan: "",
    statusJob: "Open",
    domisiliKerja: "",
    fileUrl: "",
    biayaJob: "",
    skemaPembayaran: "",
    benefitBiaya: "",
    sumberJob: "",
    usiaMax: "",
    jenisKelamin: "Pria & Wanita",
    jumlahKandidat: "",
    kumiaiPartner: "",
    syaratKhusus: "",
  });

  useEffect(() => {
    if (!authLoading && (!user || !["partner", "admin"].includes(userData?.role))) {
      router.push("/");
      return;
    }
    if (user && ["partner", "admin"].includes(userData?.role)) {
      loadJobs();
    }
  }, [user, userData, authLoading]);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "jobs"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setJobs(data.filter(j => j.statusJob === "Open" || j.statusJob === "OPEN" || j.createdBy === user.uid));
    } catch (err) { console.error("Error loading jobs:", err); }
    setLoading(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const storagePath = `jobs/attachments/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file);
    uploadTask.on("state_changed",
      (snapshot) => setUploadProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)),
      (err) => { setUploading(false); alert(err.message); },
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        setFormData(prev => ({ ...prev, fileUrl: url }));
        setUploading(false);
      }
    );
  };

  const generateJobCode = () => {
    const prefix = "PART";
    const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, "");
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${datePart}-${randomPart}`;
  };

  const handleSubmitJob = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let finalKodeJob = formData.kodeJob;
      if (!finalKodeJob) finalKodeJob = generateJobCode();

      await addDoc(collection(db, "jobs"), {
        ...formData,
        kodeJob: finalKodeJob,
        createdBy: user.uid,
        partnerName: userData.fullName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setShowModal(false);
      loadJobs();
      alert("Lowongan berhasil diajukan dan akan ditayangkan!");
    } catch (err) { alert(err.message); }
    setSaving(false);
  };

  const filteredJobs = jobs.filter(j => {
    const matchSearch = !searchTerm || j.namaJob?.toLowerCase().includes(searchTerm.toLowerCase()) || j.kodeJob?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchBidang = !filterBidang || j.bidang === filterBidang;
    return matchSearch && matchBidang;
  });

  const uniqueBidang = [...new Set(jobs.map(j => j.bidang).filter(Boolean))].sort();

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-800 tracking-tight uppercase">Dashboard Lowongan Mitra</h1>
            <p className="text-gray-500 text-sm font-bold uppercase tracking-widest mt-1">Sistem Katalog Job Matching IJEF</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary bg-purple-600 hover:bg-purple-700 shadow-purple-100 uppercase text-xs font-black tracking-widest px-8 py-4 rounded-2xl transition-all">
            + Input Lowongan Baru
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="md:col-span-2 relative">
             <input className="input-field pl-12 h-14 border-none shadow-sm bg-white rounded-2xl" placeholder="Cari nama lowongan atau kode..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
             <svg className="w-6 h-6 absolute left-4 top-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <select className="input-field h-14 border-none shadow-sm bg-white rounded-2xl font-bold" value={filterBidang} onChange={(e) => setFilterBidang(e.target.value)}>
            <option value="">Semua Bidang</option>
            {uniqueBidang.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* List Section */}
          <div className="lg:col-span-1 space-y-4 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                onClick={() => setSelectedJob(job)}
                className={`p-6 rounded-[2rem] border-2 cursor-pointer transition-all ${
                  selectedJob?.id === job.id ? "border-purple-600 bg-purple-50 shadow-xl scale-[1.02]" : "border-white bg-white shadow-sm hover:border-purple-100"
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                   <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest bg-purple-100/50 px-2.5 py-1 rounded-lg">{job.kodeJob}</span>
                   <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase border ${job.statusJob?.toUpperCase() === 'OPEN' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                    {job.statusJob || "Open"}
                   </span>
                </div>
                <h3 className="font-black text-slate-800 leading-tight uppercase text-base">{job.namaJob}</h3>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-5 font-bold uppercase tracking-tight">
                  <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {job.lokasi}
                </div>
              </div>
            ))}
          </div>

          {/* Detail Section */}
          <div className="lg:col-span-2">
            {selectedJob ? (
              <div className="card sticky top-20 border border-purple-100 shadow-2xl shadow-purple-100/20 rounded-[2.5rem] overflow-hidden">
                <div className="bg-gradient-to-r from-purple-600 to-indigo-700 p-10 text-white">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80 mb-3 block">Detail Lowongan #{selectedJob.kodeJob}</span>
                  <h2 className="text-4xl font-black leading-tight uppercase tracking-tight">{selectedJob.namaJob}</h2>
                  <div className="flex flex-wrap gap-3 mt-6">
                     <div className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-xl text-[10px] font-black border border-white/20 uppercase tracking-widest">{selectedJob.bidang}</div>
                     <div className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-xl text-[10px] font-black border border-white/20 uppercase tracking-widest">{selectedJob.kategori}</div>
                     {selectedJob.jenisKelamin && <div className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-xl text-[10px] font-black border border-white/20 uppercase tracking-widest">{selectedJob.jenisKelamin}</div>}
                  </div>
                </div>

                <div className="p-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
                    <div className="space-y-8">
                      <div className="flex items-start gap-5">
                        <div className="p-4 bg-purple-50 rounded-2xl text-purple-600 shrink-0 shadow-sm">
                          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </div>
                        <div>
                          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Penempatan</p>
                          <p className="font-black text-gray-700 text-xl">{selectedJob.lokasi}</p>
                          <p className="text-xs text-purple-400 font-bold italic mt-1">{selectedJob.domisiliKerja || "Info menyusul"}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-5">
                        <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600 shrink-0 shadow-sm">
                          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <div>
                          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Estimasi Gaji</p>
                          <p className="font-black text-emerald-600 text-3xl tracking-tight">{selectedJob.gaji || "N/A"}</p>
                        </div>
                      </div>

                      {selectedJob.kumiaiPartner && (
                        <div className="flex items-start gap-5">
                          <div className="p-4 bg-amber-50 rounded-2xl text-amber-600 shrink-0 shadow-sm">
                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                          </div>
                          <div>
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Partner Rujukan / TSK</p>
                            <p className="font-black text-amber-600 text-xl uppercase">{selectedJob.kumiaiPartner}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 space-y-6">
                       <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em] border-b border-slate-200 pb-3">Kriteria & Kebutuhan</h4>
                       <div className="space-y-4">
                          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Usia Max</span>
                             <span className="text-sm font-black text-slate-700 uppercase">{selectedJob.usiaMax || "-"}</span>
                          </div>
                          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gender</span>
                             <span className="text-sm font-black text-slate-700 uppercase">{selectedJob.jenisKelamin || "-"}</span>
                          </div>
                          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kuota</span>
                             <span className="text-sm font-black text-slate-700 uppercase">{selectedJob.jumlahKandidat || "-"} ORANG</span>
                          </div>
                       </div>

                       <div className="pt-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Target Sektor</p>
                          <span className="inline-block bg-white px-4 py-1.5 rounded-xl border border-slate-100 text-xs font-black text-purple-600 uppercase tracking-tight">{selectedJob.bidang}</span>
                       </div>
                    </div>
                  </div>

                  <div className="space-y-10">
                    {selectedJob.syaratKhusus && (
                       <div className="p-8 bg-rose-50 rounded-[2rem] border border-rose-100 relative overflow-hidden">
                          <svg className="absolute -right-4 -bottom-4 w-32 h-32 text-rose-100" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                          <div className="relative z-10">
                             <h4 className="text-xs font-black text-rose-800 uppercase mb-4 tracking-widest flex items-center gap-2">
                               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                               Kualifikasi & Syarat Khusus (JLPT/SSW)
                             </h4>
                             <p className="text-rose-900 text-base font-black leading-relaxed whitespace-pre-line uppercase tracking-tight drop-shadow-sm">
                               {selectedJob.syaratKhusus}
                             </p>
                          </div>
                       </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-4">
                       <div className="space-y-4">
                          <h4 className="text-xs font-black text-slate-800 uppercase flex items-center gap-3 tracking-widest">
                            <span className="w-1.5 h-4 bg-purple-600 rounded-full"></span>
                            Deskripsi Tugas & Harian
                          </h4>
                          <div className="text-slate-600 text-sm leading-relaxed whitespace-pre-line bg-slate-50 p-6 rounded-[2rem] border border-slate-100 font-medium italic shadow-inner">
                            {selectedJob.deskripsiPekerjaan || "Deskripsi belum tersedia secara detail."}
                          </div>
                       </div>

                       <div className="space-y-8">
                          {selectedJob.benefit && (
                            <div className="space-y-4">
                              <h4 className="text-xs font-black text-slate-800 uppercase flex items-center gap-3 tracking-widest">
                                <span className="w-1.5 h-4 bg-emerald-500 rounded-full"></span>
                                Fasilitas & Benefit
                              </h4>
                              <div className="text-slate-600 text-sm leading-relaxed whitespace-pre-line bg-emerald-50/20 p-6 rounded-[2rem] border border-emerald-50 font-medium">
                                {selectedJob.benefit}
                              </div>
                            </div>
                          )}

                          {selectedJob.biayaJob && (
                             <div className="space-y-4">
                               <h4 className="text-xs font-black text-slate-800 uppercase flex items-center gap-3 tracking-widest">
                                 <span className="w-1.5 h-4 bg-orange-500 rounded-full"></span>
                                 Informasi Biaya & Skema
                               </h4>
                               <div className="text-slate-600 text-sm leading-relaxed bg-orange-50/20 p-6 rounded-[2rem] border border-orange-50 font-bold uppercase tracking-tight">
                                 {selectedJob.biayaJob}
                                 {selectedJob.skemaPembayaran && <p className="mt-3 text-[10px] text-orange-400 font-black tracking-[0.2em] border-t border-orange-100 pt-3">SKEMA: {selectedJob.skemaPembayaran}</p>}
                               </div>
                             </div>
                          )}
                       </div>
                    </div>
                  </div>

                  <div className="mt-12 pt-10 border-t border-slate-100">
                    <button
                      onClick={() => router.push(`/candidate/form?jobCode=${selectedJob.kodeJob}`)}
                      className="w-full py-6 bg-gradient-to-r from-purple-600 to-indigo-700 text-white font-black rounded-3xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-purple-200 uppercase tracking-[0.2em] text-xs"
                    >
                      SILAHKAN ISI DATA SISWA UNTUK LOWONGAN INI →
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[75vh] flex flex-col items-center justify-center text-center p-12 bg-white rounded-[3.5rem] border-2 border-dashed border-slate-100 shadow-inner">
                 <div className="p-8 bg-purple-50 rounded-full shadow-lg mb-8 text-purple-200 animate-pulse">
                    <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                 </div>
                 <h3 className="text-slate-800 font-black uppercase tracking-tight text-2xl">Pilih Katalog Job</h3>
                 <p className="text-slate-400 text-sm mt-3 max-w-sm font-bold uppercase tracking-widest leading-loose">Klik salah satu kartu di sebelah kiri untuk meninjau kriteria lowongan</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Input Job Baru */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl overflow-hidden max-h-[95vh] flex flex-col">
            <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center shrink-0 bg-slate-50">
              <div className="flex items-center gap-3">
                 <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                 </div>
                 <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">ENTRY DATA LOWONGAN MITRA</h3>
                    <p className="text-[10px] text-purple-600 font-black uppercase tracking-[0.2em] mt-0.5 italic">International Japan Employment Foundation</p>
                 </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-3 hover:bg-white rounded-full transition-colors text-slate-300 hover:text-slate-800 text-2xl">&times;</button>
            </div>

            <form onSubmit={handleSubmitJob} className="overflow-y-auto p-10 custom-scrollbar">
              <div className="space-y-10">

                {/* SECTION: INFORMASI DASAR & LOKASI */}
                <div className="p-8 border-2 border-slate-50 rounded-[2.5rem] space-y-8 relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                      <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                   </div>
                   <div className="flex items-center gap-3 mb-2">
                      <div className="w-1.5 h-6 bg-purple-600 rounded-full"></div>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Informasi Dasar & Lokasi</h4>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div>
                        <label className="form-label text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Kode Lowongan</label>
                        <input className="input-field bg-slate-50 border-none font-bold h-12 rounded-xl" value={formData.kodeJob} onChange={(e) => setFormData({...formData, kodeJob: e.target.value})} placeholder="CONTOH: INTL015 / IND012" />
                      </div>
                      <div>
                        <label className="form-label text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Status Lowongan</label>
                        <select className="input-field bg-slate-50 border-none font-bold h-12 rounded-xl" value={formData.statusJob} onChange={(e) => setFormData({...formData, statusJob: e.target.value})}>
                          <option value="Open">Aktif (OPEN)</option>
                          <option value="Closed">Tutup (CLOSED)</option>
                        </select>
                      </div>
                      <div>
                        <label className="form-label text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Prefektur / Lokasi</label>
                        <input className="input-field bg-slate-50 border-none font-bold h-12 rounded-xl" value={formData.lokasi} onChange={(e) => setFormData({...formData, lokasi: e.target.value})} required placeholder="Tokyo, Chiba, dll" />
                      </div>
                      <div className="md:col-span-3">
                        <label className="form-label text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Nama Lowongan / Judul Job</label>
                        <input className="input-field bg-slate-50 border-none font-bold uppercase h-14 rounded-xl text-lg px-6" value={formData.namaJob} onChange={(e) => setFormData({...formData, namaJob: e.target.value})} required placeholder="KAIGO 介護 (PERAWAT LANSIA) / PETERNAKAN SAPI (畜産業)" />
                      </div>
                      <div>
                        <label className="form-label text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Nama Perusahaan (Internal Only)</label>
                        <input className="input-field bg-slate-50 border-none font-bold h-12 rounded-xl" value={formData.perusahaan} onChange={(e) => setFormData({...formData, perusahaan: e.target.value})} required placeholder="Kaisha Japan Co., Ltd" />
                      </div>
                      <div>
                        <label className="form-label text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Gaji (Bulan/Tahun)</label>
                        <input className="input-field bg-slate-50 border-none font-bold text-rose-600 h-12 rounded-xl" value={formData.gaji} onChange={(e) => setFormData({...formData, gaji: e.target.value})} placeholder="210.000円/bulan" />
                      </div>
                      <div>
                        <label className="form-label text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Kumiai / TSK Partner Rujukan</label>
                        <input className="input-field bg-slate-50 border-none font-bold h-12 rounded-xl" value={formData.kumiaiPartner} onChange={(e) => setFormData({...formData, kumiaiPartner: e.target.value})} placeholder="Hibiki / Enlink / dll" />
                      </div>
                   </div>
                </div>

                {/* SECTION: KLASIFIKASI & PERSYARATAN */}
                <div className="p-8 border-2 border-slate-50 rounded-[2.5rem] space-y-8">
                   <div className="flex items-center gap-3 mb-2">
                      <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Klasifikasi & Persyaratan Kandidat</h4>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div>
                        <label className="form-label text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Klasifikasi Target Kandidat</label>
                        <select className="input-field bg-slate-50 border-none font-bold h-12 rounded-xl" value={formData.kategori} onChange={(e) => setFormData({...formData, kategori: e.target.value})}>
                          <option value="NEW COMER">SISWA NON IJEF (New Comer)</option>
                          <option value="EX-MAGANG">SISWA MATCHING JOB (Ex-Magang)</option>
                          <option value="ENGINEERING">SISWA MATCHING JOB (Engineering)</option>
                        </select>
                      </div>
                      <div>
                        <label className="form-label text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Gender / Jenis Kelamin</label>
                        <select className="input-field bg-slate-50 border-none font-bold h-12 rounded-xl" value={formData.jenisKelamin} onChange={(e) => setFormData({...formData, jenisKelamin: e.target.value})}>
                          <option value="Pria & Wanita">Pria & Wanita (男女)</option>
                          <option value="Pria Saja">Pria Saja (男)</option>
                          <option value="Wanita Saja">Wanita Saja (女)</option>
                        </select>
                      </div>
                      <div>
                        <label className="form-label text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Kuota / Jumlah Kebutuhan</label>
                        <input className="input-field bg-slate-50 border-none font-bold text-emerald-600 h-12 rounded-xl" value={formData.jumlahKandidat} onChange={(e) => setFormData({...formData, jumlahKandidat: e.target.value})} placeholder="5" />
                      </div>
                      <div className="md:col-span-3">
                        <label className="form-label text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Kualifikasi & Syarat Khusus (JLPT, SSW, USIA, PENGALAMAN)</label>
                        <textarea className="input-field bg-slate-50 border-none font-medium text-xs p-6 rounded-2xl" rows="3" value={formData.syaratKhusus} onChange={(e) => setFormData({...formData, syaratKhusus: e.target.value})} placeholder="JLPT N4 / JFT-Basic A2 + SSW..." />
                      </div>
                   </div>
                </div>

                {/* SECTION: BIAYA & FASILITAS */}
                <div className="p-8 border-2 border-slate-50 rounded-[2.5rem] space-y-8">
                   <div className="flex items-center gap-3 mb-2">
                      <div className="w-1.5 h-6 bg-emerald-600 rounded-full"></div>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Informasi Biaya & Fasilitas</h4>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <label className="form-label text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Biaya Job / Proses & Tanggungan</label>
                        <textarea className="input-field bg-slate-50 border-none font-medium text-xs p-6 rounded-2xl" rows="2" value={formData.biayaJob} onChange={(e) => setFormData({...formData, biayaJob: e.target.value})} placeholder="Sesuai ketentuan..." />
                      </div>
                      <div>
                        <label className="form-label text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Fasilitas Asrama & Benefit</label>
                        <textarea className="input-field bg-slate-50 border-none font-medium text-xs p-6 rounded-2xl" rows="2" value={formData.benefit} onChange={(e) => setFormData({...formData, benefit: e.target.value})} placeholder="Asrama fully furnished, dll" />
                      </div>
                   </div>
                </div>

                {/* SECTION: DESKRIPSI DETAIL */}
                <div className="p-8 border-2 border-slate-50 rounded-[2.5rem] space-y-8">
                   <div>
                      <label className="form-label text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Deskripsi Pekerjaan & Tugas Harian</label>
                      <textarea className="input-field bg-slate-50 border-none font-medium text-xs p-6 rounded-2xl" rows="5" value={formData.deskripsiPekerjaan} onChange={(e) => setFormData({...formData, deskripsiPekerjaan: e.target.value})} placeholder="Uraian tugas harian di tempat kerja..." />
                   </div>
                   <div>
                      <label className="form-label text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Keterangan Tambahan / Syarat Khusus</label>
                      <textarea className="input-field bg-slate-50 border-none font-medium text-xs p-6 rounded-2xl" rows="3" value={formData.keterangan} onChange={(e) => setFormData({...formData, keterangan: e.target.value})} placeholder="Catatan khusus lainnya..." />
                   </div>
                   <div className="pt-2">
                      <label className="form-label text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 block">Upload File Lampiran (Kriteria/Foto Job)</label>
                      <div className="flex gap-4">
                         <button type="button" onClick={() => fileInputRef.current.click()} className="bg-slate-900 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2 shadow-xl shadow-slate-100 transition-all" disabled={uploading}>
                            {uploading ? "UPLOADING..." : "PILIH FILE"}
                         </button>
                         <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
                         {formData.fileUrl && <div className="bg-emerald-50 px-5 rounded-2xl border border-emerald-100 flex items-center shadow-sm"><span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest animate-pulse">File Terunggah ✓</span></div>}
                      </div>
                      {uploading && (
                         <div className="w-full bg-slate-100 h-1.5 mt-4 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-600 transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                         </div>
                      )}
                   </div>
                </div>

              </div>

              <div className="flex gap-4 justify-end pt-12 pb-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-10 py-4 font-black text-slate-400 uppercase text-[10px] tracking-[0.2em] hover:bg-slate-50 rounded-2xl transition-all">BATAL</button>
                <button type="submit" className="bg-slate-900 text-white px-16 py-4 rounded-2xl font-black shadow-2xl shadow-slate-200 hover:bg-indigo-600 transition-all uppercase text-[10px] tracking-[0.2em] flex items-center gap-3 active:scale-95" disabled={saving || uploading}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                  {saving ? "SIMPAN..." : "SIMPAN DATA LOWONGAN"}
                </button>
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
        .card { animation: fadeIn 0.4s ease-out forwards; }
      `}</style>
    </>
  );
}
