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
  const [viewMode, setViewMode] = useState("table"); // "table" or "card"

  // Dashboard & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterValue, setFilterValue] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingJob, setEditingJob] = useState(null);

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
      const b = j.bidang || "Lainnya"; stats.bidang[b] = (stats.bidang[b] || 0) + 1;
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
      klasifikasiSkema: "Standard", gaji: "", keterangan: "", benefit: "", klasifikasiKandidat: "",
      deskripsiPekerjaan: "", statusJob: "Open", domisiliKerja: "", fileUrl: "", biayaJob: "",
      skemaPembayaran: "", benefitBiaya: "", sumberJob: "", usiaMax: "", jenisKelamin: "Pria & Wanita",
      jumlahKandidat: "", kumiaiPartner: "", syaratKhusus: "",
    });
  };

  if (authLoading || loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <>
      <Navbar />
      <div className="max-w-full mx-auto px-6 py-8 bg-[#F8F9FC] min-h-screen font-sans">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Manajemen Job Center v5.0</h1>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] mt-1">International Japan Employment Foundation</p>
          </div>
          <button onClick={() => setShowModal(true)} className="bg-slate-900 text-white px-10 py-5 rounded-[2rem] font-black shadow-2xl shadow-slate-200 hover:bg-indigo-600 transition-all uppercase text-[10px] tracking-widest active:scale-95">
            + Tambah Lowongan Baru
          </button>
        </div>

        {/* Dashboard Klasifikasi */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
           <div className="card p-5 bg-white border-2 border-white rounded-[2rem] shadow-sm">
              <p className="text-[9px] font-black text-slate-400 uppercase mb-3 tracking-widest">Top Lowongan</p>
              {dashboardStats.seksi.map(([n, c]) => (<div key={n} onClick={()=>{setFilterType('namaJob');setFilterValue(n);}} className="flex justify-between text-[10px] font-bold cursor-pointer hover:text-purple-600 mb-1.5 transition-colors"><span>{n}</span><span>{c}</span></div>))}
           </div>
           <div className="card p-5 bg-white border-2 border-white rounded-[2rem] shadow-sm">
              <p className="text-[9px] font-black text-slate-400 uppercase mb-3 tracking-widest">Perusahaan</p>
              {dashboardStats.perusahaan.map(([p, c]) => (<div key={p} onClick={()=>{setFilterType('perusahaan');setFilterValue(p);}} className="flex justify-between text-[10px] font-bold cursor-pointer hover:text-purple-600 mb-1.5 transition-colors"><span>{p}</span><span>{c}</span></div>))}
           </div>
           <div className="card p-5 bg-white border-2 border-white rounded-[2rem] shadow-sm">
              <p className="text-[9px] font-black text-slate-400 uppercase mb-3 tracking-widest">Sektor</p>
              {dashboardStats.bidang.map(([b, c]) => (<div key={b} onClick={()=>{setFilterType('bidang');setFilterValue(b);}} className="flex justify-between text-[10px] font-bold cursor-pointer hover:text-purple-600 mb-1.5 transition-colors"><span>{b}</span><span>{c}</span></div>))}
           </div>
           <div onClick={()=>{setFilterType('domisiliIndo');setFilterValue(true);}} className={`card p-6 rounded-[2.5rem] border-4 cursor-pointer text-center transition-all ${filterType==='domisiliIndo'?'bg-indigo-600 text-white border-indigo-200 shadow-xl scale-105':'bg-white border-white shadow-sm hover:border-indigo-100'}`}><h3 className="text-4xl font-black">{dashboardStats.indo}</h3><p className="text-[10px] font-black uppercase mt-1 tracking-widest opacity-60">Domisili Indonesia (ID)</p></div>
           <div onClick={()=>{setFilterType('domisiliJepang');setFilterValue(true);}} className={`card p-6 rounded-[2.5rem] border-4 cursor-pointer text-center transition-all ${filterType==='domisiliJepang'?'bg-rose-600 text-white border-rose-200 shadow-xl scale-105':'bg-white border-white shadow-sm hover:border-rose-100'}`}><h3 className="text-4xl font-black">{dashboardStats.jepang}</h3><p className="text-[10px] font-black uppercase mt-1 tracking-widest opacity-60">Domisili Jepang (JP)</p></div>
        </div>

        {/* Global Filter & View Toggle */}
        <div className="flex flex-col md:flex-row gap-4 mb-8 items-center">
           <div className="flex-1 relative w-full">
              <input className="input-field pl-12 h-16 border-none shadow-xl bg-white rounded-3xl font-black text-lg" placeholder="Cari Lowongan..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              <svg className="w-6 h-6 absolute left-4 top-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
           </div>
           <div className="flex bg-white p-1.5 rounded-2xl shadow-xl border border-white shrink-0">
              <button onClick={() => setViewMode("table")} className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${viewMode==='table'?'bg-slate-900 text-white shadow-lg':'text-slate-400 hover:bg-slate-50'}`}>Table View</button>
              <button onClick={() => setViewMode("card")} className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${viewMode==='card'?'bg-slate-900 text-white shadow-lg':'text-slate-400 hover:bg-slate-50'}`}>Card View</button>
           </div>
           {filterType && <button onClick={()=>{setFilterType('');setFilterValue('');}} className="bg-rose-50 text-rose-600 px-8 h-16 rounded-3xl font-black uppercase text-[10px] tracking-widest border border-rose-100 active:scale-95 transition-all">✕ Reset Filter</button>}
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
                    <th className="py-7 px-8">Sektor</th>
                    <th className="py-7 px-8">Gaji</th>
                    <th className="py-7 px-8">Status</th>
                    <th className="py-7 px-8 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredJobs.map((j) => (
                    <tr key={j.id} className="hover:bg-indigo-50/20 transition-all cursor-pointer">
                      <td className="py-6 px-8"><span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${j.klasifikasiSkema === 'Urgency' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-white'}`}>{j.klasifikasiSkema || "Standard"}</span></td>
                      <td className="py-6 px-8"><div className="font-black text-slate-800 uppercase text-xs">{j.namaJob}</div><div className="text-[10px] text-slate-400 font-bold mt-1">{j.kodeJob} • {j.kategori?.includes("NEW COMER") ? "ID" : "JP"}</div></td>
                      <td className="py-6 px-8"><div className="font-bold text-slate-700 text-xs">{j.perusahaan}</div><div className="text-[10px] text-slate-400 uppercase mt-0.5">{j.lokasi}</div></td>
                      <td className="py-6 px-8"><span className="text-[10px] font-black text-indigo-500 uppercase">{j.bidang}</span></td>
                      <td className="py-6 px-8 font-black text-emerald-600 text-xs">{j.gaji || "-"}</td>
                      <td className="py-6 px-8"><span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase border ${j.statusJob?.toUpperCase() === 'OPEN' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>{j.statusJob}</span></td>
                      <td className="py-6 px-8"><div className="flex justify-center gap-2"><button onClick={() => setEditingJob(j)||setFormData({...formData,...j})||setShowModal(true)} className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-900 hover:text-white transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
             {filteredJobs.map((j) => (
               <div key={j.id} className="bg-white p-8 rounded-[3rem] shadow-xl border-2 border-white hover:border-indigo-100 transition-all group flex flex-col h-full">
                  <div className="flex justify-between items-start mb-6">
                     <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase ${j.klasifikasiSkema==='Urgency'?'bg-rose-600 text-white':'bg-slate-900 text-white'}`}>{j.klasifikasiSkema||"Standard"}</span>
                     <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase border ${j.statusJob==='Open'?'text-emerald-500 border-emerald-100':'text-rose-500 border-rose-100'}`}>{j.statusJob}</span>
                  </div>
                  <h3 className="font-black text-slate-800 uppercase text-sm mb-4 leading-tight flex-grow">{j.namaJob}</h3>
                  <div className="space-y-4 pt-6 border-t border-slate-50">
                     <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-slate-400">PERUSAHAAN:</span>
                        <span className="text-slate-800">{j.perusahaan}</span>
                     </div>
                     <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-slate-400">LOKASI:</span>
                        <span className="text-slate-800">{j.lokasi}</span>
                     </div>
                     <div className="flex justify-between text-[11px] font-black">
                        <span className="text-slate-400 uppercase">GAJI:</span>
                        <span className="text-emerald-600">{j.gaji}</span>
                     </div>
                  </div>
                  <button onClick={() => setEditingJob(j)||setFormData({...formData,...j})||setShowModal(true)} className="mt-8 w-full py-4 bg-slate-50 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest group-hover:bg-slate-900 group-hover:text-white transition-all shadow-sm active:scale-95">Edit Lowongan</button>
               </div>
             ))}
          </div>
        )}
      </div>

      {/* FULL ENTRY MODAL (REVERTED TO FULL LIST) */}
      {showModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl overflow-hidden max-h-[95vh] flex flex-col">
            <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{editingJob ? "UPDATE DATA LOWONGAN" : "ENTRY LOWONGAN BARU"}</h3>
              <button onClick={closeModal} className="text-slate-300 hover:text-slate-800 text-3xl font-light">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="overflow-y-auto p-10 custom-scrollbar space-y-12">
               {/* SEKIS 1: DASAR */}
               <div className="p-8 border-2 border-slate-50 rounded-[2.5rem] space-y-8">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-3 flex items-center gap-2"><svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Informasi Dasar & Lokasi</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                     <div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Kode Lowongan</label><input className="input-field h-12 bg-slate-50 border-none font-black rounded-xl" value={formData.kodeJob} onChange={(e) => setFormData({...formData, kodeJob: e.target.value})} placeholder="IJEF..." /></div>
                     <div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Status Lowongan</label><select className="input-field h-12 bg-slate-50 border-none font-black rounded-xl" value={formData.statusJob} onChange={(e) => setFormData({...formData, statusJob: e.target.value})}><option value="Open">Aktif (OPEN)</option><option value="Closed">Tutup (CLOSED)</option></select></div>
                     <div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Prefektur / Lokasi</label><input className="input-field h-12 bg-slate-50 border-none font-black rounded-xl" value={formData.lokasi} onChange={(e) => setFormData({...formData, lokasi: e.target.value})} required /></div>
                     <div className="md:col-span-3"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Nama Lowongan / Judul Job</label><input className="input-field h-14 bg-slate-50 border-none font-black rounded-xl text-lg uppercase px-6" value={formData.namaJob} onChange={(e) => setFormData({...formData, namaJob: e.target.value})} required /></div>
                     <div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Nama Perusahaan</label><input className="input-field h-12 bg-slate-50 border-none font-black rounded-xl" value={formData.perusahaan} onChange={(e) => setFormData({...formData, perusahaan: e.target.value})} /></div>
                     <div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Gaji (Bulan/Tahun)</label><input className="input-field h-12 bg-slate-50 border-none font-black rounded-xl text-emerald-600" value={formData.gaji} onChange={(e) => setFormData({...formData, gaji: e.target.value})} /></div>
                     <div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Kumiai / TSK Partner Rujukan</label><input className="input-field h-12 bg-slate-50 border-none font-black rounded-xl" value={formData.kumiaiPartner} onChange={(e) => setFormData({...formData, kumiaiPartner: e.target.value})} /></div>
                  </div>
               </div>

               {/* SEKSI 2: KLASIFIKASI (with added Domisili and Skema) */}
               <div className="p-8 border-2 border-slate-50 rounded-[2.5rem] space-y-8">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-3 flex items-center gap-2"><svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg> Klasifikasi & Persyaratan Kandidat</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                     <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Kategori Domisili</label>
                        <select className="input-field h-12 bg-slate-100 border-none font-black rounded-xl" value={formData.kategori} onChange={(e) => setFormData({...formData, kategori: e.target.value})}>
                          <option value="SISWA NON IJEF : NEW COMER">DOMISILI INDONESIA (Daftar Dari Indonesia)</option>
                          <option value="SISWA MATCHING JOB : EX-MAGANG/EX-TRAINEE">DOMISILI JEPANG (Daftar Dari Jepang)</option>
                          <option value="SISWA MATCHING JOB : ENGINEERING/GIJINKOKU">DOMISILI JEPANG (Engineering)</option>
                        </select>
                     </div>
                     <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Prioritas Skema</label>
                        <select className="input-field h-12 bg-slate-100 border-none font-black rounded-xl text-indigo-600" value={formData.klasifikasiSkema} onChange={(e) => setFormData({...formData, klasifikasiSkema: e.target.value})}>
                          <option value="Urgency">URGENCY (URGENT)</option>
                          <option value="Standard">STANDARD (REGULAR)</option>
                          <option value="Routine">ROUTINE (MASSAL)</option>
                        </select>
                     </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Klasifikasi Target</label><select className="input-field h-12 bg-slate-50 border-none font-black rounded-xl" value={formData.klasifikasiKandidat} onChange={(e) => setFormData({...formData, klasifikasiKandidat: e.target.value})}><option value="SISWA NON IJEF : NEW COMER">New Comer</option><option value="SISWA MATCHING JOB : EX-MAGANG">Ex-Magang</option><option value="SISWA MATCHING JOB : ENGINEERING">Engineering</option></select></div>
                     <div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Kuota / Kebutuhan</label><input className="input-field h-12 bg-slate-50 border-none font-black rounded-xl text-indigo-600" value={formData.jumlahKandidat} onChange={(e) => setFormData({...formData, jumlahKandidat: e.target.value})} placeholder="4" /></div>
                  </div>
                  <div className="md:col-span-3"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Kualifikasi & Syarat Khusus (JLPT, SSW, Usia)</label><textarea className="input-field bg-slate-50 border-none font-medium p-4 rounded-xl text-xs" rows="3" value={formData.syaratKhusus} onChange={(e) => setFormData({...formData, syaratKhusus: e.target.value})} /></div>
               </div>

               {/* SEKSI 3: BIAYA */}
               <div className="p-8 border-2 border-slate-50 rounded-[2.5rem] space-y-8">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-3 flex items-center gap-2"><svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Informasi Biaya & Fasilitas</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Biaya Job / Proses</label><textarea className="input-field bg-slate-50 border-none font-medium p-4 rounded-xl text-xs" rows="2" value={formData.biayaJob} onChange={(e) => setFormData({...formData, biayaJob: e.target.value})} /></div>
                     <div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Fasilitas Asrama & Benefit</label><textarea className="input-field bg-slate-50 border-none font-medium p-4 rounded-xl text-xs" rows="2" value={formData.benefit} onChange={(e) => setFormData({...formData, benefit: e.target.value})} /></div>
                  </div>
               </div>

               <div className="p-8 border-2 border-slate-50 rounded-[2.5rem] space-y-8">
                  <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Deskripsi & Keterangan</h4>
                  <div className="space-y-6">
                     <div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Deskripsi Pekerjaan & Tugas Harian</label><textarea className="input-field bg-slate-50 border-none font-medium p-4 rounded-xl text-xs" rows="4" value={formData.deskripsiPekerjaan} onChange={(e) => setFormData({...formData, deskripsiPekerjaan: e.target.value})} /></div>
                     <div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Keterangan Tambahan / Syarat Lain</label><textarea className="input-field bg-slate-50 border-none font-medium p-4 rounded-xl text-xs" rows="3" value={formData.keterangan} onChange={(e) => setFormData({...formData, keterangan: e.target.value})} /></div>
                  </div>
               </div>

               <div className="flex gap-4 justify-end pt-10 border-t border-slate-50">
                  <button type="button" onClick={closeModal} className="px-10 py-4 font-black text-slate-300 uppercase text-[10px] tracking-widest hover:text-slate-500">Batal</button>
                  <button type="submit" className="bg-slate-900 text-white px-16 py-4 rounded-2xl font-black shadow-2xl shadow-slate-200 hover:bg-indigo-600 transition-all uppercase text-[10px] tracking-widest" disabled={submitting}>
                    {submitting ? "SIMPAN..." : "SIMPAN DATA LOWONGAN →"}
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
      `}</style>
    </>
  );
}
