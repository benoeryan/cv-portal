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
  const [filterBidang, setFilterBidang] = useState("");
  const [filterKategori, setFilterKategori] = useState("");
  const [filterSkema, setFilterSkema] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    kodeJob: "",
    namaJob: "",
    perusahaan: "",
    lokasi: "",
    bidang: "",
    kategori: "SISWA NON IJEF : NEW COMER",
    klasifikasiSkema: "Standard", // Urgency, Standard, Routine
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
      // Partners see their own jobs OR any job marked as OPEN
      setJobs(data.filter(j => j.statusJob === "Open" || j.statusJob === "OPEN" || j.createdBy === user.uid));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter(j => {
      const matchSearch = !searchTerm || j.namaJob?.toLowerCase().includes(searchTerm.toLowerCase()) || j.kodeJob?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchBidang = !filterBidang || j.bidang === filterBidang;
      const matchKategori = !filterKategori || j.kategori === filterKategori;
      const matchSkema = !filterSkema || j.klasifikasiSkema === filterSkema;
      return matchSearch && matchBidang && matchKategori && matchSkema;
    });
  }, [jobs, searchTerm, filterBidang, filterKategori, filterSkema]);

  const statsByKategori = useMemo(() => {
    const counts = {};
    jobs.forEach(j => {
      const k = j.kategori || "Umum";
      counts[k] = (counts[k] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [jobs]);

  const statsBySkema = useMemo(() => {
    const counts = { "Urgency": 0, "Standard": 0, "Routine": 0 };
    jobs.forEach(j => {
      const s = j.klasifikasiSkema || "Standard";
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts);
  }, [jobs]);

  const uniqueBidang = [...new Set(jobs.map(j => j.bidang).filter(Boolean))].sort();

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
      alert("Lowongan berhasil diajukan!");
    } catch (err) { alert(err.message); }
    setSaving(false);
  };

  if (authLoading || loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">PORTAL LOWONGAN MITRA v3.0</h1>
            <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">International Japan Employment Foundation</p>
          </div>
          <button onClick={() => setShowModal(true)} className="bg-purple-600 text-white px-8 py-4 rounded-[1.5rem] font-black shadow-2xl shadow-purple-100 hover:bg-purple-700 transition-all uppercase text-xs tracking-widest">
            + Input Job Baru
          </button>
        </div>

        {/* Dashboard Kategori Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-10">
           {statsBySkema.map(([skema, count]) => (
             <div
               key={skema}
               onClick={() => setFilterSkema(prev => prev === skema ? "" : skema)}
               className={`cursor-pointer p-5 rounded-[2rem] border-2 transition-all ${
                 filterSkema === skema ? "bg-slate-900 border-slate-900 text-white shadow-xl" : "bg-white border-white shadow-sm hover:border-purple-100"
               }`}
             >
                <p className={`text-[9px] font-black uppercase tracking-widest ${filterSkema === skema ? "text-purple-400" : "text-slate-400"}`}>Skema: {skema}</p>
                <h3 className="text-3xl font-black mt-1">{count}</h3>
             </div>
           ))}
           {statsByKategori.slice(0, 2).map(([kat, count]) => (
             <div
               key={kat}
               onClick={() => setFilterKategori(prev => prev === kat ? "" : kat)}
               className={`cursor-pointer p-5 rounded-[2rem] border-2 transition-all ${
                 filterKategori === kat ? "bg-purple-600 border-purple-600 text-white shadow-xl" : "bg-white border-white shadow-sm hover:border-purple-100"
               }`}
             >
                <p className={`text-[9px] font-black uppercase tracking-widest line-clamp-1 ${filterKategori === kat ? "text-purple-200" : "text-slate-400"}`}>{kat}</p>
                <h3 className="text-3xl font-black mt-1">{count}</h3>
             </div>
           ))}
        </div>

        {/* Search & Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
           <div className="md:col-span-2 relative">
              <input className="input-field pl-12 h-14 border-none shadow-sm bg-white rounded-2xl font-bold" placeholder="Cari nama lowongan atau kode..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              <svg className="w-6 h-6 absolute left-4 top-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
           </div>
           <select className="input-field h-14 border-none shadow-sm bg-white rounded-2xl font-black uppercase text-xs px-6" value={filterBidang} onChange={(e) => setFilterBidang(e.target.value)}>
             <option value="">Semua Sektor</option>
             {uniqueBidang.map(b => <option key={b} value={b}>{b}</option>)}
           </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
           {/* List Lowongan */}
           <div className="lg:col-span-1 space-y-4 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
              {filteredJobs.map((j) => (
                <div
                  key={j.id}
                  onClick={() => setSelectedJob(j)}
                  className={`p-6 rounded-[2.5rem] border-2 cursor-pointer transition-all ${
                    selectedJob?.id === j.id ? "border-purple-600 bg-purple-50 shadow-2xl scale-[1.02]" : "border-white bg-white shadow-sm hover:border-purple-200"
                  }`}
                >
                   <div className="flex justify-between items-start mb-4">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${j.klasifikasiSkema === 'Urgency' ? 'bg-rose-600 text-white' : 'bg-slate-900 text-white'}`}>
                         {j.klasifikasiSkema || "Standard"}
                      </span>
                      <span className={`text-[8px] font-black px-2.5 py-0.5 rounded-full uppercase border ${j.statusJob?.toUpperCase() === 'OPEN' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                         {j.statusJob}
                      </span>
                   </div>
                   <h3 className="font-black text-slate-800 uppercase text-sm leading-tight mb-4">{j.namaJob}</h3>
                   <div className="flex justify-between items-end">
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight flex items-center gap-1">
                         <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                         {j.lokasi}
                      </div>
                      <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{j.kodeJob}</span>
                   </div>
                </div>
              ))}
           </div>

           {/* Detail Section */}
           <div className="lg:col-span-2">
              {selectedJob ? (
                <div className="card border border-slate-100 shadow-2xl rounded-[3rem] overflow-hidden bg-white sticky top-20">
                   {/* Header Detail */}
                   <div className={`p-10 text-white ${selectedJob.klasifikasiSkema === 'Urgency' ? 'bg-gradient-to-r from-rose-600 to-pink-700' : 'bg-gradient-to-r from-purple-600 to-indigo-700'}`}>
                      <div className="flex justify-between items-start mb-4">
                         <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70">Detail Lowongan #{selectedJob.kodeJob}</span>
                         <div className="bg-white/20 backdrop-blur-md px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20">
                            {selectedJob.klasifikasiSkema || "Standard"} Priority
                         </div>
                      </div>
                      <h2 className="text-4xl font-black leading-none uppercase tracking-tight mb-6">{selectedJob.namaJob}</h2>
                      <div className="flex flex-wrap gap-3">
                         <span className="bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest">{selectedJob.bidang}</span>
                         <span className="bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest">{selectedJob.kategori}</span>
                      </div>
                   </div>

                   <div className="p-10 space-y-12 overflow-y-auto max-h-[60vh] custom-scrollbar">
                      {/* Grid Informasi */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                         <div className="space-y-8">
                            <div className="flex items-start gap-4">
                               <div className="p-4 bg-purple-50 rounded-2xl text-purple-600 shadow-sm"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg></div>
                               <div>
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Lokasi Kerja</p>
                                  <p className="text-xl font-black text-slate-700">{selectedJob.lokasi}</p>
                                  <p className="text-xs text-purple-400 font-bold italic mt-1">{selectedJob.domisiliKerja || "Info menyusul"}</p>
                               </div>
                            </div>
                            <div className="flex items-start gap-4">
                               <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600 shadow-sm"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2" /></svg></div>
                               <div>
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Estimasi Gaji</p>
                                  <p className="text-3xl font-black text-emerald-600 tracking-tight">{selectedJob.gaji || "---"}</p>
                               </div>
                            </div>
                         </div>

                         <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 space-y-6">
                            <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] border-b border-slate-200 pb-3 text-center">Kriteria & Kebutuhan</h4>
                            <div className="space-y-4">
                               <div className="flex justify-between items-center text-[11px] font-bold border-b border-white pb-2"><span className="text-slate-400 uppercase">Usia Max</span><span className="text-slate-700">{selectedJob.usiaMax || "-"}</span></div>
                               <div className="flex justify-between items-center text-[11px] font-bold border-b border-white pb-2"><span className="text-slate-400 uppercase">Gender</span><span className="text-slate-700">{selectedJob.jenisKelamin}</span></div>
                               <div className="flex justify-between items-center text-[11px] font-bold"><span className="text-slate-400 uppercase">Kuota</span><span className="text-indigo-600">{selectedJob.jumlahKandidat || "-"} ORANG</span></div>
                            </div>
                         </div>
                      </div>

                      {/* Detail Deskripsi */}
                      <div className="space-y-10">
                         {selectedJob.syaratKhusus && (
                           <div className="p-8 bg-rose-50 rounded-[2rem] border border-rose-100">
                              <h4 className="text-xs font-black text-rose-800 uppercase mb-4 flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>Kualifikasi Khusus (JLPT/SSW)</h4>
                              <p className="text-rose-900 font-black text-sm uppercase leading-relaxed">{selectedJob.syaratKhusus}</p>
                           </div>
                         )}
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div>
                               <h4 className="text-xs font-black text-slate-800 uppercase mb-4 flex items-center gap-3"><div className="w-1.5 h-4 bg-purple-600 rounded-full"></div>Tanggung Jawab</h4>
                               <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line bg-slate-50 p-6 rounded-2xl border border-slate-100 font-medium italic">{selectedJob.deskripsiPekerjaan || "Belum ada uraian tugas."}</p>
                            </div>
                            <div>
                               <h4 className="text-xs font-black text-slate-800 uppercase mb-4 flex items-center gap-3"><div className="w-1.5 h-4 bg-emerald-500 rounded-full"></div>Fasilitas & Benefit</h4>
                               <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line bg-emerald-50/20 p-6 rounded-2xl border border-emerald-50 font-medium">{selectedJob.benefit || "Belum ada info benefit."}</p>
                            </div>
                         </div>
                      </div>
                   </div>

                   <div className="p-8 bg-slate-50 border-t border-slate-100">
                      <button onClick={() => router.push(`/candidate/form?jobCode=${selectedJob.kodeJob}`)} className="w-full py-6 bg-slate-900 text-white font-black rounded-3xl hover:bg-indigo-600 transition-all shadow-2xl shadow-slate-200 uppercase tracking-[0.2em] text-xs">
                         DAFTARKAN SISWA UNTUK JOB INI →
                      </button>
                   </div>
                </div>
              ) : (
                <div className="h-[75vh] flex flex-col items-center justify-center text-center p-12 bg-white rounded-[3.5rem] border-2 border-dashed border-slate-100">
                   <div className="p-8 bg-purple-50 rounded-full mb-8 text-purple-200 animate-bounce"><svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745" /></svg></div>
                   <h3 className="text-slate-800 font-black uppercase tracking-tight text-2xl">Pilih Katalog Job</h3>
                   <p className="text-slate-400 text-sm mt-3 max-w-xs font-bold uppercase tracking-widest leading-loose">Klik salah satu kartu di sebelah kiri untuk melihat rincian lowongan</p>
                </div>
              )}
           </div>
        </div>
      </div>

      {/* Modal: Input Job Identik dengan Admin */}
      {showModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl overflow-hidden max-h-[95vh] flex flex-col">
            <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">ENTRY DATA LOWONGAN MITRA</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-300 hover:text-slate-800 text-3xl font-light">&times;</button>
            </div>
            <form onSubmit={handleSubmitJob} className="overflow-y-auto p-10 custom-scrollbar space-y-10">
               <div className="p-8 border-2 border-slate-50 rounded-[2.5rem] space-y-8">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-3">1. Klasifikasi Prioritas</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                     <div>
                        <label className="form-label text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Pilih Skema Prioritas</label>
                        <select className="input-field bg-slate-100 border-none font-black h-12 rounded-xl text-indigo-600" value={formData.klasifikasiSkema} onChange={(e) => setFormData({...formData, klasifikasiSkema: e.target.value})}>
                          <option value="Urgency">URGENCY (URGENT)</option>
                          <option value="Standard">STANDARD (REGULAR)</option>
                          <option value="Routine">ROUTINE (MASSAL)</option>
                        </select>
                     </div>
                     <div className="md:col-span-2">
                        <label className="form-label text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Judul Lowongan Kerja</label>
                        <input className="input-field bg-slate-50 border-none font-bold uppercase h-12 rounded-xl" value={formData.namaJob} onChange={(e) => setFormData({...formData, namaJob: e.target.value})} required placeholder="Contoh: KAIGO / KONSTRUKSI" />
                     </div>
                  </div>
               </div>

               <div className="p-8 border-2 border-slate-50 rounded-[2.5rem] space-y-8">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-3">2. Detail Penempatan & Kriteria</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                     <div><label className="form-label text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Sektor</label><input className="input-field bg-slate-50 border-none font-bold h-12 rounded-xl" value={formData.bidang} onChange={(e) => setFormData({...formData, bidang: e.target.value})} required /></div>
                     <div><label className="form-label text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Prefektur</label><input className="input-field bg-slate-50 border-none font-bold h-12 rounded-xl" value={formData.lokasi} onChange={(e) => setFormData({...formData, lokasi: e.target.value})} required /></div>
                     <div><label className="form-label text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Gaji</label><input className="input-field bg-slate-50 border-none font-bold h-12 rounded-xl" value={formData.gaji} onChange={(e) => setFormData({...formData, gaji: e.target.value})} /></div>
                  </div>
               </div>

               <div className="flex gap-4 justify-end pt-10 border-t border-slate-50">
                  <button type="button" onClick={() => setShowModal(false)} className="px-10 py-4 font-black text-slate-300 uppercase text-[10px] tracking-widest hover:text-slate-500">Batal</button>
                  <button type="submit" className="bg-slate-900 text-white px-16 py-4 rounded-2xl font-black shadow-2xl shadow-slate-200 hover:bg-indigo-600 transition-all uppercase text-[10px] tracking-widest" disabled={saving}>
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
      `}</style>
    </>
  );
}
