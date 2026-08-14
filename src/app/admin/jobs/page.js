"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { db, storage } from "@/lib/firebase";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import Navbar from "@/components/Navbar";

export default function JobManagementPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("table");

  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [selectedJobDetail, setSelectedJobDetail] = useState(null);

  const [formData, setFormData] = useState({
    kodeJob: "",
    namaJob: "",
    perusahaan: "",
    lokasi: "",
    bidang: "Umum",
    kategori: "SISWA NON IJEF : NEW COMER",
    klasifikasiSkema: "Standard",
    gaji: "",
    keterangan: "",
    benefit: "-",
    klasifikasiKandidat: "SISWA NON IJEF : NEW COMER",
    deskripsiPekerjaan: "",
    statusJob: "Open",
    jenisKelamin: "Pria & Wanita",
    jumlahKandidat: "",
    kumiaiPartner: "",
    syaratKhusus: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);

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

  const filteredJobs = useMemo(() => {
    return jobs.filter(j =>
      !searchTerm ||
      j.namaJob?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.kodeJob?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.perusahaan?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [jobs, searchTerm]);

  const translateGender = (val) => {
    if (!val) return "Pria & Wanita";
    const v = val.toString().trim();
    if (v === "男") return "Pria";
    if (v === "女") return "Wanita";
    if (v === "男女") return "Pria & Wanita";
    if (v.toUpperCase() === "L") return "Pria";
    if (v.toUpperCase() === "P") return "Wanita";
    return v;
  };

  const translateStatus = (val) => {
    if (!val) return "Open";
    const v = val.toString().trim();
    if (v === "クローズ") return "Closed";
    if (v === "国内") return "Open";
    return v;
  };

  const handleImportGoogleSheets = async () => {
    if (!window.confirm("Import data job dari Google Sheets? Data dengan Kode Job yang sama akan diupdate.")) return;
    setImporting(true);
    try {
      const sheetId = "1P2P6Z_-11udONGzjSDIBVcX-OfnT8jeUwAPYL-p12yY";
      const sheetName = "LIST JOB AVAILABLE";
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;

      const response = await fetch(csvUrl);
      const csvText = await response.text();

      const rows = csvText.split("\n").map(row => {
        const matches = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        return matches ? matches.map(m => m.replace(/^"|"$/g, "")) : [];
      });

      if (rows.length < 2) throw new Error("Format sheet tidak valid atau kosong.");

      const dataRows = rows.slice(1);
      const snapshot = await getDocs(query(collection(db, "jobs")));
      const existingJobs = snapshot.docs.map(d => ({ id: d.id, kodeJob: d.data().kodeJob }));

      let count = 0;
      for (const row of dataRows) {
        if (!row[1] && !row[3]) continue;

        const getCell = (idx, fallback = "-") => (row[idx] !== undefined && row[idx] !== null) ? row[idx].toString().trim() : fallback;

        const jobData = {
          statusJob: translateStatus(row[0]),
          namaJob: getCell(1, "Untitled Job"),
          lokasi: getCell(2, "Jepang"),
          kodeJob: getCell(3, String(Date.now())),
          jenisKelamin: translateGender(row[4]),
          gaji: getCell(5),
          jumlahKandidat: getCell(6, "1"),
          syaratKhusus: getCell(7),
          biayaJob: getCell(8),
          keterangan: getCell(9),
          kumiaiPartner: getCell(10),
          // System Fields
          bidang: "Umum",
          perusahaan: getCell(1, "-"),
          kategori: "SISWA NON IJEF : NEW COMER",
          klasifikasiSkema: "Standard",
          klasifikasiKandidat: "SISWA NON IJEF : NEW COMER",
          deskripsiPekerjaan: getCell(9),
          benefit: "-",
          updatedAt: new Date().toISOString()
        };

        const existing = existingJobs.find(j => j.kodeJob === jobData.kodeJob);

        if (existing) {
          await updateDoc(doc(db, "jobs", existing.id), jobData);
        } else {
          await addDoc(collection(db, "jobs"), {
            ...jobData,
            createdAt: new Date().toISOString()
          });
        }
        count++;
      }

      alert(`Berhasil sinkronisasi ${count} data job.`);
      loadJobs();
    } catch (err) {
      console.error("Import error:", err);
      alert("Gagal impor: " + err.message);
    }
    setImporting(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      const dataToSave = {
        ...formData,
        updatedAt: new Date().toISOString()
      };

      Object.keys(dataToSave).forEach(key => {
        if (dataToSave[key] === undefined) dataToSave[key] = "";
      });

      if (editingJob) await updateDoc(doc(db, "jobs", editingJob.id), dataToSave);
      else await addDoc(collection(db, "jobs"), { ...dataToSave, createdAt: new Date().toISOString() });

      closeModal(); loadJobs();
    } catch (err) { alert(err.message); }
    setSubmitting(false);
  };

  const closeModal = () => {
    setShowModal(false); setEditingJob(null);
    setFormData({
      kodeJob: "", namaJob: "", perusahaan: "", lokasi: "", bidang: "Umum", kategori: "SISWA NON IJEF : NEW COMER",
      klasifikasiSkema: "Standard", gaji: "", keterangan: "", benefit: "-", klasifikasiKandidat: "SISWA NON IJEF : NEW COMER",
      deskripsiPekerjaan: "", statusJob: "Open", jenisKelamin: "Pria & Wanita", jumlahKandidat: "",
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
           <div>
              <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Manajemen Lowongan Kerja</h1>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">IJEF Portal</p>
           </div>
           <div className="flex gap-3">
             <button
               onClick={handleImportGoogleSheets}
               disabled={importing}
               className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] font-black shadow-2xl hover:bg-emerald-700 transition-all uppercase text-[10px] tracking-widest active:scale-95 flex items-center gap-2"
             >
                <svg className={`w-4 h-4 ${importing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                {importing ? "Sinkronisasi..." : "Sinkron Data Spreadsheet"}
             </button>
             <button onClick={() => setShowModal(true)} className="bg-slate-900 text-white px-10 py-5 rounded-[2rem] font-black shadow-2xl hover:bg-indigo-600 transition-all uppercase text-[10px] tracking-widest active:scale-95">
                + Tambah Lowongan
             </button>
           </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-10 items-center">
           <div className="flex-1 relative w-full">
              <input className="input-field pl-14 h-16 border-none shadow-xl bg-white rounded-3xl font-black text-lg text-slate-900" placeholder="Cari Lowongan..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              <svg className="w-6 h-6 absolute left-5 top-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
           </div>
           <div className="flex bg-white p-2 rounded-2xl shadow-lg border border-slate-50 shrink-0">
              <button onClick={() => setViewMode("table")} className={`px-8 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all ${viewMode==='table'?'bg-[#0F172A] text-white shadow-xl':'text-slate-400 hover:bg-slate-50'}`}>Listing Data</button>
              <button onClick={() => setViewMode("card")} className={`px-8 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all ${viewMode==='card'?'bg-[#0F172A] text-white shadow-xl':'text-slate-400 hover:bg-slate-50'}`}>Tampilan Kartu</button>
           </div>
        </div>

        {viewMode === "table" ? (
          <div className="card overflow-hidden !p-0 border-none shadow-2xl rounded-[3rem] bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white uppercase font-black text-[9px] tracking-widest text-center">
                    <th className="py-5 px-4">STATUS</th>
                    <th className="py-5 px-4">KODE JOB</th>
                    <th className="py-5 px-4 text-left">JUDUL PEKERJAAN (LIST JOB)</th>
                    <th className="py-5 px-4">DAERAH</th>
                    <th className="py-5 px-4">GENDER</th>
                    <th className="py-5 px-4">GAJI</th>
                    <th className="py-5 px-4">KUOTA</th>
                    <th className="py-5 px-4 text-left">KUALIFIKASI</th>
                    <th className="py-5 px-4">BIAYA PROSES</th>
                    <th className="py-5 px-4">TSK / SUMBER</th>
                    <th className="py-5 px-4">KETERANGAN</th>
                    <th className="py-5 px-4">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredJobs.map((j) => (
                    <tr key={j.id} className="hover:bg-slate-50 transition-all text-center">
                      <td className="py-5 px-4"><span className={`px-2.5 py-1 rounded-md text-[8px] font-black uppercase border ${j.statusJob === 'Open' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>{j.statusJob || "Aktif"}</span></td>
                      <td className="py-5 px-4"><span className="bg-purple-50 text-purple-600 px-2.5 py-1 rounded-md text-[8px] font-black uppercase border border-purple-100">{j.kodeJob || "-"}</span></td>
                      <td className="py-5 px-4 text-left"><div className="font-black text-slate-800 text-[11px] uppercase leading-none">{j.namaJob}</div><div className="text-[9px] text-slate-400 font-bold mt-1.5 uppercase">{j.kategori}</div></td>
                      <td className="py-5 px-4"><span className="bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-md text-[8px] font-black uppercase border border-indigo-100">{j.lokasi}</span></td>
                      <td className="py-5 px-4 text-[11px] font-black text-slate-700">{j.jenisKelamin?.charAt(0) || "P"}</td>
                      <td className="py-5 px-4 text-[11px] font-black text-orange-600">{j.gaji || "-"}</td>
                      <td className="py-5 px-4 text-[11px] font-black text-slate-800">{j.jumlahKandidat || "0"} Org</td>
                      <td className="py-5 px-4 text-left"><div className="bg-amber-50/30 border border-amber-100 rounded-lg px-3 py-1.5 text-[9px] font-black text-amber-700 line-clamp-1 max-w-[150px]">Kualifikasi: {j.syaratKhusus}</div></td>
                      <td className="py-5 px-4 text-[10px] font-bold text-slate-400">{j.biayaJob || "-"}</td>
                      <td className="py-5 px-4 text-[10px] font-bold text-slate-600">{j.kumiaiPartner || "-"}</td>
                      <td className="py-5 px-4 text-[10px] font-bold text-slate-400">{j.keterangan || "0"}</td>
                      <td className="py-5 px-4">
                        <div className="flex justify-center gap-1.5">
                           <button onClick={() => { setSelectedJobDetail(j); setShowDetailModal(true); }} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-100 hover:bg-blue-600 hover:text-white transition-all shadow-sm" title="View Detail"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></button>
                           <button onClick={() => handleEdit(j)} className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all shadow-sm" title="Edit"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                           <button onClick={() => handleDelete(j.id)} className="p-1.5 bg-rose-50 text-rose-600 rounded-lg border border-rose-100 hover:bg-rose-600 hover:text-white transition-all shadow-sm" title="Hapus"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
             {filteredJobs.map((j) => (
               <div key={j.id} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col hover:shadow-2xl transition-all duration-500">
                  <div className="p-8 space-y-5">
                     <div className="flex justify-between items-start">
                        <div className="flex gap-2">
                           <span className="bg-purple-50 text-purple-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase">{j.kodeJob || "-"}</span>
                           <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase">Aktif</span>
                        </div>
                        <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-tight">{j.lokasi || "Berbagai Prefektur di Jepang"}</span>
                     </div>
                     <div>
                        <h3 className="font-black text-slate-800 text-lg uppercase leading-tight">{j.perusahaan || "---"}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1.5">{j.kategori || "Semua Non-IJEF"}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">TSK / Partner: {j.kumiaiPartner || "-"}</p>
                     </div>
                     <div className="bg-slate-50/70 rounded-2xl p-6 space-y-4 border border-slate-50 shadow-inner">
                        <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-tighter"><span className="text-slate-400">Gaji:</span><span className="text-orange-600 text-right">{j.gaji || "-"}</span></div>
                        <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-tighter"><span className="text-slate-400">Gender & Kuota:</span><span className="text-slate-800 text-right">{j.jenisKelamin?.charAt(0) || "P"} • {j.jumlahKandidat || "0"} Org</span></div>
                        <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-tighter"><span className="text-slate-400">Biaya Proses:</span><span className="text-indigo-600 text-right">{j.biayaJob || "-"}</span></div>
                     </div>
                     <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4"><p className="text-[8px] font-black text-amber-500 uppercase mb-1.5">Kualifikasi:</p><p className="text-[10px] font-bold text-amber-900 line-clamp-1">{j.syaratKhusus || "-"}</p></div>
                     <div className="bg-slate-50 border border-slate-100 rounded-xl p-4"><p className="text-[8px] font-black text-slate-400 uppercase mb-1.5">Keterangan:</p><p className="text-[10px] font-bold text-slate-800 line-clamp-1">{j.keterangan || "-"}</p></div>
                  </div>
                  <div className="px-8 py-5 bg-slate-50/30 border-t border-slate-100/50 flex justify-between items-center">
                     <button onClick={() => { setSelectedJobDetail(j); setShowDetailModal(true); }} className="flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase tracking-widest">Lihat Detail</button>
                     <div className="flex gap-5">
                        <button onClick={() => handleEdit(j)} className="text-purple-600 font-black text-[10px] uppercase">Edit</button>
                        <button onClick={() => handleDelete(j.id)} className="text-rose-500 font-black text-[10px] uppercase">Hapus</button>
                     </div>
                  </div>
               </div>
             ))}
          </div>
        )}
      </div>

      {showDetailModal && selectedJobDetail && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-md animate-fadeIn font-sans">
           <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden max-h-[95vh] flex flex-col">
              <div className="p-10 overflow-y-auto custom-scrollbar space-y-7">
                 <div className="flex justify-between items-start">
                    <div className="flex gap-2">
                       <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-md text-[10px] font-black uppercase">KODE: {selectedJobDetail.kodeJob || "0"}</span>
                       <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-md text-[10px] font-black uppercase">STATUS: Aktif</span>
                    </div>
                    <button onClick={() => setShowDetailModal(false)} className="text-slate-300 hover:text-slate-800 text-4xl font-light leading-none">&times;</button>
                 </div>
                 <div>
                    <h2 className="text-3xl font-black text-slate-900 uppercase leading-none tracking-tighter">{selectedJobDetail.namaJob}</h2>
                    <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">{selectedJobDetail.kategori || "Semua Non-IJEF"}</p>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-sm"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">PREFEKTUR / DAERAH</p><p className="text-[11px] font-black text-slate-800 uppercase">{selectedJobDetail.lokasi || "Berbagai Prefektur di Jepang"}</p></div>
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-sm"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">GAJI STANDAR / RATE</p><p className="text-[11px] font-black text-orange-600 uppercase italic">{selectedJobDetail.gaji || "-"}</p></div>
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-sm"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">KEBUTUHAN KUOTA</p><p className="text-[11px] font-black text-emerald-600 uppercase">{selectedJobDetail.jumlahKandidat || "1"} Orang Kandidat</p></div>
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-sm"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">JENIS KELAMIN TARGET</p><p className="text-[11px] font-black text-slate-800 uppercase">{selectedJobDetail.jenisKelamin || "0"}</p></div>
                 </div>
                 <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-sm"><p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">TSK / SUMBER JOB PARTNER</p><p className="text-[11px] font-black text-indigo-600 uppercase tracking-widest">{selectedJobDetail.kumiaiPartner || "-"}</p></div>
                 <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">MITRA PERUSAHAAN & KUMIAI</p>
                    <p className="text-[11px] font-black text-slate-800 uppercase">Mitra Perusahaan ({selectedJobDetail.perusahaan || "-"}) • TSK / Sumber: {selectedJobDetail.kumiaiPartner || "-"}</p>
                 </div>
                 <div className="bg-white border border-amber-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-amber-50 px-5 py-2.5 border-b border-amber-100"><p className="text-[9px] font-black text-amber-700 uppercase">KUALIFIKASI PERSYARATAN</p></div>
                    <div className="p-5"><p className="text-[11px] font-black text-amber-900 uppercase leading-relaxed">{selectedJobDetail.syaratKhusus || "-"}</p></div>
                 </div>
                 <div className="bg-white border border-indigo-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-indigo-50 px-5 py-2.5 border-b border-indigo-100"><p className="text-[9px] font-black text-indigo-700 uppercase">BIAYA PROSES & TANGGUNGAN</p></div>
                    <div className="p-5"><p className="text-[11px] font-black text-indigo-900 uppercase leading-relaxed">{selectedJobDetail.biayaJob || "-"}</p></div>
                 </div>
                 <div className="bg-white border border-emerald-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-emerald-50 px-5 py-2.5 border-b border-emerald-100"><p className="text-[9px] font-black text-emerald-700 uppercase">FASILITAS ASRAMA & TUNJANGAN</p></div>
                    <div className="p-5"><p className="text-[11px] font-black text-emerald-900 uppercase leading-relaxed">{selectedJobDetail.benefit || "-"}</p></div>
                 </div>
                 <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-slate-50 px-5 py-2.5 border-b border-slate-100"><p className="text-[9px] font-black text-slate-700 uppercase">KETERANGAN & CATATAN TAMBAHAN</p></div>
                    <div className="p-5"><p className="text-[11px] font-black text-slate-800 uppercase leading-relaxed">{selectedJobDetail.keterangan || "-"}</p></div>
                 </div>
                 <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-200 space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase border-b border-slate-200 pb-3 mb-4 tracking-widest">RINCIAN RINGKASAN LOWONGAN</p>
                    <div className="text-[11px] font-bold text-slate-600 space-y-2 uppercase leading-relaxed font-mono">
                       <p>📌 DETAIL LOWONGAN PEKERJAAN</p>
                       <p>• Posisi / List Job: {selectedJobDetail.namaJob}</p>
                       <p>• Kode Job: {selectedJobDetail.kodeJob || "0"}</p>
                       <p>• Kategori Target: {selectedJobDetail.kategori}</p>
                       <p>• Lokasi / Prefektur: {selectedJobDetail.lokasi}</p>
                       <p>• Target Gender: {selectedJobDetail.jenisKelamin}</p>
                       <p>• Standar Gaji: {selectedJobDetail.gaji}</p>
                       <p>• Kuota Penerimaan: {selectedJobDetail.jumlahKandidat} Orang Candidate</p>
                       <p>• Partner TSK / Sumber: {selectedJobDetail.kumiaiPartner}</p>
                       <p className="mt-4">📑 KUALIFIKASI & PERSYARATAN:</p>
                       <p className="normal-case font-medium">{selectedJobDetail.syaratKhusus}</p>
                       <p className="mt-4">💰 BIAYA PROSES & TANGGUNGAN:</p>
                       <p className="normal-case font-medium">{selectedJobDetail.biayaJob || "-"}</p>
                       <p className="mt-4">🏢 FASILITAS & ASRAMA:</p>
                       <p className="normal-case font-medium">{selectedJobDetail.benefit}</p>
                       <p className="mt-4">ℹ️ KETERANGAN TAMBAHAN:</p>
                       <p className="normal-case font-medium">{selectedJobDetail.keterangan}</p>
                    </div>
                 </div>
              </div>
              <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                 <button onClick={() => setShowDetailModal(false)} className="bg-[#0F172A] text-white px-10 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest">Tutup Detail</button>
              </div>
           </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn font-sans">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl overflow-hidden max-h-[95vh] flex flex-col">
            <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-white">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{editingJob ? "UPDATE DATA LOWONGAN" : "ENTRY DATA LOWONGAN"}</h3>
              <button onClick={closeModal} className="text-slate-300 hover:text-slate-800 text-3xl font-light transition-all">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="overflow-y-auto p-10 custom-scrollbar space-y-12">
               <div className="p-8 border-2 border-slate-50 rounded-[2.5rem] space-y-8">
                  <h4 className="text-xs font-black text-indigo-700 uppercase tracking-[0.2em] border-b border-slate-100 pb-3 flex items-center gap-2">
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                     INFORMASI DASAR & LOKASI
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                     <div><label className="text-[10px] font-black uppercase text-slate-800 tracking-widest block mb-2">Kode Lowongan</label><input className="input-field h-12 bg-white border border-slate-200 font-bold rounded-xl px-4" value={formData.kodeJob} onChange={(e) => setFormData({...formData, kodeJob: e.target.value})} placeholder="Contoh: INTL015 / IND012" /></div>
                     <div><label className="text-[10px] font-black uppercase text-slate-800 tracking-widest block mb-2">Status Lowongan</label><select className="input-field h-12 bg-white border border-slate-200 font-bold rounded-xl px-4" value={formData.statusJob} onChange={(e) => setFormData({...formData, statusJob: e.target.value})}><option value="Open">Aktif (OPEN)</option><option value="Closed">Tutup (CLOSED)</option></select></div>
                     <div><label className="text-[10px] font-black uppercase text-slate-800 tracking-widest block mb-2">Prefektur / Lokasi</label><input className="input-field h-12 bg-white border border-slate-200 font-bold rounded-xl px-4" value={formData.lokasi} onChange={(e) => setFormData({...formData, lokasi: e.target.value})} placeholder="Tokyo" required /></div>
                     <div className="md:col-span-3"><label className="text-[10px] font-black uppercase text-slate-800 tracking-widest block mb-2">Nama Lowongan / Judul Job</label><input className="input-field h-14 bg-white border border-slate-200 font-bold rounded-xl text-lg uppercase px-6" value={formData.namaJob} onChange={(e) => setFormData({...formData, namaJob: e.target.value})} placeholder="Contoh: KAIGO 介護 (Perawat Lansia) / PETERNAKAN SAPI (畜産業)" required /></div>
                     <div><label className="text-[10px] font-black uppercase text-slate-800 tracking-widest block mb-2">Nama Perusahaan</label><input className="input-field h-12 bg-white border border-slate-200 font-bold rounded-xl px-4" value={formData.perusahaan} onChange={(e) => setFormData({...formData, perusahaan: e.target.value})} placeholder="Contoh: GN / Kaisha Japan Co., Ltd" /></div>
                     <div><label className="text-[10px] font-black uppercase text-slate-800 tracking-widest block mb-2">Gaji (Bulan/Tahun)</label><input className="input-field h-12 bg-white border border-slate-200 font-black rounded-xl px-4 text-orange-600" value={formData.gaji} onChange={(e) => setFormData({...formData, gaji: e.target.value})} placeholder="210.000円/bulan" /></div>
                     <div><label className="text-[10px] font-black uppercase text-slate-800 tracking-widest block mb-2">Kumiai / TSK Partner Rujukan</label><input className="input-field h-12 bg-white border border-slate-200 font-bold rounded-xl px-4" value={formData.kumiaiPartner} onChange={(e) => setFormData({...formData, kumiaiPartner: e.target.value})} placeholder="Contoh: Hibiki / Enlink / Marta Kumiai" /></div>
                  </div>
               </div>

               {/* 2. KLASIFIKASI & PERSYARATAN KANDIDAT */}
               <div className="p-8 border-2 border-slate-50 rounded-[2.5rem] space-y-8">
                  <h4 className="text-xs font-black text-purple-700 uppercase tracking-[0.2em] border-b border-slate-100 pb-3 flex items-center gap-2">
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                     KLASIFIKASI & PERSYARATAN KANDIDAT
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                     <div><label className="text-[10px] font-black uppercase text-slate-800 tracking-widest block mb-2">Klasifikasi Target Kandidat</label><select className="input-field h-12 bg-white border border-slate-200 font-bold rounded-xl px-4" value={formData.klasifikasiKandidat} onChange={(e) => setFormData({...formData, klasifikasiKandidat: e.target.value})}><option value="SISWA NON IJEF : NEW COMER">SISWA NON IJEF (New Comer)</option><option value="SISWA MATCHING JOB : EX-MAGANG">SISWA MATCHING (EX-MAGANG)</option><option value="SISWA MATCHING JOB : ENGINEERING">SISWA MATCHING (ENGINEERING)</option></select></div>
                     <div><label className="text-[10px] font-black uppercase text-slate-800 tracking-widest block mb-2">Gender / Jenis Kelamin</label><select className="input-field h-12 bg-white border border-slate-200 font-bold rounded-xl px-4" value={formData.jenisKelamin} onChange={(e) => setFormData({...formData, jenisKelamin: e.target.value})}><option value="Pria & Wanita">Pria & Wanita (男女)</option><option value="Pria">Pria (男)</option><option value="Wanita">Wanita (女)</option></select></div>
                     <div><label className="text-[10px] font-black uppercase text-slate-800 tracking-widest block mb-2">Kuota / Jumlah Kebutuhan</label><input className="input-field h-12 bg-white border border-slate-200 font-black rounded-xl px-4 text-emerald-600" value={formData.jumlahKandidat} onChange={(e) => setFormData({...formData, jumlahKandidat: e.target.value})} placeholder="5" /></div>
                  </div>
                  <div className="md:col-span-3"><label className="text-[10px] font-black uppercase text-slate-800 tracking-widest block mb-2">Kualifikasi & Syarat Khusus (JLPT, SSW, Usia, Pengalaman)</label><textarea className="input-field bg-white border border-slate-200 font-medium p-4 rounded-xl text-sm" rows="3" value={formData.syaratKhusus} onChange={(e) => setFormData({...formData, syaratKhusus: e.target.value})} placeholder="JLPT N4 / JFT-Basic A2 + SSW" /></div>
               </div>

               {/* 3. INFORMASI BIAYA & FASILITAS */}
               <div className="p-8 border-2 border-slate-50 rounded-[2.5rem] space-y-8">
                  <h4 className="text-xs font-black text-emerald-700 uppercase tracking-[0.2em] border-b border-slate-100 pb-3 flex items-center gap-2">
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                     INFORMASI BIAYA & FASILITAS
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div><label className="text-[10px] font-black uppercase text-slate-800 tracking-widest block mb-2">Biaya Job / Proses & Tanggungan</label><textarea className="input-field bg-white border border-slate-200 font-medium p-4 rounded-xl text-xs" rows="2" value={formData.biayaJob} onChange={(e) => setFormData({...formData, biayaJob: e.target.value})} placeholder="Sesuai Ketentuan" /></div>
                     <div><label className="text-[10px] font-black uppercase text-slate-800 tracking-widest block mb-2">Fasilitas Asrama & Benefit</label><textarea className="input-field bg-white border border-slate-200 font-medium p-4 rounded-xl text-xs" rows="2" value={formData.benefit} onChange={(e) => setFormData({...formData, benefit: e.target.value})} placeholder="Asrama fully furnished, subsidi listrik." /></div>
                  </div>
                  <div className="md:col-span-2">
                     <label className="text-[10px] font-black uppercase text-slate-800 tracking-widest block mb-2">Deskripsi Pekerjaan & Tugas Harian</label>
                     <textarea className="input-field bg-white border border-slate-200 font-medium p-6 rounded-xl text-sm leading-relaxed" rows="4" value={formData.deskripsiPekerjaan} onChange={(e) => setFormData({...formData, deskripsiPekerjaan: e.target.value})} placeholder="Contoh: • Berdomisili di Jepang / Indonesia • Dapat mulai bekerja 1 September 2026 • Memiliki pengalaman Kaigo minimal 1 tahun • Bersedia merawat pengguna layanan dengan disabilitas" />
                  </div>
                  <div className="md:col-span-2">
                     <label className="text-[10px] font-black uppercase text-slate-800 tracking-widest block mb-2">Keterangan Tambahan / Syarat Khusus</label>
                     <textarea className="input-field bg-white border border-slate-200 font-medium p-6 rounded-xl text-sm leading-relaxed" rows="3" value={formData.keterangan} onChange={(e) => setFormData({...formData, keterangan: e.target.value})} placeholder="Contoh: Penerbangan dari Jakarta / Wawancara 3x via Zoom / Catatan khusus" />
                  </div>
               </div>

               <div className="flex gap-4 justify-end pt-10 border-t border-slate-50">
                  <button type="button" onClick={closeModal} className="px-10 py-4 font-black text-slate-400 uppercase text-[10px] tracking-widest border border-slate-200 rounded-xl hover:bg-slate-50 transition-all">BATAL</button>
                  <button type="submit" className="bg-[#0F172A] text-white px-16 py-4 rounded-xl font-black shadow-2xl hover:bg-slate-800 transition-all uppercase text-[10px] tracking-widest flex items-center gap-2" disabled={submitting}>
                    {submitting ? "SIMPAN..." : <><svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> SIMPAN DATA LOWONGAN</>}
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #CBD5E1; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </>
  );
}
