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
    return stats;
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
              <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Manajemen Job Center v5.0</h1>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">International Japan Employment Foundation</p>
           </div>
           <button onClick={() => setShowModal(true)} className="bg-slate-900 text-white px-10 py-5 rounded-[2rem] font-black shadow-2xl hover:bg-indigo-600 transition-all uppercase text-[10px] tracking-widest active:scale-95">
            + Tambah Lowongan Baru
          </button>
        </div>

        {/* Dashboard Dinamis */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-12">
           <div className="card p-6 bg-white border-2 border-white rounded-[2.5rem] shadow-sm">
              <p className="text-[9px] font-black text-slate-400 uppercase mb-4 tracking-widest">Trending</p>
              {Object.entries(dashboardStats.seksi).slice(0,5).map(([n, c]) => (<div key={n} onClick={()=>{setFilterType('namaJob');setFilterValue(n);}} className="flex justify-between text-[10px] font-bold cursor-pointer hover:text-indigo-600 mb-2"><span>{n}</span><span>{c}</span></div>))}
           </div>
           <div className="card p-6 bg-white border-2 border-white rounded-[2.5rem] shadow-sm">
              <p className="text-[9px] font-black text-slate-400 uppercase mb-4 tracking-widest">Sektor</p>
              {Object.entries(dashboardStats.bidang).slice(0,5).map(([b, c]) => (<div key={b} onClick={()=>{setFilterType('bidang');setFilterValue(b);}} className="flex justify-between text-[10px] font-bold cursor-pointer hover:text-indigo-600 mb-2"><span>{b}</span><span>{c}</span></div>))}
           </div>
           <div className="card p-6 bg-white border-2 border-white rounded-[2.5rem] shadow-sm">
              <p className="text-[9px] font-black text-slate-400 uppercase mb-4 tracking-widest">Perusahaan</p>
              {Object.entries(dashboardStats.perusahaan).slice(0,5).map(([p, c]) => (<div key={p} onClick={()=>{setFilterType('perusahaan');setFilterValue(p);}} className="flex justify-between text-[10px] font-bold cursor-pointer hover:text-indigo-600 mb-2"><span>{p}</span><span>{c}</span></div>))}
           </div>
           <div onClick={()=>{setFilterType('domisiliIndo');setFilterValue(true);}} className={`card p-8 rounded-[3rem] border-4 cursor-pointer text-center transition-all ${filterType==='domisiliIndo'?'bg-indigo-600 text-white border-indigo-200 shadow-xl scale-105':'bg-white border-white shadow-sm hover:border-indigo-100'}`}>
              <h3 className="text-4xl font-black">{dashboardStats.indo}</h3>
              <p className="text-[10px] font-black uppercase mt-2 tracking-widest opacity-60">Domisili ID</p>
           </div>
           <div onClick={()=>{setFilterType('domisiliJepang');setFilterValue(true);}} className={`card p-8 rounded-[3rem] border-4 cursor-pointer text-center transition-all ${filterType==='domisiliJepang'?'bg-rose-600 text-white border-rose-200 shadow-xl scale-105':'bg-white border-white shadow-sm hover:border-rose-100'}`}>
              <h3 className="text-4xl font-black">{dashboardStats.jepang}</h3>
              <p className="text-[10px] font-black uppercase mt-2 tracking-widest opacity-60">Domisili JP</p>
           </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8 items-center">
           <div className="flex-1 relative w-full">
              <input className="input-field pl-12 h-16 border-none shadow-xl bg-white rounded-3xl font-black text-lg" placeholder="Cari Lowongan..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              <svg className="w-6 h-6 absolute left-4 top-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
           </div>
           <div className="flex bg-white p-2 rounded-2xl shadow-lg border border-white shrink-0">
              <button onClick={() => setViewMode("table")} className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${viewMode==='table'?'bg-slate-900 text-white shadow-lg':'text-slate-400 hover:bg-slate-50'}`}>Table</button>
              <button onClick={() => setViewMode("card")} className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${viewMode==='card'?'bg-slate-900 text-white shadow-lg':'text-slate-400 hover:bg-slate-50'}`}>Cards</button>
           </div>
           {filterType && <button onClick={()=>{setFilterType('');setFilterValue('');}} className="bg-rose-50 text-rose-600 px-8 h-16 rounded-3xl font-black uppercase text-[10px] tracking-widest border border-rose-100">Reset ✕</button>}
        </div>

        {/* LIST JOBS */}
        {viewMode === "table" ? (
          <div className="card overflow-hidden !p-0 border-none shadow-2xl rounded-[3rem] bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
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
                    <tr key={j.id} className="hover:bg-indigo-50/20 transition-all cursor-pointer" onClick={() => { setSelectedJobDetail(j); setShowDetailModal(true); }}>
                      <td className="py-6 px-8"><span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${j.klasifikasiSkema === 'Urgency' ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-800 text-white'}`}>{j.klasifikasiSkema || "Standard"}</span></td>
                      <td className="py-6 px-8">
                         <div className="font-black text-slate-800 uppercase text-xs">{j.namaJob}</div>
                         <div className="text-[10px] text-slate-400 font-bold mt-1 uppercase">{j.kodeJob} • {j.bidang}</div>
                      </td>
                      <td className="py-6 px-8"><div className="font-bold text-slate-700 text-xs">{j.perusahaan}</div><div className="text-[10px] text-slate-400 uppercase mt-1">{j.lokasi}</div></td>
                      <td className="py-6 px-8 font-black text-emerald-600 text-xs">{j.gaji || "-"}</td>
                      <td className="py-6 px-8"><span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border-2 ${j.statusJob?.toUpperCase() === 'OPEN' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>{j.statusJob}</span></td>
                      <td className="py-6 px-8" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center gap-3">
                           <button onClick={() => { setSelectedJobDetail(j); setShowDetailModal(true); }} className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></button>
                           <button onClick={() => handleEdit(j)} className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                           <button onClick={() => handleDelete(j.id)} className="p-2.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
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
               <div key={j.id} className="bg-white p-8 rounded-[3rem] shadow-xl border-4 border-white hover:border-indigo-100 transition-all group flex flex-col h-full relative">
                  <div className="flex justify-between items-start mb-6">
                     <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase ${j.klasifikasiSkema==='Urgency'?'bg-rose-600 text-white animate-pulse':'bg-slate-900 text-white'}`}>{j.klasifikasiSkema||"Standard"}</span>
                     <div className="flex gap-2">
                        <button onClick={(e)=>{e.stopPropagation(); handleDelete(j.id)}} className="p-2 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-500 hover:text-white transition-all"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M6 18L18 6M6 6l12 12" /></svg></button>
                     </div>
                  </div>
                  <h3 className="font-black text-slate-800 uppercase text-sm mb-6 leading-tight flex-grow">{j.namaJob}</h3>
                  <div className="space-y-4 pt-6 border-t border-slate-50">
                     <div className="flex justify-between text-[10px] font-bold"><span className="text-slate-400">ID/JP:</span><span className="text-indigo-600">{j.kategori?.includes("NEW COMER") ? "Indonesia" : "Jepang"}</span></div>
                     <div className="flex justify-between text-[10px] font-bold"><span className="text-slate-400">PERUSAHAAN:</span><span className="text-slate-800 truncate ml-2 max-w-[150px]">{j.perusahaan}</span></div>
                     <div className="flex justify-between text-[11px] font-black"><span className="text-slate-400 uppercase">GAJI:</span><span className="text-emerald-600">{j.gaji}</span></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-8">
                     <button onClick={() => { setSelectedJobDetail(j); setShowDetailModal(true); }} className="py-3.5 bg-slate-50 text-slate-600 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all">View</button>
                     <button onClick={() => handleEdit(j)} className="py-3.5 bg-slate-900 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-indigo-600 transition-all">Edit</button>
                  </div>
               </div>
             ))}
          </div>
        )}
      </div>

      {/* FULL ENTRY MODAL (REVERTED TO FULL LIST) */}
      {showModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn font-sans">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl overflow-hidden max-h-[95vh] flex flex-col">
            <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{editingJob ? "UPDATE DATA LOWONGAN" : "ENTRY LOWONGAN BARU"}</h3>
              <button onClick={closeModal} className="text-slate-300 hover:text-slate-800 text-3xl font-light">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="overflow-y-auto p-10 custom-scrollbar space-y-12">
               {/* 1. INFORMASI DASAR */}
               <div className="p-8 border-2 border-slate-50 rounded-[2.5rem] space-y-8">
                  <h4 className="text-xs font-black text-indigo-500 uppercase tracking-[0.2em] border-b border-slate-100 pb-3">1. INFORMASI DASAR & LOKASI</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                     <div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Kode Lowongan</label><input className="input-field h-12 bg-slate-50 border-none font-black rounded-xl" value={formData.kodeJob} onChange={(e) => setFormData({...formData, kodeJob: e.target.value})} /></div>
                     <div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Status Lowongan</label><select className="input-field h-12 bg-slate-50 border-none font-black rounded-xl" value={formData.statusJob} onChange={(e) => setFormData({...formData, statusJob: e.target.value})}><option value="Open">Aktif (OPEN)</option><option value="Closed">Tutup (CLOSED)</option></select></div>
                     <div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Prefektur / Lokasi</label><input className="input-field h-12 bg-slate-50 border-none font-black rounded-xl" value={formData.lokasi} onChange={(e) => setFormData({...formData, lokasi: e.target.value})} required /></div>
                     <div className="md:col-span-3"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Nama Lowongan / Judul Job</label><input className="input-field h-14 bg-slate-50 border-none font-black rounded-xl text-lg uppercase px-6" value={formData.namaJob} onChange={(e) => setFormData({...formData, namaJob: e.target.value})} required /></div>
                     <div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Nama Perusahaan</label><input className="input-field h-12 bg-slate-50 border-none font-black rounded-xl" value={formData.perusahaan} onChange={(e) => setFormData({...formData, perusahaan: e.target.value})} /></div>
                     <div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Gaji (Bulan/Tahun)</label><input className="input-field h-12 bg-slate-50 border-none font-black rounded-xl text-emerald-600" value={formData.gaji} onChange={(e) => setFormData({...formData, gaji: e.target.value})} /></div>
                     <div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Partner Rujukan / TSK</label><input className="input-field h-12 bg-slate-50 border-none font-black rounded-xl" value={formData.kumiaiPartner} onChange={(e) => setFormData({...formData, kumiaiPartner: e.target.value})} /></div>
                  </div>
               </div>

               {/* 2. KLASIFIKASI (DOMISILI & SKEMA) */}
               <div className="p-8 border-2 border-slate-50 rounded-[2.5rem] space-y-8">
                  <h4 className="text-xs font-black text-purple-500 uppercase tracking-[0.2em] border-b border-slate-100 pb-3">2. KLASIFIKASI & PERSYARATAN KANDIDAT</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                     <div className="md:col-span-1"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Kategori Domisili</label><select className="input-field h-12 bg-slate-100 border-none font-black rounded-xl text-indigo-600" value={formData.kategori} onChange={(e) => setFormData({...formData, kategori: e.target.value})}><option value="SISWA NON IJEF : NEW COMER">DOMISILI INDONESIA</option><option value="SISWA MATCHING JOB : EX-MAGANG/EX-TRAINEE">DOMISILI JEPANG</option></select></div>
                     <div className="md:col-span-1"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Prioritas Skema</label><select className="input-field h-12 bg-slate-100 border-none font-black rounded-xl text-rose-600" value={formData.klasifikasiSkema} onChange={(e) => setFormData({...formData, klasifikasiSkema: e.target.value})}><option value="Urgency">URGENCY (URGENT)</option><option value="Standard">STANDARD (REGULAR)</option><option value="Routine">ROUTINE (MASSAL)</option></select></div>
                     <div className="md:col-span-1"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Kuota / Kebutuhan</label><input className="input-field h-12 bg-slate-50 border-none font-black rounded-xl text-indigo-600" value={formData.jumlahKandidat} onChange={(e) => setFormData({...formData, jumlahKandidat: e.target.value})} /></div>
                  </div>
                  <div className="md:col-span-3"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Kualifikasi & Syarat Khusus (JLPT, SSW, Usia, dll)</label><textarea className="input-field bg-slate-50 border-none font-medium p-6 rounded-2xl text-sm" rows="3" value={formData.syaratKhusus} onChange={(e) => setFormData({...formData, syaratKhusus: e.target.value})} placeholder="JLPT N4 / SSW Kaigo..." /></div>
               </div>

               {/* 3. BIAYA & FASILITAS */}
               <div className="p-8 border-2 border-slate-50 rounded-[2.5rem] space-y-8">
                  <h4 className="text-xs font-black text-emerald-500 uppercase tracking-[0.2em] border-b border-slate-100 pb-3">3. INFORMASI BIAYA & FASILITAS</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Biaya Job / Proses & Tanggungan</label><textarea className="input-field bg-slate-50 border-none font-medium p-6 rounded-2xl text-xs" rows="3" value={formData.biayaJob} onChange={(e) => setFormData({...formData, biayaJob: e.target.value})} /></div>
                     <div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Fasilitas Asrama & Benefit</label><textarea className="input-field bg-slate-50 border-none font-medium p-6 rounded-2xl text-xs" rows="3" value={formData.benefit} onChange={(e) => setFormData({...formData, benefit: e.target.value})} /></div>
                  </div>
               </div>

               <div className="p-8 border-2 border-slate-50 rounded-[2.5rem] space-y-8">
                  <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">4. DESKRIPSI PEKERJAAN & TUGAS HARIAN</h4>
                  <textarea className="input-field bg-slate-50 border-none font-medium p-6 rounded-2xl text-sm leading-relaxed" rows="5" value={formData.deskripsiPekerjaan} onChange={(e) => setFormData({...formData, deskripsiPekerjaan: e.target.value})} />
               </div>

               <div className="flex gap-4 justify-end pt-10 border-t border-slate-50">
                  <button type="button" onClick={closeModal} className="px-10 py-4 font-black text-slate-300 uppercase text-[10px] tracking-widest hover:text-slate-500">Batal</button>
                  <button type="submit" className="bg-slate-900 text-white px-16 py-4 rounded-2xl font-black shadow-2xl hover:bg-indigo-600 transition-all uppercase text-[10px] tracking-widest" disabled={submitting}>
                    {submitting ? "SIMPAN..." : "SIMPAN DATA LOWONGAN"}
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL VIEW MODAL */}
      {showDetailModal && selectedJobDetail && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/95 backdrop-blur-xl animate-fadeIn font-sans">
           <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-4xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="p-10 bg-indigo-600 text-white flex justify-between items-center">
                 <h2 className="text-4xl font-black uppercase tracking-tighter leading-none">{selectedJobDetail.namaJob}</h2>
                 <button onClick={() => setShowDetailModal(false)} className="text-white/40 hover:text-white text-3xl transition-colors">&times;</button>
              </div>
              <div className="p-12 overflow-y-auto custom-scrollbar space-y-12">
                 <div className="grid grid-cols-2 gap-8">
                    <div className="p-8 bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 shadow-inner">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Penempatan / Prefektur</p>
                       <p className="text-2xl font-black text-slate-800">{selectedJobDetail.lokasi}</p>
                    </div>
                    <div className="p-8 bg-emerald-50 rounded-[2.5rem] border-2 border-emerald-100 shadow-inner">
                       <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">Estimasi Gaji</p>
                       <p className="text-3xl font-black text-emerald-600 tracking-tighter">{selectedJobDetail.gaji || "N/A"}</p>
                    </div>
                 </div>
                 <div className="space-y-6">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3 flex items-center gap-4"><div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>Deskripsi & Tugas Harian</h4>
                    <p className="text-slate-600 text-base leading-relaxed whitespace-pre-line font-medium italic bg-indigo-50/20 p-8 rounded-[3rem] border border-indigo-50">{selectedJobDetail.deskripsiPekerjaan || "Belum ada uraian tugas."}</p>
                 </div>
                 <div className="flex justify-end pt-10 border-t border-slate-100">
                    <button onClick={() => setShowDetailModal(false)} className="px-14 py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-[10px] tracking-widest active:scale-95 shadow-2xl">Tutup Detail</button>
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
