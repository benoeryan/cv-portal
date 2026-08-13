"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { db, storage } from "@/lib/firebase";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import Navbar from "@/components/Navbar";

export default function JobManagementPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Advanced Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState(""); // "namaJob", "perusahaan", "bidang", "domisili"
  const [filterValue, setFilterValue] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [selectedJobDetail, setSelectedJobDetail] = useState(null);

  const [formData, setFormData] = useState({
    kodeJob: "",
    namaJob: "",
    perusahaan: "",
    lokasi: "",
    bidang: "",
    kategori: "SISWA NON IJEF : NEW COMER",
    klasifikasiSkema: "Standard",
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

  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!authLoading && (!user || userData?.role !== "admin")) {
      router.push("/");
      return;
    }
    if (user && userData?.role === "admin") {
      loadJobs();
    }
  }, [user, userData, authLoading]);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "jobs"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      setJobs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const dashboardStats = useMemo(() => {
    const stats = {
      sektor: {},
      perusahaan: {},
      namaJob: {},
      indo: 0,
      jepang: 0
    };

    jobs.forEach(j => {
      const b = j.bidang || "Lainnya"; stats.sektor[b] = (stats.sektor[b] || 0) + 1;
      const p = j.perusahaan || "N/A"; stats.perusahaan[p] = (stats.perusahaan[p] || 0) + 1;
      const n = j.namaJob || "Job"; stats.namaJob[n] = (stats.namaJob[n] || 0) + 1;
      if (j.kategori?.includes("NEW COMER")) stats.indo++;
      else if (j.kategori?.includes("EX-MAGANG") || j.kategori?.includes("ENGINEERING")) stats.jepang++;
    });

    return {
      sektor: Object.entries(stats.sektor).sort((a,b) => b[1]-a[1]).slice(0, 5),
      perusahaan: Object.entries(stats.perusahaan).sort((a,b) => b[1]-a[1]).slice(0, 5),
      namaJob: Object.entries(stats.namaJob).sort((a,b) => b[1]-a[1]).slice(0, 5),
      indo: stats.indo,
      jepang: stats.jepang
    };
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    return jobs.filter(j => {
      const matchSearch = !searchTerm ||
        j.namaJob?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        j.kodeJob?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        j.perusahaan?.toLowerCase().includes(searchTerm.toLowerCase());

      let matchDashboard = true;
      if (filterType === "bidang") matchDashboard = j.bidang === filterValue;
      if (filterType === "perusahaan") matchDashboard = j.perusahaan === filterValue;
      if (filterType === "namaJob") matchDashboard = j.namaJob === filterValue;
      if (filterType === "domisiliIndo") matchDashboard = j.kategori?.includes("NEW COMER");
      if (filterType === "domisiliJepang") matchDashboard = j.kategori?.includes("EX-MAGANG") || j.kategori?.includes("ENGINEERING");

      return matchSearch && matchDashboard;
    });
  }, [jobs, searchTerm, filterType, filterValue]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const storagePath = `jobs/attachments/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file);
    uploadTask.on("state_changed",
      (snap) => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      (err) => { setUploading(false); alert(err.message); },
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        setFormData(prev => ({ ...prev, fileUrl: url }));
        setUploading(false);
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const dataToSave = { ...formData, updatedAt: new Date().toISOString() };
      if (editingJob) await updateDoc(doc(db, "jobs", editingJob.id), dataToSave);
      else await addDoc(collection(db, "jobs"), { ...dataToSave, createdAt: new Date().toISOString() });
      closeModal(); loadJobs();
    } catch (err) { alert(err.message); }
    setSubmitting(false);
  };

  const closeModal = () => {
    setShowModal(false); setEditingJob(null);
    setFormData({
      kodeJob: "", namaJob: "", perusahaan: "", lokasi: "", bidang: "", kategori: "SISWA NON IJEF : NEW COMER",
      klasifikasiSkema: "Standard", gaji: "", keterangan: "", benefit: "", klasifikasiKandidat: "",
      deskripsiPekerjaan: "", statusJob: "Open", domisiliKerja: "", fileUrl: "", biayaJob: "",
      skemaPembayaran: "", benefitBiaya: "", sumberJob: "", usiaMax: "", jenisKelamin: "Pria & Wanita",
      jumlahKandidat: "", kumiaiPartner: "", syaratKhusus: "",
    });
  };

  const handleEdit = (job) => {
    setEditingJob(job);
    setFormData({ ...formData, ...job });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Hapus job ini?")) return;
    try { await deleteDoc(doc(db, "jobs", id)); loadJobs(); } catch (err) { alert(err.message); }
  };

  if (authLoading || loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <>
      <Navbar />
      <div className="max-w-full mx-auto px-6 py-8 bg-[#F8F9FC] min-h-screen">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Manajemen Job Center v4.0</h1>
            <div className="flex items-center gap-3">
               <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
               <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">International Japan Employment Foundation</p>
            </div>
          </div>
          <button onClick={() => setShowModal(true)} className="bg-slate-900 text-white px-10 py-5 rounded-[2rem] font-black shadow-2xl shadow-slate-200 hover:bg-indigo-600 transition-all uppercase text-[10px] tracking-widest active:scale-95">
            + Tambah Lowongan Baru
          </button>
        </div>

        {/* NEW V4.0 CLASSIFICATION DASHBOARD */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
           {/* Nama Lowongan */}
           <div className="card p-6 border-2 border-white bg-white/60 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Klasifikasi Lowongan</p>
              <div className="space-y-3">
                 {dashboardStats.namaJob.map(([n, count]) => (
                   <div key={n} onClick={() => {setFilterType("namaJob"); setFilterValue(n);}} className={`flex justify-between items-center group cursor-pointer p-2 rounded-xl transition-colors ${filterValue === n ? 'bg-indigo-600 text-white' : 'hover:bg-indigo-50'}`}>
                      <span className={`text-[10px] font-bold truncate mr-2 ${filterValue === n ? 'text-white' : 'text-slate-600'}`}>{n}</span>
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black ${filterValue === n ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-600'}`}>{count}</span>
                   </div>
                 ))}
              </div>
           </div>

           {/* Perusahaan */}
           <div className="card p-6 border-2 border-white bg-white/60 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Daftar Perusahaan</p>
              <div className="space-y-3">
                 {dashboardStats.perusahaan.map(([p, count]) => (
                   <div key={p} onClick={() => {setFilterType("perusahaan"); setFilterValue(p);}} className={`flex justify-between items-center group cursor-pointer p-2 rounded-xl transition-colors ${filterValue === p ? 'bg-slate-800 text-white' : 'hover:bg-slate-100'}`}>
                      <span className={`text-[10px] font-bold truncate mr-2 ${filterValue === p ? 'text-white' : 'text-slate-600'}`}>{p}</span>
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black ${filterValue === p ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
                   </div>
                 ))}
              </div>
           </div>

           {/* Sektor */}
           <div className="card p-6 border-2 border-white bg-white/60 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Sektor / Bidang</p>
              <div className="space-y-3">
                 {dashboardStats.sektor.map(([s, count]) => (
                   <div key={s} onClick={() => {setFilterType("bidang"); setFilterValue(s);}} className={`flex justify-between items-center group cursor-pointer p-2 rounded-xl transition-colors ${filterValue === s ? 'bg-blue-600 text-white' : 'hover:bg-blue-50'}`}>
                      <span className={`text-[10px] font-bold truncate mr-2 ${filterValue === s ? 'text-white' : 'text-slate-600'}`}>{s}</span>
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black ${filterValue === s ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'}`}>{count}</span>
                   </div>
                 ))}
              </div>
           </div>

           {/* Domisili Indo */}
           <div
             onClick={() => {setFilterType("domisiliIndo"); setFilterValue(true);}}
             className={`card p-10 rounded-[3rem] border-4 transition-all cursor-pointer flex flex-col justify-center items-center text-center ${filterType === 'domisiliIndo' ? 'bg-indigo-600 border-indigo-200 text-white shadow-2xl scale-105' : 'bg-white border-white hover:border-indigo-100 shadow-sm'}`}
           >
              <div className={`p-5 rounded-3xl mb-5 ${filterType === 'domisiliIndo' ? 'bg-white/20' : 'bg-indigo-50 text-indigo-600'}`}>
                 <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064" /></svg>
              </div>
              <h3 className="text-5xl font-black">{dashboardStats.indo}</h3>
              <p className={`text-[11px] font-black uppercase tracking-widest mt-3 ${filterType === 'domisiliIndo' ? 'text-indigo-200' : 'text-slate-400'}`}>Domisili Indonesia</p>
           </div>

           {/* Domisili Jepang */}
           <div
             onClick={() => {setFilterType("domisiliJepang"); setFilterValue(true);}}
             className={`card p-10 rounded-[3rem] border-4 transition-all cursor-pointer flex flex-col justify-center items-center text-center ${filterType === 'domisiliJepang' ? 'bg-rose-600 border-rose-200 text-white shadow-2xl scale-105' : 'bg-white border-white hover:border-rose-100 shadow-sm'}`}
           >
              <div className={`p-5 rounded-3xl mb-5 ${filterType === 'domisiliJepang' ? 'bg-white/20' : 'bg-rose-50 text-rose-600'}`}>
                 <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              </div>
              <h3 className="text-5xl font-black">{dashboardStats.jepang}</h3>
              <p className={`text-[11px] font-black uppercase tracking-widest mt-3 ${filterType === 'domisiliJepang' ? 'text-rose-200' : 'text-slate-400'}`}>Domisili Jepang</p>
           </div>
        </div>

        {/* Global Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
           <div className="flex-1 relative">
              <input className="input-field pl-12 h-16 border-none shadow-xl bg-white rounded-3xl font-bold text-lg" placeholder="Cari nama lowongan, kode, atau kata kunci..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              <svg className="w-6 h-6 absolute left-4 top-5 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
           </div>
           {filterType && (
              <button onClick={() => {setFilterType(""); setFilterValue("");}} className="bg-rose-50 text-rose-600 px-8 rounded-3xl font-black uppercase text-[10px] tracking-widest border-2 border-rose-100 hover:bg-rose-100 transition-all">
                Hapus Filter: {filterType} ✕
              </button>
           )}
        </div>

        <div className="card overflow-hidden !p-0 border-none shadow-2xl rounded-[3rem] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white uppercase font-black text-[10px] tracking-widest">
                  <th className="py-7 px-8">Skema</th>
                  <th className="py-7 px-8">Data Lowongan</th>
                  <th className="py-7 px-8">Perusahaan & Prefektur</th>
                  <th className="py-7 px-8">Sektor</th>
                  <th className="py-7 px-8">Gaji</th>
                  <th className="py-7 px-8">Status</th>
                  <th className="py-7 px-8 text-center">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredJobs.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-50/80 transition-all cursor-pointer group" onClick={() => { setSelectedJobDetail(j); setShowDetailModal(true); }}>
                    <td className="py-6 px-8">
                       <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                         j.klasifikasiSkema === 'Urgency' ? 'bg-rose-600 text-white animate-pulse' :
                         j.klasifikasiSkema === 'Standard' ? 'bg-indigo-600 text-white' : 'bg-emerald-500 text-white'
                       }`}>
                          {j.klasifikasiSkema || "Standard"}
                       </span>
                    </td>
                    <td className="py-6 px-8">
                      <div className="font-black text-slate-800 uppercase text-sm group-hover:text-indigo-600 transition-colors leading-tight">{j.namaJob}</div>
                      <div className="text-[10px] text-slate-400 font-bold mt-1.5 tracking-tight flex items-center gap-2">
                         <span className="bg-slate-100 px-2 py-0.5 rounded-md">{j.kodeJob}</span>
                         <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                         <span>{j.kategori}</span>
                      </div>
                    </td>
                    <td className="py-6 px-8">
                      <div className="font-black text-slate-700 text-xs uppercase">{j.perusahaan || "---"}</div>
                      <div className="text-[10px] text-indigo-400 flex items-center gap-1.5 mt-1 font-bold uppercase">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                        {j.lokasi}
                      </div>
                    </td>
                    <td className="py-6 px-8">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">{j.bidang}</span>
                    </td>
                    <td className="py-6 px-8 font-black text-emerald-600 text-sm tracking-tighter italic">{j.gaji || "---"}</td>
                    <td className="py-6 px-8">
                       <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border-2 ${j.statusJob?.toUpperCase() === 'OPEN' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                        {j.statusJob}
                       </span>
                    </td>
                    <td className="py-6 px-8" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-center gap-3">
                        <button onClick={() => handleEdit(j)} className="p-3 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-900 hover:text-white transition-all shadow-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button onClick={() => handleDelete(j.id)} className="p-3 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-600 hover:text-white transition-all shadow-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL: ENTRY & UPDATE */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xl animate-fadeIn">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl overflow-hidden max-h-[95vh] flex flex-col">
            <div className="px-12 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">{editingJob ? "Update Katalog Lowongan" : "Entry Lowongan Baru"}</h3>
                <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest mt-1">Lengkapi informasi kriteria untuk dipublish ke mitra</p>
              </div>
              <button onClick={closeModal} className="text-slate-300 hover:text-slate-800 text-4xl font-light transition-colors">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="overflow-y-auto p-12 custom-scrollbar space-y-12">
               <div className="p-8 border-2 border-slate-50 rounded-[2.5rem] space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                     <div className="space-y-4">
                        <label className="form-label text-[11px] font-black uppercase tracking-widest text-slate-400">Pilih Kategori Domisili</label>
                        <select className="input-field h-14 bg-slate-50 border-none font-bold rounded-2xl" value={formData.kategori} onChange={(e) => setFormData({...formData, kategori: e.target.value})}>
                           <option value="SISWA NON IJEF : NEW COMER">Domisili Indonesia (New Comer)</option>
                           <option value="SISWA MATCHING JOB : EX-MAGANG/EX-TRAINEE">Domisili Jepang (Ex-Magang)</option>
                           <option value="SISWA MATCHING JOB : ENGINEERING/GIJINKOKU">Domisili Jepang (Engineering)</option>
                        </select>
                     </div>
                     <div className="space-y-4">
                        <label className="form-label text-[11px] font-black uppercase tracking-widest text-slate-400">Pilih Skema Prioritas</label>
                        <select className="input-field h-14 bg-slate-50 border-none font-bold rounded-2xl" value={formData.klasifikasiSkema} onChange={(e) => setFormData({...formData, klasifikasiSkema: e.target.value})}>
                           <option value="Urgency">URGENCY (URGENT)</option>
                           <option value="Standard">STANDARD (REGULAR)</option>
                           <option value="Routine">ROUTINE (MASSAL)</option>
                        </select>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                     <div className="md:col-span-2 space-y-4">
                        <label className="form-label text-[11px] font-black uppercase tracking-widest text-slate-400">Judul Lowongan Kerja</label>
                        <input className="input-field h-14 bg-slate-50 border-none font-bold rounded-2xl uppercase" value={formData.namaJob} onChange={(e) => setFormData({...formData, namaJob: e.target.value})} required placeholder="Contoh: KAIGO / KONSTRUKSI" />
                     </div>
                     <div className="space-y-4">
                        <label className="form-label text-[11px] font-black uppercase tracking-widest text-slate-400">Kode Job (Optional)</label>
                        <input className="input-field h-14 bg-slate-50 border-none font-bold rounded-2xl" value={formData.kodeJob} onChange={(e) => setFormData({...formData, kodeJob: e.target.value})} placeholder="INTL-XXXX" />
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                     <div className="space-y-4">
                        <label className="form-label text-[11px] font-black uppercase tracking-widest text-slate-400">Sektor / Bidang</label>
                        <input className="input-field h-14 bg-slate-50 border-none font-bold rounded-2xl" value={formData.bidang} onChange={(e) => setFormData({...formData, bidang: e.target.value})} required />
                     </div>
                     <div className="space-y-4">
                        <label className="form-label text-[11px] font-black uppercase tracking-widest text-slate-400">Nama Perusahaan</label>
                        <input className="input-field h-14 bg-slate-50 border-none font-bold rounded-2xl" value={formData.perusahaan} onChange={(e) => setFormData({...formData, perusahaan: e.target.value})} required />
                     </div>
                     <div className="space-y-4">
                        <label className="form-label text-[11px] font-black uppercase tracking-widest text-slate-400">Prefektur / Lokasi</label>
                        <input className="input-field h-14 bg-slate-50 border-none font-bold rounded-2xl" value={formData.lokasi} onChange={(e) => setFormData({...formData, lokasi: e.target.value})} required />
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                     <div className="space-y-4">
                        <label className="form-label text-[11px] font-black uppercase tracking-widest text-slate-400">Gaji</label>
                        <input className="input-field h-14 bg-slate-50 border-none font-bold rounded-2xl" value={formData.gaji} onChange={(e) => setFormData({...formData, gaji: e.target.value})} />
                     </div>
                     <div className="space-y-4">
                        <label className="form-label text-[11px] font-black uppercase tracking-widest text-slate-400">Usia Max</label>
                        <input className="input-field h-14 bg-slate-50 border-none font-bold rounded-2xl" value={formData.usiaMax} onChange={(e) => setFormData({...formData, usiaMax: e.target.value})} />
                     </div>
                     <div className="space-y-4">
                        <label className="form-label text-[11px] font-black uppercase tracking-widest text-slate-400">Kuota Orang</label>
                        <input className="input-field h-14 bg-slate-50 border-none font-bold rounded-2xl" value={formData.jumlahKandidat} onChange={(e) => setFormData({...formData, jumlahKandidat: e.target.value})} />
                     </div>
                  </div>
               </div>

               <div className="flex gap-4 justify-end pt-12 border-t border-slate-50">
                  <button type="button" onClick={closeModal} className="px-12 py-5 font-black text-slate-300 uppercase text-[10px] tracking-widest hover:text-slate-500 transition-colors">Batal</button>
                  <button type="submit" className="bg-slate-900 text-white px-20 py-5 rounded-[2rem] font-black shadow-2xl shadow-indigo-200 hover:bg-indigo-600 transition-all uppercase text-[10px] tracking-widest active:scale-95" disabled={submitting}>
                    {submitting ? "Processing..." : "Simpan Data Lowongan →"}
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL (Simplified for brevity) */}
      {showDetailModal && selectedJobDetail && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-2xl animate-fadeIn">
           <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-4xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="p-10 bg-indigo-600 text-white flex justify-between items-center">
                 <h2 className="text-3xl font-black uppercase tracking-tight">{selectedJobDetail.namaJob}</h2>
                 <button onClick={() => setShowDetailModal(false)} className="text-white/60 hover:text-white text-3xl font-light">&times;</button>
              </div>
              <div className="p-12 overflow-y-auto custom-scrollbar space-y-8">
                 <div className="grid grid-cols-2 gap-8">
                    <div className="p-6 bg-slate-50 rounded-3xl">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Perusahaan</p>
                       <p className="text-xl font-black text-slate-700">{selectedJobDetail.perusahaan}</p>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-3xl">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Sektor</p>
                       <p className="text-xl font-black text-indigo-600 uppercase">{selectedJobDetail.bidang}</p>
                    </div>
                 </div>
                 <div className="pt-10 border-t border-slate-100 flex justify-end">
                    <button onClick={() => setShowDetailModal(false)} className="px-12 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest">Tutup Detail</button>
                 </div>
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
