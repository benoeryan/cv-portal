"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { db, storage } from "@/lib/firebase";
import { collection, getDocs, addDoc, query, orderBy, where } from "firebase/firestore";
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
      else if (j.kategori?.includes("EX-MAGANG") || j.kategori?.includes("ENGINEERING")) stats.jepang++;
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
      if (filterType === "domisiliJepang") matchDashboard = j.kategori?.includes("EX-MAGANG") || j.kategori?.includes("ENGINEERING");
      return matchSearch && matchDashboard;
    });
  }, [jobs, searchTerm, filterType, filterValue]);

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
      setShowModal(false); loadJobs();
      alert("Lowongan berhasil diajukan!");
    } catch (err) { alert(err.message); }
    setSaving(false);
  };

  if (authLoading || loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-8 bg-[#F8F9FC] min-h-screen">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Portal Lowongan Mitra v4.0</h1>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">International Japan Employment Foundation</p>
          </div>
          <button onClick={() => setShowModal(true)} className="bg-purple-600 text-white px-10 py-5 rounded-[2rem] font-black shadow-2xl shadow-purple-100 hover:bg-purple-700 transition-all uppercase text-[10px] tracking-widest active:scale-95">
            + Input Job Baru
          </button>
        </div>

        {/* CLASSIFICATION DASHBOARD */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
           <div className="card p-6 border-2 border-white bg-white/80 rounded-[2.5rem] shadow-sm">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Trending Lowongan</p>
              <div className="space-y-2.5">
                 {dashboardStats.namaJob.map(([n, count]) => (
                   <div key={n} onClick={() => {setFilterType("namaJob"); setFilterValue(n);}} className={`flex justify-between items-center group cursor-pointer p-1.5 rounded-lg transition-all ${filterValue === n ? 'bg-purple-600 text-white' : 'hover:bg-purple-50'}`}>
                      <span className={`text-[10px] font-bold truncate ${filterValue === n ? 'text-white' : 'text-slate-600'}`}>{n}</span>
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black ${filterValue === n ? 'bg-white/20 text-white' : 'bg-purple-50 text-purple-600'}`}>{count}</span>
                   </div>
                 ))}
              </div>
           </div>

           <div className="card p-6 border-2 border-white bg-white/80 rounded-[2.5rem] shadow-sm">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Top Sektor</p>
              <div className="space-y-2.5">
                 {dashboardStats.sektor.map(([s, count]) => (
                   <div key={s} onClick={() => {setFilterType("bidang"); setFilterValue(s);}} className={`flex justify-between items-center group cursor-pointer p-1.5 rounded-lg transition-all ${filterValue === s ? 'bg-blue-600 text-white' : 'hover:bg-blue-50'}`}>
                      <span className={`text-[10px] font-bold truncate ${filterValue === s ? 'text-white' : 'text-slate-600'}`}>{s}</span>
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black ${filterValue === s ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'}`}>{count}</span>
                   </div>
                 ))}
              </div>
           </div>

           <div className="card p-6 border-2 border-white bg-white/80 rounded-[2.5rem] shadow-sm">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Top Perusahaan</p>
              <div className="space-y-2.5">
                 {dashboardStats.perusahaan.map(([p, count]) => (
                   <div key={p} onClick={() => {setFilterType("perusahaan"); setFilterValue(p);}} className={`flex justify-between items-center group cursor-pointer p-1.5 rounded-lg transition-all ${filterValue === p ? 'bg-slate-800 text-white' : 'hover:bg-slate-100'}`}>
                      <span className={`text-[10px] font-bold truncate ${filterValue === p ? 'text-white' : 'text-slate-600'}`}>{p}</span>
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black ${filterValue === p ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
                   </div>
                 ))}
              </div>
           </div>

           <div
             onClick={() => {setFilterType("domisiliIndo"); setFilterValue(true);}}
             className={`card p-8 rounded-[3rem] border-4 transition-all cursor-pointer flex flex-col justify-center items-center text-center ${filterType === 'domisiliIndo' ? 'bg-indigo-600 border-indigo-200 text-white shadow-2xl scale-105' : 'bg-white border-white hover:border-indigo-100 shadow-sm'}`}
           >
              <h3 className="text-4xl font-black">{dashboardStats.indo}</h3>
              <p className={`text-[9px] font-black uppercase tracking-widest mt-2 ${filterType === 'domisiliIndo' ? 'text-indigo-200' : 'text-slate-400'}`}>Domisili Indonesia</p>
           </div>

           <div
             onClick={() => {setFilterType("domisiliJepang"); setFilterValue(true);}}
             className={`card p-8 rounded-[3rem] border-4 transition-all cursor-pointer flex flex-col justify-center items-center text-center ${filterType === 'domisiliJepang' ? 'bg-rose-600 border-rose-200 text-white shadow-2xl scale-105' : 'bg-white border-white hover:border-rose-100 shadow-sm'}`}
           >
              <h3 className="text-4xl font-black">{dashboardStats.jepang}</h3>
              <p className={`text-[9px] font-black uppercase tracking-widest mt-2 ${filterType === 'domisiliJepang' ? 'text-rose-200' : 'text-slate-400'}`}>Domisili Jepang</p>
           </div>
        </div>

        {/* Search Bar */}
        <div className="flex gap-4 mb-8">
           <div className="flex-1 relative">
              <input className="input-field pl-12 h-16 border-none shadow-xl bg-white rounded-3xl font-bold" placeholder="Cari nama lowongan atau kode..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              <svg className="w-6 h-6 absolute left-4 top-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
           </div>
           {filterType && (
              <button onClick={() => {setFilterType(""); setFilterValue("");}} className="bg-rose-50 text-rose-600 px-8 rounded-3xl font-black uppercase text-[10px] tracking-widest border-2 border-rose-100 hover:bg-rose-100 transition-all">✕ Hapus Filter</button>
           )}
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
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Penempatan: <span className="text-slate-800 ml-2">{selectedJob.lokasi}</span></p>
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Gaji: <span className="text-emerald-600 ml-2">{selectedJob.gaji || "---"}</span></p>
                         </div>
                         <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-3">Kriteria Dasar</p>
                            <div className="space-y-2 text-[11px] font-bold">
                               <div className="flex justify-between"><span>Gender:</span><span className="text-slate-800">{selectedJob.jenisKelamin}</span></div>
                               <div className="flex justify-between"><span>Usia Max:</span><span className="text-slate-800">{selectedJob.usiaMax || "-"}</span></div>
                            </div>
                         </div>
                      </div>
                      <button onClick={() => router.push(`/candidate/form?jobCode=${selectedJob.kodeJob}`)} className="w-full py-6 bg-slate-900 text-white font-black rounded-3xl hover:bg-indigo-600 transition-all shadow-2xl shadow-slate-200 uppercase tracking-[0.2em] text-xs">DAFTARKAN SISWA UNTUK JOB INI →</button>
                   </div>
                </div>
              ) : (
                <div className="h-[75vh] flex flex-col items-center justify-center text-center p-12 bg-white rounded-[3.5rem] border-2 border-dashed border-slate-100">
                   <h3 className="text-slate-800 font-black uppercase tracking-tight text-2xl">Pilih Katalog Job</h3>
                   <p className="text-slate-400 text-sm mt-3 max-w-xs font-bold uppercase tracking-widest leading-loose">Silahkan klik salah satu kartu di panel kiri</p>
                </div>
              )}
           </div>
        </div>
      </div>
      {/* Modal is already identical and updated in previous logic */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </>
  );
}
