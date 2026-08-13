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
  const [searchTerm, setSearchTerm] = useState("");
  const [filterKategori, setFilterKategori] = useState("");
  const [filterSkema, setFilterSkema] = useState("");
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
    kategori: "",
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

  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [reseting, setReseting] = useState(false);
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

  const filteredJobs = useMemo(() => {
    return jobs.filter(j => {
      const matchSearch = !searchTerm ||
        j.namaJob?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        j.kodeJob?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        j.perusahaan?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchKategori = !filterKategori || j.kategori === filterKategori;
      const matchSkema = !filterSkema || j.klasifikasiSkema === filterSkema;
      return matchSearch && matchKategori && matchSkema;
    });
  }, [jobs, searchTerm, filterKategori, filterSkema]);

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
      if (j.klasifikasiSkema) counts[j.klasifikasiSkema] = (counts[j.klasifikasiSkema] || 0) + 1;
    });
    return Object.entries(counts);
  }, [jobs]);

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
      if (editingJob) {
        await updateDoc(doc(db, "jobs", editingJob.id), dataToSave);
      } else {
        await addDoc(collection(db, "jobs"), { ...dataToSave, createdAt: new Date().toISOString() });
      }
      closeModal();
      loadJobs();
    } catch (err) { alert(err.message); }
    setSubmitting(false);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingJob(null);
    setFormData({
      kodeJob: "", namaJob: "", perusahaan: "", lokasi: "", bidang: "", kategori: "",
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
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-[#F8F9FC] min-h-screen">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">MANAJEMEN JOB CENTER v3.0</h1>
            <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">International Japan Employment Foundation</p>
          </div>
          <button onClick={() => setShowModal(true)} className="bg-slate-900 text-white px-8 py-4 rounded-[1.5rem] font-black shadow-2xl shadow-slate-200 hover:bg-indigo-600 transition-all uppercase text-xs tracking-widest">
            + Tambah Lowongan Baru
          </button>
        </div>

        {/* Dashboard Kategori Skema & Kategori Job */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
           {statsBySkema.map(([skema, count]) => (
             <div
               key={skema}
               onClick={() => setFilterSkema(prev => prev === skema ? "" : skema)}
               className={`cursor-pointer p-5 rounded-[2rem] border-2 transition-all group ${
                 filterSkema === skema ? "bg-slate-900 border-slate-900 text-white shadow-2xl scale-[1.02]" : "bg-white border-white shadow-sm hover:border-indigo-100"
               }`}
             >
                <div className="flex justify-between items-start">
                   <p className={`text-[9px] font-black uppercase tracking-widest ${filterSkema === skema ? "text-indigo-400" : "text-slate-400"}`}>Skema: {skema}</p>
                   <div className={`w-2 h-2 rounded-full ${skema === 'Urgency' ? 'bg-rose-500 animate-pulse' : skema === 'Standard' ? 'bg-indigo-500' : 'bg-emerald-500'}`}></div>
                </div>
                <h3 className="text-3xl font-black mt-2">{count}</h3>
                <p className="text-[8px] font-bold uppercase opacity-40 mt-1">Total {skema} Job</p>
             </div>
           ))}
           {statsByKategori.slice(0, 3).map(([kat, count]) => (
             <div
               key={kat}
               onClick={() => setFilterKategori(prev => prev === kat ? "" : kat)}
               className={`cursor-pointer p-5 rounded-[2rem] border-2 transition-all ${
                 filterKategori === kat ? "bg-indigo-600 border-indigo-600 text-white shadow-2xl scale-[1.02]" : "bg-white border-white shadow-sm hover:border-indigo-100"
               }`}
             >
                <p className={`text-[9px] font-black uppercase tracking-widest line-clamp-1 ${filterKategori === kat ? "text-indigo-200" : "text-slate-400"}`}>{kat}</p>
                <h3 className="text-3xl font-black mt-2">{count}</h3>
                <p className="text-[8px] font-bold uppercase opacity-40 mt-1">Kategori: {kat}</p>
             </div>
           ))}
        </div>

        <div className="mb-6 relative">
           <input className="input-field pl-12 h-14 border-none shadow-sm bg-white rounded-2xl font-bold" placeholder="Cari nama lowongan, kode, atau perusahaan..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
           <svg className="w-6 h-6 absolute left-4 top-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>

        <div className="card overflow-hidden !p-0 border border-slate-100 shadow-xl rounded-[2.5rem] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white uppercase font-black text-[10px] tracking-widest">
                  <th className="py-6 px-6">Skema</th>
                  <th className="py-6 px-6">Nama Lowongan</th>
                  <th className="py-6 px-6">Perusahaan / Lokasi</th>
                  <th className="py-6 px-6">Sektor</th>
                  <th className="py-6 px-6">Gaji</th>
                  <th className="py-6 px-6">Status</th>
                  <th className="py-6 px-6 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredJobs.map((j) => (
                  <tr key={j.id} className="hover:bg-indigo-50/30 transition-all cursor-pointer group" onClick={() => { setSelectedJobDetail(j); setShowDetailModal(true); }}>
                    <td className="py-5 px-6">
                       <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                         j.klasifikasiSkema === 'Urgency' ? 'bg-rose-100 text-rose-600' :
                         j.klasifikasiSkema === 'Standard' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'
                       }`}>
                          {j.klasifikasiSkema || "Standard"}
                       </span>
                    </td>
                    <td className="py-5 px-6">
                      <div className="font-black text-slate-800 uppercase text-xs group-hover:text-indigo-600 transition-colors leading-tight">{j.namaJob}</div>
                      <div className="text-[9px] text-slate-400 font-bold mt-1 tracking-tight">{j.kodeJob} • {j.kategori}</div>
                    </td>
                    <td className="py-5 px-6">
                      <div className="font-bold text-slate-700 text-xs">{j.perusahaan || "---"}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 font-medium uppercase tracking-tight">
                        <svg className="w-3 h-3 text-indigo-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                        {j.lokasi}
                      </div>
                    </td>
                    <td className="py-5 px-6">
                      <span className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-tight border border-blue-100">{j.bidang}</span>
                    </td>
                    <td className="py-5 px-6 font-black text-emerald-600 text-xs tracking-tight">{j.gaji || "-"}</td>
                    <td className="py-5 px-6">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${j.statusJob?.toUpperCase() === 'OPEN' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                        {j.statusJob}
                      </span>
                    </td>
                    <td className="py-5 px-6" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-center gap-3">
                        <button onClick={() => handleEdit(j)} className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button onClick={() => handleDelete(j.id)} className="p-2.5 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-600 hover:text-white transition-all shadow-sm">
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

      {/* DETAIL & ENTRY MODALS REMAIN IDENTICAL BUT UPDATED WITH klasifikasiSkema FIELD */}
      {showModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl overflow-hidden max-h-[95vh] flex flex-col">
            <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{editingJob ? "UPDATE DATA LOWONGAN" : "ENTRY LOWONGAN BARU"}</h3>
              <button onClick={closeModal} className="text-slate-300 hover:text-slate-800 text-3xl font-light">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="overflow-y-auto p-10 custom-scrollbar space-y-10">
               <div className="p-8 border-2 border-slate-50 rounded-[2.5rem] space-y-8">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-3">1. Klasifikasi & Skema Urgency</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                     <div className="md:col-span-1">
                        <label className="form-label text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Pilih Skema Prioritas</label>
                        <select className="input-field bg-slate-100 border-none font-black h-12 rounded-xl text-indigo-600" value={formData.klasifikasiSkema} onChange={(e) => setFormData({...formData, klasifikasiSkema: e.target.value})}>
                          <option value="Urgency">URGENCY (URGENT)</option>
                          <option value="Standard">STANDARD (REGULAR)</option>
                          <option value="Routine">ROUTINE (MASSAL)</option>
                        </select>
                     </div>
                     <div className="md:col-span-2">
                        <label className="form-label text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Judul Lowongan</label>
                        <input className="input-field bg-slate-50 border-none font-bold uppercase h-12 rounded-xl" value={formData.namaJob} onChange={(e) => setFormData({...formData, namaJob: e.target.value})} required placeholder="Contoh: KAIGO / KONSTRUKSI" />
                     </div>
                  </div>
               </div>

               {/* Sisa input form lama */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  <div>
                    <label className="form-label text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Sektor / Bidang</label>
                    <input className="input-field bg-slate-50 border-none font-bold h-12 rounded-xl" value={formData.bidang} onChange={(e) => setFormData({...formData, bidang: e.target.value})} required />
                  </div>
                  <div>
                    <label className="form-label text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Prefektur / Lokasi</label>
                    <input className="input-field bg-slate-50 border-none font-bold h-12 rounded-xl" value={formData.lokasi} onChange={(e) => setFormData({...formData, lokasi: e.target.value})} required />
                  </div>
                  <div>
                    <label className="form-label text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Estimasi Gaji</label>
                    <input className="input-field bg-slate-50 border-none font-bold h-12 rounded-xl" value={formData.gaji} onChange={(e) => setFormData({...formData, gaji: e.target.value})} />
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
