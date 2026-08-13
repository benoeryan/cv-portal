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
    perusahaan: "", // Only for admin internal knowledge, hidden in list
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
  });

  useEffect(() => {
    if (!authLoading && (!user || userData?.role !== "partner")) {
      router.push("/");
      return;
    }
    if (user && userData?.role === "partner") {
      loadJobs();
    }
  }, [user, userData, authLoading]);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "jobs"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      // Filter for Open jobs or jobs created by this partner
      setJobs(data.filter(j => j.statusJob === "Open" || j.statusJob === "OPEN" || j.createdBy === user.uid));
    } catch (err) {
      console.error("Error loading jobs:", err);
    }
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

  const handleSubmitJob = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, "jobs"), {
        ...formData,
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
            <p className="text-gray-500 text-sm">Kelola dan cari lowongan kerja yang tersedia</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary bg-purple-600 hover:bg-purple-700 shadow-purple-100 uppercase text-xs font-black tracking-widest px-6 py-3">
            + Input Job Baru
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="md:col-span-2 relative">
             <input className="input-field pl-10" placeholder="Cari nama lowongan atau kode..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
             <svg className="w-5 h-5 absolute left-3 top-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <select className="input-field" value={filterBidang} onChange={(e) => setFilterBidang(e.target.value)}>
            <option value="">Semua Bidang</option>
            {uniqueBidang.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* List Section */}
          <div className="lg:col-span-1 space-y-4 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                onClick={() => setSelectedJob(job)}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                  selectedJob?.id === job.id ? "border-purple-600 bg-purple-50 shadow-md scale-[1.02]" : "border-gray-100 bg-white hover:border-purple-200"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                   <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest">{job.kodeJob || "JOB"}</span>
                   <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${job.statusJob?.toUpperCase() === 'OPEN' ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'}`}>
                    {job.statusJob || "Open"}
                   </span>
                </div>
                <h3 className="font-black text-gray-800 leading-tight uppercase text-sm">{job.namaJob}</h3>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-4 font-bold">
                  <svg className="w-3.5 h-3.5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {job.lokasi}
                </div>
              </div>
            ))}
          </div>

          {/* Detail Section */}
          <div className="lg:col-span-2">
            {selectedJob ? (
              <div className="card sticky top-20 border border-purple-100 shadow-2xl shadow-purple-100/20 rounded-3xl overflow-hidden">
                <div className="bg-gradient-to-r from-purple-600 to-indigo-700 p-8 text-white">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-2 block">Detail Lowongan #{selectedJob.kodeJob}</span>
                  <h2 className="text-3xl font-black leading-tight uppercase tracking-tight">{selectedJob.namaJob}</h2>
                  <div className="flex gap-4 mt-4">
                     <div className="bg-white/10 px-3 py-1 rounded-lg text-xs font-bold border border-white/10 uppercase tracking-widest">{selectedJob.bidang}</div>
                     <div className="bg-white/10 px-3 py-1 rounded-lg text-xs font-bold border border-white/10 uppercase tracking-widest">{selectedJob.kategori}</div>
                  </div>
                </div>

                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                    <div className="space-y-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-purple-50 rounded-2xl text-purple-600 shrink-0">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Penempatan</p>
                          <p className="font-black text-gray-700 text-lg">{selectedJob.lokasi}</p>
                          <p className="text-xs text-slate-400 font-bold italic">{selectedJob.domisiliKerja || "Info menyusul"}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 shrink-0">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estimasi Gaji</p>
                          <p className="font-black text-emerald-600 text-2xl">{selectedJob.gaji || "N/A"}</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                       <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-4">Kriteria Dasar</h4>
                       <div className="space-y-3">
                          <div className="flex justify-between border-b border-slate-200 pb-1.5">
                             <span className="text-[10px] font-bold text-slate-400 uppercase">Usia Max</span>
                             <span className="text-xs font-black text-slate-700 uppercase">{selectedJob.usiaMax || "-"}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-200 pb-1.5">
                             <span className="text-[10px] font-bold text-slate-400 uppercase">Gender</span>
                             <span className="text-xs font-black text-slate-700 uppercase">{selectedJob.jenisKelamin || "-"}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-200 pb-1.5">
                             <span className="text-[10px] font-bold text-slate-400 uppercase">Kuota</span>
                             <span className="text-xs font-black text-slate-700 uppercase">{selectedJob.jumlahKandidat || "-"} Orang</span>
                          </div>
                       </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-black text-gray-800 uppercase mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-4 bg-purple-600 rounded-full"></span>
                        Deskripsi Pekerjaan & Kualifikasi
                      </h4>
                      <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line bg-gray-50 p-6 rounded-2xl border border-gray-100 font-medium">
                        {selectedJob.deskripsiPekerjaan || selectedJob.klasifikasiKandidat || "Tidak ada deskripsi detail."}
                      </p>
                    </div>
                  </div>

                  <div className="mt-10 pt-8 border-t border-gray-100">
                    <button
                      onClick={() => router.push(`/candidate/form?jobCode=${selectedJob.kodeJob}`)}
                      className="w-full py-5 bg-purple-600 text-white font-black rounded-2xl hover:bg-purple-700 transition-all shadow-xl shadow-purple-200 uppercase tracking-widest text-xs"
                    >
                      SILAHKAN ISI DATA SISWA UNTUK LOWONGAN INI →
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[70vh] flex flex-col items-center justify-center text-center p-12 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
                 <div className="p-6 bg-white rounded-full shadow-lg mb-6 text-purple-200">
                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                 </div>
                 <h3 className="text-gray-800 font-black uppercase tracking-tight text-xl">Dashboard Job Mitra</h3>
                 <p className="text-gray-400 text-sm mt-2 max-w-sm">Pilih salah satu lowongan di sebelah kiri untuk melihat informasi lengkap atau tekan tombol Input Job Baru.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Input Job Baru */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center shrink-0 bg-purple-50">
              <div>
                <h3 className="text-lg font-black text-purple-800 uppercase tracking-tight">Input Lowongan Baru (Partner)</h3>
                <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest mt-0.5">Penayangan ke Portal Mitra & Admin</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white rounded-full transition-colors text-slate-400">&times;</button>
            </div>

            <form onSubmit={handleSubmitJob} className="overflow-y-auto p-8 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                   <h4 className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-4">Informasi Dasar</h4>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="form-label text-[10px] font-black uppercase text-slate-400">Kode Lowongan</label>
                        <input className="input-field bg-slate-50 border-none font-bold" value={formData.kodeJob} onChange={(e) => setFormData({...formData, kodeJob: e.target.value})} required />
                      </div>
                      <div>
                        <label className="form-label text-[10px] font-black uppercase text-slate-400">Status</label>
                        <select className="input-field bg-slate-50 border-none font-bold" value={formData.statusJob} onChange={(e) => setFormData({...formData, statusJob: e.target.value})}>
                          <option value="Open">OPEN</option>
                          <option value="Closed">CLOSED</option>
                        </select>
                      </div>
                   </div>
                   <div>
                      <label className="form-label text-[10px] font-black uppercase text-slate-400">Judul Lowongan</label>
                      <input className="input-field bg-slate-50 border-none font-bold" value={formData.namaJob} onChange={(e) => setFormData({...formData, namaJob: e.target.value})} required />
                   </div>
                   <div>
                      <label className="form-label text-[10px] font-black uppercase text-slate-400">Nama Perusahaan (Internal Admin Only)</label>
                      <input className="input-field bg-slate-50 border-none font-bold" value={formData.perusahaan} onChange={(e) => setFormData({...formData, perusahaan: e.target.value})} required placeholder="Hidden from students/partners" />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="form-label text-[10px] font-black uppercase text-slate-400">Prefektur / Lokasi</label>
                        <input className="input-field bg-slate-50 border-none font-bold" value={formData.lokasi} onChange={(e) => setFormData({...formData, lokasi: e.target.value})} required />
                      </div>
                      <div>
                        <label className="form-label text-[10px] font-black uppercase text-slate-400">Gaji</label>
                        <input className="input-field bg-slate-50 border-none font-bold" value={formData.gaji} onChange={(e) => setFormData({...formData, gaji: e.target.value})} />
                      </div>
                   </div>
                </div>

                <div className="space-y-4">
                   <h4 className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-4">Kriteria & Lampiran</h4>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="form-label text-[10px] font-black uppercase text-slate-400">Sektor</label>
                        <input className="input-field bg-slate-50 border-none font-bold" value={formData.bidang} onChange={(e) => setFormData({...formData, bidang: e.target.value})} />
                      </div>
                      <div>
                        <label className="form-label text-[10px] font-black uppercase text-slate-400">Usia Max</label>
                        <input className="input-field bg-slate-50 border-none font-bold" value={formData.usiaMax} onChange={(e) => setFormData({...formData, usiaMax: e.target.value})} />
                      </div>
                   </div>
                   <div>
                      <label className="form-label text-[10px] font-black uppercase text-slate-400">File Pendukung</label>
                      <div className="flex gap-2">
                         <button type="button" onClick={() => fileInputRef.current.click()} className="bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-700 disabled:opacity-50 flex items-center gap-2" disabled={uploading}>
                            {uploading ? "Uploading..." : "Pilih File"}
                         </button>
                         <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
                         {formData.fileUrl && <div className="bg-emerald-50 px-3 rounded-xl border border-emerald-100 flex items-center"><span className="text-[10px] font-bold text-emerald-600">Terlampir ✓</span></div>}
                      </div>
                   </div>
                   <div>
                      <label className="form-label text-[10px] font-black uppercase text-slate-400">Deskripsi & Syarat</label>
                      <textarea className="input-field bg-slate-50 border-none font-bold text-xs" rows="5" value={formData.deskripsiPekerjaan} onChange={(e) => setFormData({...formData, deskripsiPekerjaan: e.target.value})} />
                   </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-8 pb-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 rounded-xl font-bold text-slate-400 hover:bg-slate-50 transition-all uppercase text-xs tracking-widest">Batal</button>
                <button type="submit" className="bg-purple-600 text-white px-10 py-2.5 rounded-xl font-black shadow-xl shadow-purple-100 hover:bg-purple-700 transition-all uppercase text-xs tracking-widest" disabled={saving || uploading}>
                  {saving ? "Processing..." : "Ajukan Lowongan"}
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
        .card { animation: fadeIn 0.3s ease-out forwards; }
      `}</style>
    </>
  );
}
