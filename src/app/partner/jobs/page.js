"use client";
import { useState, useEffect, useRef, useMemo } from "react";
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

  // Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterValue, setFilterValue] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

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

  useEffect(() => {
    if (!authLoading && (!user || !["partner", "admin"].includes(userData?.role))) {
      router.push("/"); return;
    }
    if (user && ["partner", "admin"].includes(userData?.role)) loadJobs();
  }, [user, userData, authLoading]);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "jobs"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setJobs(data.filter(j => j.statusJob === "Open" || j.statusJob === "OPEN" || j.createdBy === user.uid));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const dashboardStats = useMemo(() => {
    const stats = { sektor: {}, perusahaan: {}, namaJob: {}, indo: 0, jepang: 0 };
    jobs.forEach(j => {
      const b = j.bidang || "Umum"; stats.sektor[b] = (stats.sektor[b] || 0) + 1;
      const p = j.perusahaan || "---"; stats.perusahaan[p] = (stats.perusahaan[p] || 0) + 1;
      const n = j.namaJob || "Job"; stats.namaJob[n] = (stats.namaJob[n] || 0) + 1;
      if (j.kategori?.includes("NEW COMER")) stats.indo++;
      else stats.jepang++;
    });
    return {
      sektor: Object.entries(stats.sektor).sort((a,b) => b[1]-a[1]).slice(0, 4),
      perusahaan: Object.entries(stats.perusahaan).sort((a,b) => b[1]-a[1]).slice(0, 4),
      namaJob: Object.entries(stats.namaJob).sort((a,b) => b[1]-a[1]).slice(0, 4),
      indo: stats.indo, jepang: stats.jepang
    };
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    return jobs.filter(j => {
      const matchSearch = !searchTerm || j.namaJob?.toLowerCase().includes(searchTerm.toLowerCase()) || j.kodeJob?.toLowerCase().includes(searchTerm.toLowerCase());
      let matchDashboard = true;
      if (filterType === "bidang") matchDashboard = j.bidang === filterValue;
      if (filterType === "perusahaan") matchDashboard = j.perusahaan === filterValue;
      if (filterType === "namaJob") matchDashboard = j.namaJob === filterValue;
      if (filterType === "domisiliIndo") matchDashboard = j.kategori?.includes("NEW COMER");
      if (filterType === "domisiliJepang") matchDashboard = !j.kategori?.includes("NEW COMER");
      return matchSearch && matchDashboard;
    });
  }, [jobs, searchTerm, filterType, filterValue]);

  const handleSubmitJob = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await addDoc(collection(db, "jobs"), {
        ...formData,
        createdBy: user.uid,
        partnerName: userData.fullName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setShowModal(false); loadJobs();
      alert("Lowongan berhasil diajukan!");
    } catch (err) { alert(err.message); }
    setSaving(false);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData({
      kodeJob: "", namaJob: "", perusahaan: "", lokasi: "", bidang: "", kategori: "SISWA NON IJEF : NEW COMER",
      klasifikasiSkema: "Standard", gaji: "", keterangan: "", benefit: "", klasifikasiKandidat: "SISWA NON IJEF : NEW COMER",
      deskripsiPekerjaan: "", statusJob: "Open", domisiliKerja: "", fileUrl: "", biayaJob: "",
      skemaPembayaran: "", benefitBiaya: "", sumberJob: "", usiaMax: "", jumlahKandidat: "",
      kumiaiPartner: "", syaratKhusus: "",
    });
  };

  if (authLoading || loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <>
      <Navbar />
      <div className="max-w-full mx-auto px-6 py-8 bg-[#F8F9FC] min-h-screen font-sans">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Portal Lowongan Mitra v5.0</h1>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">International Japan Employment Foundation</p>
          </div>
          <button onClick={() => setShowModal(true)} className="bg-purple-600 text-white px-10 py-5 rounded-[2rem] font-black shadow-2xl shadow-purple-100 hover:bg-purple-700 transition-all uppercase text-[10px] tracking-widest active:scale-95">
            + Input Job Baru
          </button>
        </div>

        {/* Dashboard Klasifikasi */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
           <div className="card p-5 bg-white border-2 border-white rounded-[2rem] shadow-sm"><p className="text-[9px] font-black text-slate-400 uppercase mb-3 tracking-widest">Trending</p>{dashboardStats.namaJob.map(([n, c]) => (<div key={n} onClick={()=>{setFilterType('namaJob');setFilterValue(n);}} className="flex justify-between text-[10px] font-bold cursor-pointer hover:text-purple-600 mb-1.5 transition-colors"><span>{n}</span><span>{c}</span></div>))}</div>
           <div className="card p-5 bg-white border-2 border-white rounded-[2rem] shadow-sm"><p className="text-[9px] font-black text-slate-400 uppercase mb-3 tracking-widest">Top Sektor</p>{dashboardStats.sektor.map(([b, c]) => (<div key={b} onClick={()=>{setFilterType('bidang');setFilterValue(b);}} className="flex justify-between text-[10px] font-bold cursor-pointer hover:text-purple-600 mb-1.5 transition-colors"><span>{b}</span><span>{c}</span></div>))}</div>
           <div className="card p-5 bg-white border-2 border-white rounded-[2rem] shadow-sm"><p className="text-[9px] font-black text-slate-400 uppercase mb-3 tracking-widest">Perusahaan</p>{dashboardStats.perusahaan.map(([p, c]) => (<div key={p} onClick={()=>{setFilterType('perusahaan');setFilterValue(p);}} className="flex justify-between text-[10px] font-bold cursor-pointer hover:text-purple-600 mb-1.5 transition-colors"><span>{p}</span><span>{c}</span></div>))}</div>
           <div onClick={()=>{setFilterType('domisiliIndo');setFilterValue(true);}} className={`card p-6 rounded-[2.5rem] border-4 cursor-pointer text-center transition-all ${filterType==='domisiliIndo'?'bg-indigo-600 text-white border-indigo-200':'bg-white border-white'}`}><h3 className="text-4xl font-black">{dashboardStats.indo}</h3><p className="text-[9px] font-black uppercase mt-1">Domisili ID</p></div>
           <div onClick={()=>{setFilterType('domisiliJepang');setFilterValue(true);}} className={`card p-6 rounded-[2.5rem] border-4 cursor-pointer text-center transition-all ${filterType==='domisiliJepang'?'bg-rose-600 text-white border-rose-200':'bg-white border-white'}`}><h3 className="text-4xl font-black">{dashboardStats.jepang}</h3><p className="text-[9px] font-black uppercase mt-1">Domisili JP</p></div>
        </div>

        {/* Search Bar */}
        <div className="flex gap-4 mb-8 items-center">
           <div className="flex-1 relative">
              <input className="input-field pl-12 h-16 border-none shadow-xl bg-white rounded-3xl font-bold" placeholder="Cari lowongan atau kode..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              <svg className="w-6 h-6 absolute left-4 top-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
           </div>
           {filterType && <button onClick={()=>{setFilterType('');setFilterValue('');}} className="bg-rose-50 text-rose-600 px-8 h-16 rounded-3xl font-black uppercase text-[10px] tracking-widest border border-rose-100 active:scale-95 transition-all">✕ Reset Filter</button>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
           <div className="lg:col-span-1 space-y-4 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
              {filteredJobs.map((j) => (
                <div key={j.id} onClick={() => setSelectedJob(j)} className={`p-6 rounded-[2.5rem] border-2 cursor-pointer transition-all ${selectedJob?.id === j.id ? "border-purple-600 bg-purple-50 shadow-2xl scale-[1.02]" : "border-white bg-white shadow-sm hover:border-purple-200"}`}>
                   <div className="flex justify-between items-start mb-4">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${j.klasifikasiSkema === 'Urgency' ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-900 text-white'}`}>{j.klasifikasiSkema || "Standard"}</span>
                      <span className={`text-[8px] font-black px-2.5 py-0.5 rounded-full uppercase border ${j.statusJob?.toUpperCase() === 'OPEN' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>{j.statusJob}</span>
                   </div>
                   <h3 className="font-black text-slate-800 uppercase text-sm leading-tight mb-4">{j.namaJob}</h3>
                   <div className="flex justify-between items-end">
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight flex items-center gap-1"><svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>{j.lokasi}</div>
                      <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{j.kodeJob}</span>
                   </div>
                </div>
              ))}
           </div>

           <div className="lg:col-span-2">
              {selectedJob ? (
                <div className="card border border-slate-100 shadow-2xl rounded-[3rem] overflow-hidden bg-white sticky top-20">
                   <div className={`p-10 text-white ${selectedJob.klasifikasiSkema === 'Urgency' ? 'bg-gradient-to-r from-rose-600 to-pink-700' : 'bg-gradient-to-r from-purple-600 to-indigo-700'}`}>
                      <h2 className="text-4xl font-black leading-none uppercase tracking-tight mb-6">{selectedJob.namaJob}</h2>
                      <div className="flex flex-wrap gap-3">
                         <span className="bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-xl text-[9px] font-black uppercase">{selectedJob.bidang}</span>
                         <span className="bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-xl text-[9px] font-black uppercase">{selectedJob.kategori}</span>
                      </div>
                   </div>
                   <div className="p-10 space-y-12">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                         <div className="space-y-6">
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Penempatan: <span className="text-slate-800 ml-2 font-black">{selectedJob.lokasi}</span></p>
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Gaji: <span className="text-emerald-600 ml-2 font-black">{selectedJob.gaji || "---"}</span></p>
                         </div>
                         <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-3">Kriteria Utama</p>
                            <div className="space-y-2 text-[11px] font-bold">
                               <div className="flex justify-between"><span>Gender:</span><span className="text-slate-800 uppercase">{selectedJob.jenisKelamin}</span></div>
                               <div className="flex justify-between"><span>Usia Max:</span><span className="text-slate-800 uppercase">{selectedJob.usiaMax || "-"}</span></div>
                               <div className="flex justify-between"><span>Kuota:</span><span className="text-indigo-600 uppercase font-black">{selectedJob.jumlahKandidat} ORANG</span></div>
                            </div>
                         </div>
                      </div>
                      <button onClick={() => router.push(`/candidate/form?jobCode=${selectedJob.kodeJob}`)} className="w-full py-6 bg-slate-900 text-white font-black rounded-3xl hover:bg-indigo-600 transition-all shadow-2xl shadow-slate-200 uppercase tracking-[0.2em] text-xs active:scale-95">DAFTARKAN SISWA UNTUK JOB INI →</button>
                   </div>
                </div>
              ) : (
                <div className="h-[75vh] flex flex-col items-center justify-center text-center p-12 bg-white rounded-[3.5rem] border-2 border-dashed border-slate-100 text-slate-300 font-bold uppercase tracking-widest">Silahkan pilih katalog job.</div>
              )}
           </div>
        </div>
      </div>

      {/* FULL ENTRY MODAL - SYNCED WITH ADMIN */}
      {showModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl overflow-hidden max-h-[95vh] flex flex-col">
            <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">ENTRY DATA LOWONGAN MITRA</h3>
              <button onClick={closeModal} className="text-slate-300 hover:text-slate-800 text-3xl font-light transition-colors">&times;</button>
            </div>
            <form onSubmit={handleSubmitJob} className="overflow-y-auto p-10 custom-scrollbar space-y-12">
               {/* 1. INFORMASI DASAR */}
               <div className="p-8 border-2 border-slate-50 rounded-[2.5rem] space-y-8">
                  <h4 className="text-xs font-black text-indigo-500 uppercase tracking-[0.2em] border-b border-slate-100 pb-3 flex items-center gap-2">1. INFORMASI DASAR & LOKASI</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                     <div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Kode Lowongan</label><input className="input-field h-12 bg-slate-50 border-none font-black rounded-xl" value={formData.kodeJob} onChange={(e) => setFormData({...formData, kodeJob: e.target.value})} placeholder="PART-XXXX" /></div>
                     <div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Status Lowongan</label><select className="input-field h-12 bg-slate-50 border-none font-black rounded-xl" value={formData.statusJob} onChange={(e) => setFormData({...formData, statusJob: e.target.value})}><option value="Open">Aktif (OPEN)</option><option value="Closed">Tutup (CLOSED)</option></select></div>
                     <div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Prefektur / Lokasi</label><input className="input-field h-12 bg-slate-50 border-none font-black rounded-xl" value={formData.lokasi} onChange={(e) => setFormData({...formData, lokasi: e.target.value})} required /></div>
                     <div className="md:col-span-3"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Nama Lowongan / Judul Job</label><input className="input-field h-14 bg-slate-50 border-none font-black rounded-xl text-lg uppercase px-6" value={formData.namaJob} onChange={(e) => setFormData({...formData, namaJob: e.target.value})} required /></div>
                     <div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Nama Perusahaan</label><input className="input-field h-12 bg-slate-50 border-none font-black rounded-xl" value={formData.perusahaan} onChange={(e) => setFormData({...formData, perusahaan: e.target.value})} /></div>
                     <div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Gaji (Bulan/Tahun)</label><input className="input-field h-12 bg-slate-50 border-none font-black rounded-xl text-emerald-600" value={formData.gaji} onChange={(e) => setFormData({...formData, gaji: e.target.value})} /></div>
                     <div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Partner Rujukan / TSK</label><input className="input-field h-12 bg-slate-50 border-none font-black rounded-xl" value={formData.kumiaiPartner} onChange={(e) => setFormData({...formData, kumiaiPartner: e.target.value})} /></div>
                  </div>
               </div>

               {/* 2. KLASIFIKASI & PRIORITAS */}
               <div className="p-8 border-2 border-slate-50 rounded-[2.5rem] space-y-8">
                  <h4 className="text-xs font-black text-purple-500 uppercase tracking-[0.2em] border-b border-slate-100 pb-3 flex items-center gap-2">2. KLASIFIKASI & PRIORITAS</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                     <div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Kategori Domisili</label><select className="input-field h-12 bg-slate-100 border-none font-black rounded-xl text-indigo-600" value={formData.kategori} onChange={(e) => setFormData({...formData, kategori: e.target.value})}><option value="SISWA NON IJEF : NEW COMER">DOMISILI INDONESIA (Daftar Dari Indonesia)</option><option value="SISWA MATCHING JOB : EX-MAGANG/EX-TRAINEE">DOMISILI JEPANG (Daftar Dari Jepang)</option></select></div>
                     <div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Prioritas Skema</label><select className="input-field h-12 bg-slate-100 border-none font-black rounded-xl text-rose-600" value={formData.klasifikasiSkema} onChange={(e) => setFormData({...formData, klasifikasiSkema: e.target.value})}><option value="Urgency">URGENCY (URGENT)</option><option value="Standard">STANDARD (REGULAR)</option><option value="Routine">ROUTINE (MASSAL)</option></select></div>
                     <div className="md:col-span-1"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Klasifikasi Target</label><select className="input-field h-12 bg-slate-50 border-none font-black rounded-xl" value={formData.klasifikasiKandidat} onChange={(e) => setFormData({...formData, klasifikasiKandidat: e.target.value})}><option value="SISWA NON IJEF : NEW COMER">New Comer</option><option value="SISWA MATCHING JOB : EX-MAGANG">Ex-Magang</option></select></div>
                     <div className="md:col-span-1"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Kuota / Kebutuhan</label><input className="input-field h-12 bg-slate-50 border-none font-black rounded-xl text-indigo-600" value={formData.jumlahKandidat} onChange={(e) => setFormData({...formData, jumlahKandidat: e.target.value})} placeholder="4" /></div>
                  </div>
                  <div className="md:col-span-3"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Syarat Khusus (JLPT, SSW, Usia)</label><textarea className="input-field bg-slate-50 border-none font-medium p-6 rounded-2xl text-sm" rows="3" value={formData.syaratKhusus} onChange={(e) => setFormData({...formData, syaratKhusus: e.target.value})} /></div>
               </div>

               {/* 3. BIAYA & FASILITAS */}
               <div className="p-8 border-2 border-slate-50 rounded-[2.5rem] space-y-8">
                  <h4 className="text-xs font-black text-emerald-500 uppercase tracking-[0.2em] border-b border-slate-100 pb-3 flex items-center gap-2">3. INFORMASI BIAYA & FASILITAS</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Biaya Job / Proses</label><textarea className="input-field bg-slate-50 border-none font-medium p-4 rounded-xl text-xs" rows="2" value={formData.biayaJob} onChange={(e) => setFormData({...formData, biayaJob: e.target.value})} /></div>
                     <div><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Fasilitas Asrama & Benefit</label><textarea className="input-field bg-slate-50 border-none font-medium p-4 rounded-xl text-xs" rows="2" value={formData.benefit} onChange={(e) => setFormData({...formData, benefit: e.target.value})} /></div>
                  </div>
               </div>

               {/* 4. DESKRIPSI */}
               <div className="p-8 border-2 border-slate-50 rounded-[2.5rem] space-y-8">
                  <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">4. DESKRIPSI PEKERJAAN & TUGAS HARIAN</h4>
                  <textarea className="input-field bg-slate-50 border-none font-medium p-6 rounded-2xl text-sm leading-relaxed" rows="4" value={formData.deskripsiPekerjaan} onChange={(e) => setFormData({...formData, deskripsiPekerjaan: e.target.value})} />
               </div>

               <div className="flex gap-4 justify-end pt-10 border-t border-slate-50">
                  <button type="button" onClick={closeModal} className="px-10 py-4 font-black text-slate-300 uppercase text-[10px] tracking-widest">Batal</button>
                  <button type="submit" className="bg-slate-900 text-white px-16 py-4 rounded-2xl font-black shadow-2xl hover:bg-indigo-600 transition-all uppercase text-[10px] tracking-widest active:scale-95" disabled={saving}>
                    {saving ? "SIMPAN..." : "SIMPAN DATA LOWONGAN →"}
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
