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
  const [viewMode, setViewMode] = useState("table");

  // Dashboard Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");
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
    klasifikasiKandidat: "SISWA NON IJEF : NEW COMER",
    deskripsiPekerjaan: "",
    statusJob: "Open",
    domisiliKerja: "",
    fileUrl: "",
    biayaJob: "",
    skemaPembayaran: "",
    benefitBiaya: "",
    sumberJob: "",
    usiaMax: "",
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
      router.push("/"); return;
    }
    if (user && userData?.role === "admin") loadJobs();
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
    const stats = { seksi: {}, perusahaan: {}, bidang: {}, indo: 0, jepang: 0 };
    jobs.forEach(j => {
      const b = j.bidang || "Umum"; stats.bidang[b] = (stats.bidang[b] || 0) + 1;
      const p = j.perusahaan || "---"; stats.perusahaan[p] = (stats.perusahaan[p] || 0) + 1;
      const n = j.namaJob || "Job"; stats.seksi[n] = (stats.seksi[n] || 0) + 1;
      if (j.kategori?.includes("NEW COMER")) stats.indo++;
      else stats.jepang++;
    });
    return {
      bidang: Object.entries(stats.bidang).sort((a,b) => b[1]-a[1]).slice(0, 5),
      perusahaan: Object.entries(stats.perusahaan).sort((a,b) => b[1]-a[1]).slice(0, 5),
      seksi: Object.entries(stats.seksi).sort((a,b) => b[1]-a[1]).slice(0, 5),
      indo: stats.indo, jepang: stats.jepang
    };
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    return jobs.filter(j => {
      const matchSearch = !searchTerm ||
        j.namaJob?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        j.kodeJob?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        j.perusahaan?.toLowerCase().includes(searchTerm.toLowerCase());
      let matchDash = true;
      if (filterType === "bidang") matchDash = j.bidang === filterValue;
      if (filterType === "perusahaan") matchDash = j.perusahaan === filterValue;
      if (filterType === "namaJob") matchDash = j.namaJob === filterValue;
      if (filterType === "domisiliIndo") matchDash = j.kategori?.includes("NEW COMER");
      if (filterType === "domisiliJepang") matchDash = !j.kategori?.includes("NEW COMER");
      return matchSearch && matchDash;
    });
  }, [jobs, searchTerm, filterType, filterValue]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUploading(true);
    const storageRef = ref(storage, `jobs/attachments/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);
    uploadTask.on("state_changed",
      (snap) => setUploadProgress(Math.round((snap.bytesTransferred/snap.totalBytes)*100)),
      (err) => { setUploading(false); alert(err.message); },
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        setFormData(prev => ({ ...prev, fileUrl: url })); setUploading(false);
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true);
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
      klasifikasiSkema: "Standard", gaji: "", keterangan: "", benefit: "", klasifikasiKandidat: "SISWA NON IJEF : NEW COMER",
      deskripsiPekerjaan: "", statusJob: "Open", domisiliKerja: "", fileUrl: "", biayaJob: "",
      skemaPembayaran: "", benefitBiaya: "", sumberJob: "", usiaMax: "", jumlahKandidat: "",
      kumiaiPartner: "", syaratKhusus: "",
    });
  };

  const handleEdit = (job) => {
    setEditingJob(job); setFormData({ ...formData, ...job }); setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Hapus lowongan ini secara permanen?")) return;
    try { await deleteDoc(doc(db, "jobs", id)); loadJobs(); } catch (err) { alert(err.message); }
  };

  if (authLoading || loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <>
      <Navbar />
      <div className="max-w-full mx-auto px-6 py-8 bg-[#F8F9FC] min-h-screen font-sans">
        <div className="flex justify-between items-center mb-10">
           <div className="space-y-1">
              <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Manajemen Job Center v5.0</h1>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">International Japan Employment Foundation</p>
           </div>
           <button onClick={() => setShowModal(true)} className="bg-slate-900 text-white px-10 py-5 rounded-[2rem] font-black shadow-2xl hover:bg-indigo-600 transition-all uppercase text-[10px] tracking-widest active:scale-95">
            + Tambah Lowongan Baru
          </button>
        </div>

        {/* Dashboard Klasifikasi Dinamis */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-12">
           <div className="card p-6 bg-white border-2 border-white rounded-[2.5rem] shadow-sm">
              <p className="text-[9px] font-black text-slate-400 uppercase mb-4 tracking-widest">Lowongan</p>
              {dashboardStats.seksi.map(([n, c]) => (<div key={n} onClick={()=>{setFilterType('namaJob');setFilterValue(n);}} className={`flex justify-between text-[10px] font-black cursor-pointer mb-2 transition-colors ${filterValue===n?'text-indigo-600':'text-slate-600 hover:text-indigo-600'}`}><span>{n}</span><span>{c}</span></div>))}
           </div>
           <div className="card p-6 bg-white border-2 border-white rounded-[2.5rem] shadow-sm">
              <p className="text-[9px] font-black text-slate-400 uppercase mb-4 tracking-widest">Perusahaan</p>
              {dashboardStats.perusahaan.map(([p, c]) => (<div key={p} onClick={()=>{setFilterType('perusahaan');setFilterValue(p);}} className={`flex justify-between text-[10px] font-black cursor-pointer mb-2 transition-colors ${filterValue===p?'text-indigo-600':'text-slate-600 hover:text-indigo-600'}`}><span>{p}</span><span>{c}</span></div>))}
           </div>
           <div className="card p-6 bg-white border-2 border-white rounded-[2.5rem] shadow-sm">
              <p className="text-[9px] font-black text-slate-400 uppercase mb-4 tracking-widest">Sektor</p>
              {dashboardStats.bidang.map(([b, c]) => (<div key={b} onClick={()=>{setFilterType('bidang');setFilterValue(b);}} className={`flex justify-between text-[10px] font-black cursor-pointer mb-2 transition-colors ${filterValue===b?'text-indigo-600':'text-slate-600 hover:text-indigo-600'}`}><span>{b}</span><span>{c}</span></div>))}
           </div>
           <div onClick={()=>{setFilterType('domisiliIndo');setFilterValue(true);}} className={`card p-8 rounded-[3rem] border-4 cursor-pointer text-center transition-all flex flex-col justify-center ${filterType==='domisiliIndo'?'bg-indigo-600 text-white border-indigo-200 shadow-xl scale-105':'bg-white border-white shadow-sm hover:border-indigo-100'}`}>
              <h3 className="text-5xl font-black">{dashboardStats.indo}</h3>
              <p className="text-[10px] font-black uppercase mt-2 tracking-widest opacity-60">DOMISILI INDONESIA (ID)</p>
           </div>
           <div onClick={()=>{setFilterType('domisiliJepang');setFilterValue(true);}} className={`card p-8 rounded-[3rem] border-4 cursor-pointer text-center transition-all flex flex-col justify-center ${filterType==='domisiliJepang'?'bg-rose-600 text-white border-rose-200 shadow-xl scale-105':'bg-white border-white shadow-sm hover:border-rose-100'}`}>
              <h3 className="text-5xl font-black">{dashboardStats.jepang}</h3>
              <p className="text-[10px] font-black uppercase mt-2 tracking-widest opacity-60">DOMISILI JEPANG (JP)</p>
           </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-8 items-center">
           <div className="flex-1 relative w-full">
              <input className="input-field pl-12 h-16 border-none shadow-xl bg-white rounded-3xl font-black text-lg text-slate-900" placeholder="Cari Lowongan..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              <svg className="w-6 h-6 absolute left-4 top-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
           </div>
           <div className="flex bg-white p-2 rounded-2xl shadow-xl border border-white shrink-0">
              <button onClick={() => setViewMode("table")} className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${viewMode==='table'?'bg-slate-900 text-white shadow-lg':'text-slate-400 hover:bg-slate-50'}`}>Table List</button>
              <button onClick={() => setViewMode("card")} className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${viewMode==='card'?'bg-slate-900 text-white shadow-lg':'text-slate-400 hover:bg-slate-50'}`}>Card Grid</button>
           </div>
           {filterType && <button onClick={()=>{setFilterType('');setFilterValue('');}} className="bg-rose-50 text-rose-600 px-8 h-16 rounded-3xl font-black uppercase text-[10px] tracking-widest border border-rose-100">✕ Reset Filter</button>}
        </div>

        {/* LIST JOBS VIEW */}
        {viewMode === "table" ? (
          <div className="card overflow-hidden !p-0 border-none shadow-2xl rounded-[3rem] bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white uppercase font-black text-[10px] tracking-widest">
                    <th className="py-7 px-8">Skema</th>
                    <th className="py-7 px-8">Lowongan</th>
                    <th className="py-7 px-8">Perusahaan / Lokasi</th>
                    <th className="py-7 px-8">Gaji</th>
                    <th className="py-7 px-8">Status</th>
                    <th className="py-7 px-8 text-center">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredJobs.map((j) => (
                    <tr key={j.id} className="hover:bg-indigo-50/20 transition-all cursor-pointer group">
                      <td className="py-6 px-8"><span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${j.klasifikasiSkema === 'Urgency' ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-800 text-white'}`}>{j.klasifikasiSkema || "Standard"}</span></td>
                      <td className="py-6 px-8">
                         <div className="font-black text-slate-900 uppercase text-xs">{j.namaJob}</div>
                         <div className="text-[10px] text-slate-400 font-black mt-1 uppercase">{j.kodeJob} • {j.bidang}</div>
                      </td>
                      <td className="py-6 px-8"><div className="font-black text-slate-700 text-xs">{j.perusahaan}</div><div className="text-[10px] text-slate-400 font-black uppercase mt-1">{j.lokasi}</div></td>
                      <td className="py-6 px-8 font-black text-emerald-600 text-xs">{j.gaji || "-"}</td>
                      <td className="py-6 px-8"><span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border-2 ${j.statusJob?.toUpperCase() === 'OPEN' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>{j.statusJob}</span></td>
                      <td className="py-6 px-8">
                        <div className="flex justify-center gap-3">
                           <button onClick={() => { setSelectedJobDetail(j); setShowDetailModal(true); }} className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></button>
                           <button onClick={() => handleEdit(j)} className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                           <button onClick={() => handleDelete(j.id)} className="p-2.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
             {filteredJobs.map((j) => (
               <div key={j.id} className="bg-white p-10 rounded-[3.5rem] shadow-xl border-4 border-white hover:border-indigo-100 transition-all flex flex-col h-full relative group">
                  <div className="flex justify-between items-start mb-8">
                     <span className={`px-4 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest ${j.klasifikasiSkema==='Urgency'?'bg-rose-600 text-white animate-pulse':'bg-slate-900 text-white'}`}>{j.klasifikasiSkema||"Standard"}</span>
                     <button onClick={() => handleDelete(j.id)} className="p-2.5 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M6 18L18 6M6 6l12 12" /></svg></button>
                  </div>
                  <h3 className="font-black text-slate-900 uppercase text-lg mb-6 leading-tight flex-grow">{j.namaJob}</h3>
                  <div className="space-y-4 pt-8 border-t border-slate-50">
                     <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase"><span>Perusahaan:</span><span className="text-slate-800 ml-2 truncate max-w-[150px]">{j.perusahaan}</span></div>
                     <div className="flex justify-between text-[11px] font-black text-emerald-600 uppercase"><span>Gaji:</span><span>{j.gaji}</span></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-10">
                     <button onClick={() => { setSelectedJobDetail(j); setShowDetailModal(true); }} className="py-4 bg-slate-50 text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all active:scale-95 shadow-sm">View</button>
                     <button onClick={() => handleEdit(j)} className="py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all active:scale-95 shadow-xl">Edit</button>
                  </div>
               </div>
             ))}
          </div>
        )}
      </div>

      {/* FULL ENTRY MODAL (REVERTED & COMPLETED) */}
      {showModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn font-sans">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl overflow-hidden max-h-[95vh] flex flex-col">
            <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{editingJob ? "UPDATE DATA LOWONGAN" : "ENTRY LOWONGAN BARU"}</h3>
              <button onClick={closeModal} className="text-slate-300 hover:text-slate-800 text-3xl font-light">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="overflow-y-auto p-10 custom-scrollbar space-y-12">
               {/* SEKIS 1: INFORMASI DASAR */}
               <div className="p-8 border-2 border-slate-50 rounded-[2.5rem] space-y-8">
                  <h4 className="text-xs font-black text-indigo-500 uppercase tracking-[0.2em] border-b border-slate-100 pb-3 flex items-center gap-2">1. INFORMASI DASAR & LOKASI</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                     <div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Kode Lowongan</label><input className="input-field h-12 bg-slate-50 border-none font-black rounded-xl" value={formData.kodeJob} onChange={(e) => setFormData({...formData, kodeJob: e.target.value})} placeholder="IJEF-XXXX" /></div>
                     <div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Status Lowongan</label><select className="input-field h-12 bg-slate-50 border-none font-black rounded-xl" value={formData.statusJob} onChange={(e) => setFormData({...formData, statusJob: e.target.value})}><option value="Open">Aktif (OPEN)</option><option value="Closed">Tutup (CLOSED)</option></select></div>
                     <div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Prefektur / Lokasi</label><input className="input-field h-12 bg-slate-50 border-none font-black rounded-xl" value={formData.lokasi} onChange={(e) => setFormData({...formData, lokasi: e.target.value})} required placeholder="Tokyo, Chiba, dll" /></div>
                     <div className="md:col-span-3"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Nama Lowongan / Judul Job</label><input className="input-field h-14 bg-slate-50 border-none font-black rounded-xl text-lg uppercase px-6" value={formData.namaJob} onChange={(e) => setFormData({...formData, namaJob: e.target.value})} required /></div>
                     <div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Nama Perusahaan</label><input className="input-field h-12 bg-slate-50 border-none font-black rounded-xl" value={formData.perusahaan} onChange={(e) => setFormData({...formData, perusahaan: e.target.value})} /></div>
                     <div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Gaji (Bulan/Tahun)</label><input className="input-field h-12 bg-slate-50 border-none font-black rounded-xl text-emerald-600" value={formData.gaji} onChange={(e) => setFormData({...formData, gaji: e.target.value})} /></div>
                     <div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Partner Rujukan / TSK</label><input className="input-field h-12 bg-slate-50 border-none font-black rounded-xl" value={formData.kumiaiPartner} onChange={(e) => setFormData({...formData, kumiaiPartner: e.target.value})} /></div>
                  </div>
               </div>

               {/* SEKIS 2: KLASIFIKASI (DOMISILI & SKEMA) */}
               <div className="p-8 border-2 border-slate-50 rounded-[2.5rem] space-y-8">
                  <h4 className="text-xs font-black text-purple-500 uppercase tracking-[0.2em] border-b border-slate-100 pb-3 flex items-center gap-2">2. KLASIFIKASI & PRIORITAS</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                     <div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Kategori Domisili</label><select className="input-field h-12 bg-slate-100 border-none font-black rounded-xl text-indigo-600" value={formData.kategori} onChange={(e) => setFormData({...formData, kategori: e.target.value})}><option value="SISWA NON IJEF : NEW COMER">DOMISILI INDONESIA</option><option value="SISWA MATCHING JOB : EX-MAGANG/EX-TRAINEE">DOMISILI JEPANG</option></select></div>
                     <div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Prioritas Skema</label><select className="input-field h-12 bg-slate-100 border-none font-black rounded-xl text-rose-600" value={formData.klasifikasiSkema} onChange={(e) => setFormData({...formData, klasifikasiSkema: e.target.value})}><option value="Urgency">URGENCY (URGENT)</option><option value="Standard">STANDARD (REGULAR)</option><option value="Routine">ROUTINE (MASSAL)</option></select></div>
                     <div className="md:col-span-2"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Target Klasifikasi</label><select className="input-field h-12 bg-slate-50 border-none font-black rounded-xl" value={formData.klasifikasiKandidat} onChange={(e) => setFormData({...formData, klasifikasiKandidat: e.target.value})}><option value="SISWA NON IJEF : NEW COMER">SISWA NON IJEF (NEW COMER)</option><option value="SISWA MATCHING JOB : EX-MAGANG">SISWA MATCHING (EX-MAGANG)</option><option value="SISWA MATCHING JOB : ENGINEERING">SISWA MATCHING (ENGINEERING)</option></select></div>
                     <div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Kuota / Kebutuhan</label><input className="input-field h-12 bg-slate-50 border-none font-black rounded-xl text-indigo-600" value={formData.jumlahKandidat} onChange={(e) => setFormData({...formData, jumlahKandidat: e.target.value})} placeholder="4" /></div>
                  </div>
                  <div className="md:col-span-3"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Kualifikasi & Syarat Khusus (JLPT, SSW, dll)</label><textarea className="input-field bg-slate-50 border-none font-medium p-6 rounded-2xl text-sm" rows="3" value={formData.syaratKhusus} onChange={(e) => setFormData({...formData, syaratKhusus: e.target.value})} /></div>
               </div>

               {/* SEKIS 3: BIAYA */}
               <div className="p-8 border-2 border-slate-50 rounded-[2.5rem] space-y-8">
                  <h4 className="text-xs font-black text-emerald-500 uppercase tracking-[0.2em] border-b border-slate-100 pb-3 flex items-center gap-2">3. INFORMASI BIAYA & FASILITAS</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Biaya Job / Proses</label><textarea className="input-field bg-slate-50 border-none font-medium p-4 rounded-xl text-xs" rows="2" value={formData.biayaJob} onChange={(e) => setFormData({...formData, biayaJob: e.target.value})} /></div>
                     <div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Fasilitas Asrama & Benefit</label><textarea className="input-field bg-slate-50 border-none font-medium p-4 rounded-xl text-xs" rows="2" value={formData.benefit} onChange={(e) => setFormData({...formData, benefit: e.target.value})} /></div>
                  </div>
               </div>

               <div className="p-8 border-2 border-slate-50 rounded-[2.5rem] space-y-8">
                  <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">4. DESKRIPSI PEKERJAAN & TUGAS HARIAN</h4>
                  <textarea className="input-field bg-slate-50 border-none font-medium p-6 rounded-2xl text-sm leading-relaxed" rows="4" value={formData.deskripsiPekerjaan} onChange={(e) => setFormData({...formData, deskripsiPekerjaan: e.target.value})} />
               </div>

               <div className="p-8 border-2 border-slate-50 rounded-[2.5rem] space-y-8">
                  <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">5. KETERANGAN TAMBAHAN / SYARAT KHUSUS</h4>
                  <textarea className="input-field bg-slate-50 border-none font-medium p-6 rounded-2xl text-sm leading-relaxed" rows="4" value={formData.keterangan} onChange={(e) => setFormData({...formData, keterangan: e.target.value})} />
               </div>

               <div className="flex gap-4 justify-end pt-10 border-t border-slate-50">
                  <button type="button" onClick={closeModal} className="px-10 py-4 font-black text-slate-300 uppercase text-[10px] tracking-widest hover:text-slate-500 transition-colors">Batal</button>
                  <button type="submit" className="bg-slate-900 text-white px-16 py-4 rounded-2xl font-black shadow-2xl hover:bg-indigo-600 transition-all uppercase text-[10px] tracking-widest active:scale-95" disabled={submitting}>
                    {submitting ? "SIMPAN..." : "SIMPAN DATA LOWONGAN"}
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL (EYE ICON) */}
      {showDetailModal && selectedJobDetail && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-slate-900/95 backdrop-blur-2xl animate-fadeIn font-sans">
           <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-4xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="p-12 bg-indigo-600 text-white flex justify-between items-center">
                 <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-60">Preview Lowongan</span>
                    <h2 className="text-4xl font-black uppercase tracking-tighter leading-none mt-2">{selectedJobDetail.namaJob}</h2>
                 </div>
                 <button onClick={() => setShowDetailModal(false)} className="text-white/40 hover:text-white text-4xl font-light transition-all">&times;</button>
              </div>
              <div className="p-12 overflow-y-auto custom-scrollbar space-y-12 bg-white">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="p-8 bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 shadow-inner">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Penempatan</p>
                       <p className="text-xl font-black text-slate-800 uppercase">{selectedJobDetail.lokasi}</p>
                    </div>
                    <div className="p-8 bg-emerald-50 rounded-[2.5rem] border-2 border-emerald-100 shadow-inner">
                       <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">Estimasi Gaji</p>
                       <p className="text-2xl font-black text-emerald-600 tracking-tighter italic">{selectedJobDetail.gaji || "N/A"}</p>
                    </div>
                    <div className="p-8 bg-purple-50 rounded-[2.5rem] border-2 border-purple-100 shadow-inner">
                       <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-2">Kuota Orang</p>
                       <p className="text-2xl font-black text-purple-600 uppercase">{selectedJobDetail.jumlahKandidat || "-"} ORANG</p>
                    </div>
                 </div>
                 <div className="space-y-6">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-4 flex items-center gap-4"><div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>Uraian Tugas Kerja</h4>
                    <p className="text-slate-600 text-lg leading-relaxed whitespace-pre-line font-medium italic bg-indigo-50/20 p-10 rounded-[3rem] border border-indigo-50">{selectedJobDetail.deskripsiPekerjaan || "Belum ada uraian tugas."}</p>
                 </div>
                 <div className="flex justify-end pt-10 border-t border-slate-100">
                    <button onClick={() => setShowDetailModal(false)} className="px-16 py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 shadow-2xl active:scale-95 transition-all">Tutup Pratinjau</button>
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
