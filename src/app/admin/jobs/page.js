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
    const stats = { seksi: {}, perusahaan: {}, bidang: {}, indo: 0, jepang: 0 };
    jobs.forEach(j => {
      const b = j.bidang || "Lainnya"; stats.bidang[b] = (stats.bidang[b] || 0) + 1;
      const p = j.perusahaan || "---"; stats.perusahaan[p] = (stats.perusahaan[p] || 0) + 1;
      const n = j.namaJob || "Job"; stats.seksi[n] = (stats.seksi[n] || 0) + 1;
      if (j.kategori?.includes("NEW COMER")) stats.indo++;
      else if (j.kategori?.includes("EX-MAGANG") || j.kategori?.includes("ENGINEERING")) stats.jepang++;
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

  if (authLoading || loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <>
      <Navbar />
      <div className="max-w-full mx-auto px-6 py-8 bg-[#F8F9FC] min-h-screen">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">MANAJEMEN JOB CENTER v4.0</h1>
            <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1 italic">International Japan Employment Foundation</p>
          </div>
          <button onClick={() => setShowModal(true)} className="bg-slate-900 text-white px-8 py-4 rounded-[1.5rem] font-black shadow-2xl shadow-slate-200 hover:bg-indigo-600 transition-all uppercase text-xs tracking-widest active:scale-95">
            + Tambah Lowongan Baru
          </button>
        </div>

        {/* Dashboard Klasifikasi */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
           <div className="card p-5 bg-white border-2 border-white rounded-[2rem] shadow-sm">
              <p className="text-[9px] font-black text-slate-400 uppercase mb-3 tracking-widest">Lowongan</p>
              {dashboardStats.seksi.map(([n, count]) => (
                <div key={n} onClick={() => {setFilterType("namaJob"); setFilterValue(n);}} className="flex justify-between text-[10px] font-bold cursor-pointer hover:text-indigo-600 mb-1.5"><span className="truncate mr-2">{n}</span><span>{count}</span></div>
              ))}
           </div>
           <div className="card p-5 bg-white border-2 border-white rounded-[2rem] shadow-sm">
              <p className="text-[9px] font-black text-slate-400 uppercase mb-3 tracking-widest">Perusahaan</p>
              {dashboardStats.perusahaan.map(([p, count]) => (
                <div key={p} onClick={() => {setFilterType("perusahaan"); setFilterValue(p);}} className="flex justify-between text-[10px] font-bold cursor-pointer hover:text-indigo-600 mb-1.5"><span className="truncate mr-2">{p}</span><span>{count}</span></div>
              ))}
           </div>
           <div className="card p-5 bg-white border-2 border-white rounded-[2rem] shadow-sm">
              <p className="text-[9px] font-black text-slate-400 uppercase mb-3 tracking-widest">Sektor</p>
              {dashboardStats.bidang.map(([b, count]) => (
                <div key={b} onClick={() => {setFilterType("bidang"); setFilterValue(b);}} className="flex justify-between text-[10px] font-bold cursor-pointer hover:text-indigo-600 mb-1.5"><span className="truncate mr-2">{b}</span><span>{count}</span></div>
              ))}
           </div>
           <div onClick={() => {setFilterType("domisiliIndo"); setFilterValue(true);}} className={`card p-6 rounded-[2.5rem] border-4 cursor-pointer text-center transition-all ${filterType === 'domisiliIndo' ? 'bg-indigo-600 border-indigo-200 text-white' : 'bg-white border-white'}`}>
              <h3 className="text-3xl font-black">{dashboardStats.indo}</h3>
              <p className="text-[9px] font-black uppercase mt-1">Domisili Indonesia (ID)</p>
           </div>
           <div onClick={() => {setFilterType("domisiliJepang"); setFilterValue(true);}} className={`card p-6 rounded-[2.5rem] border-4 cursor-pointer text-center transition-all ${filterType === 'domisiliJepang' ? 'bg-rose-600 border-rose-200 text-white' : 'bg-white border-white'}`}>
              <h3 className="text-3xl font-black">{dashboardStats.jepang}</h3>
              <p className="text-[9px] font-black uppercase mt-1">Domisili Jepang (JP)</p>
           </div>
        </div>

        {/* Global Filter Bar */}
        <div className="flex gap-4 mb-6">
           <div className="flex-1 relative">
              <input className="input-field pl-12 h-14 border-none shadow-sm bg-white rounded-2xl" placeholder="Cari lowongan, kode, atau perusahaan..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              <svg className="w-5 h-5 absolute left-4 top-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
           </div>
           {filterType && <button onClick={() => {setFilterType(""); setFilterValue("");}} className="bg-rose-50 text-rose-600 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest border border-rose-100">✕ Reset Filter</button>}
        </div>

        <div className="card overflow-hidden !p-0 border-none shadow-xl rounded-[2.5rem] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white uppercase font-black text-[10px] tracking-widest">
                  <th className="py-6 px-6">Skema</th>
                  <th className="py-6 px-6">Data Lowongan</th>
                  <th className="py-6 px-6">Perusahaan / Lokasi</th>
                  <th className="py-6 px-6">Sektor</th>
                  <th className="py-6 px-6">Gaji</th>
                  <th className="py-6 px-6">Status</th>
                  <th className="py-6 px-6 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredJobs.map((j) => (
                  <tr key={j.id} className="hover:bg-indigo-50/20 transition-all cursor-pointer group" onClick={() => { setSelectedJobDetail(j); setShowDetailModal(true); }}>
                    <td className="py-5 px-6">
                       <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${
                         j.klasifikasiSkema === 'Urgency' ? 'bg-rose-600 text-white' :
                         j.klasifikasiSkema === 'Standard' ? 'bg-indigo-600 text-white' : 'bg-emerald-500 text-white'
                       }`}>
                          {j.klasifikasiSkema || "Standard"}
                       </span>
                    </td>
                    <td className="py-5 px-6">
                      <div className="font-black text-slate-800 uppercase text-xs leading-tight">{j.namaJob}</div>
                      <div className="text-[9px] text-slate-400 font-bold mt-1 uppercase">{j.kodeJob} • {j.kategori?.includes("NEW COMER") ? "ID" : "JP"}</div>
                    </td>
                    <td className="py-5 px-6">
                      <div className="font-bold text-slate-700 text-xs">{j.perusahaan}</div>
                      <div className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">{j.lokasi}</div>
                    </td>
                    <td className="py-5 px-6">
                      <span className="text-[10px] font-black text-slate-500 uppercase">{j.bidang}</span>
                    </td>
                    <td className="py-5 px-6 font-black text-emerald-600 text-xs">{j.gaji || "-"}</td>
                    <td className="py-5 px-6">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${j.statusJob?.toUpperCase() === 'OPEN' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                        {j.statusJob}
                      </span>
                    </td>
                    <td className="py-5 px-6" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-center gap-2">
                        <button onClick={() => handleEdit(j)} className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-900 hover:text-white transition-all shadow-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button onClick={() => {if(window.confirm('Hapus?')) deleteDoc(doc(db,'jobs',j.id)).then(()=>loadJobs())}} className="p-2.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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

      {/* FULL ENTRY MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl overflow-hidden max-h-[95vh] flex flex-col">
            <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{editingJob ? "UPDATE DATA LOWONGAN" : "ENTRY LOWONGAN BARU"}</h3>
              <button onClick={closeModal} className="text-slate-300 hover:text-slate-800 text-3xl font-light">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="overflow-y-auto p-10 custom-scrollbar space-y-10">
               {/* SEKIS 1: DASAR */}
               <div className="p-8 border-2 border-slate-50 rounded-[2.5rem] space-y-8">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-3">1. Klasifikasi & Prioritas</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Kategori Lowongan</label>
                        <select className="input-field h-12 bg-slate-100 border-none font-bold rounded-xl" value={formData.kategori} onChange={(e) => setFormData({...formData, kategori: e.target.value})}>
                          <option value="SISWA NON IJEF : NEW COMER">DOMISILI INDONESIA (Siswa Daftar Dari Indonesia)</option>
                          <option value="SISWA MATCHING JOB : EX-MAGANG/EX-TRAINEE">DOMISILI JEPANG (Siswa Daftar Dari Jepang)</option>
                          <option value="SISWA MATCHING JOB : ENGINEERING/GIJINKOKU">DOMISILI JEPANG (Engineering)</option>
                        </select>
                     </div>
                     <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Prioritas Skema</label>
                        <select className="input-field h-12 bg-slate-100 border-none font-bold rounded-xl" value={formData.klasifikasiSkema} onChange={(e) => setFormData({...formData, klasifikasiSkema: e.target.value})}>
                          <option value="Urgency">URGENCY (URGENT)</option>
                          <option value="Standard">STANDARD (REGULAR)</option>
                          <option value="Routine">ROUTINE (MASSAL)</option>
                        </select>
                     </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                     <div className="md:col-span-2 space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Judul Lowongan</label>
                        <input className="input-field h-12 bg-slate-50 border-none font-bold uppercase rounded-xl" value={formData.namaJob} onChange={(e) => setFormData({...formData, namaJob: e.target.value})} required />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Kode Job (Optional)</label>
                        <input className="input-field h-12 bg-slate-50 border-none font-bold rounded-xl" value={formData.kodeJob} onChange={(e) => setFormData({...formData, kodeJob: e.target.value})} />
                     </div>
                  </div>
               </div>

               {/* SEKSI 2: DETAIL KERJA */}
               <div className="p-8 border-2 border-slate-50 rounded-[2.5rem] space-y-8">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-3">2. Detail Penempatan & Kriteria</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                     <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Perusahaan</label><input className="input-field h-12 bg-slate-50 border-none font-bold rounded-xl" value={formData.perusahaan} onChange={(e) => setFormData({...formData, perusahaan: e.target.value})} /></div>
                     <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Sektor / Bidang</label><input className="input-field h-12 bg-slate-50 border-none font-bold rounded-xl" value={formData.bidang} onChange={(e) => setFormData({...formData, bidang: e.target.value})} /></div>
                     <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Prefektur / Lokasi</label><input className="input-field h-12 bg-slate-50 border-none font-bold rounded-xl" value={formData.lokasi} onChange={(e) => setFormData({...formData, lokasi: e.target.value})} /></div>
                     <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Gaji</label><input className="input-field h-12 bg-slate-50 border-none font-bold rounded-xl text-emerald-600" value={formData.gaji} onChange={(e) => setFormData({...formData, gaji: e.target.value})} /></div>
                     <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Usia Max</label><input className="input-field h-12 bg-slate-50 border-none font-bold rounded-xl" value={formData.usiaMax} onChange={(e) => setFormData({...formData, usiaMax: e.target.value})} /></div>
                     <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Jenis Kelamin</label>
                        <select className="input-field h-12 bg-slate-50 border-none font-bold rounded-xl" value={formData.jenisKelamin} onChange={(e) => setFormData({...formData, jenisKelamin: e.target.value})}>
                           <option value="Pria & Wanita">Pria & Wanita</option><option value="LAKI-LAKI">Pria Saja</option><option value="PEREMPUAN">Wanita Saja</option>
                        </select>
                     </div>
                  </div>
               </div>

               <div className="flex gap-4 justify-end pt-10 border-t border-slate-50">
                  <button type="button" onClick={closeModal} className="px-10 py-4 font-black text-slate-300 uppercase text-[10px] tracking-widest hover:text-slate-500">Batal</button>
                  <button type="submit" className="bg-slate-900 text-white px-16 py-4 rounded-2xl font-black shadow-2xl shadow-slate-200 hover:bg-indigo-600 transition-all uppercase text-[10px] tracking-widest" disabled={submitting}>
                    {submitting ? "SIMPAN..." : "SIMPAN DATA LOWONGAN"}
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
