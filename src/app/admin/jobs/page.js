"use client";
import { useState, useEffect, useRef } from "react";
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
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setJobs(data);
    } catch (err) {
      console.error("Error loading jobs:", err);
    }
    setLoading(false);
  };

  const handleImportGoogleSheets = async () => {
    if (!window.confirm("Import data job dari Google Sheets? Data dengan Kode Job yang sama akan diupdate.")) return;
    setImporting(true);
    try {
      const sheetId = "1P2P6Z_-11udONGzjSDIBVcX-OfnT8jeUwAPYL-p12yY";
      const gid = "1920132706"; // LIST JOB AVAILABLE
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;

      const response = await fetch(csvUrl);
      if (!response.ok) throw new Error("Gagal mengambil data. Pastikan link publik.");
      const csvText = await response.text();

      const parseCSV = (text) => {
        const rows = [];
        let currentRow = [];
        let currentCell = "";
        let inQuotes = false;
        for (let i = 0; i < text.length; i++) {
          const char = text[i];
          if (char === '"') {
            if (inQuotes && text[i+1] === '"') { currentCell += '"'; i++; }
            else { inQuotes = !inQuotes; }
          } else if (char === "," && !inQuotes) { currentRow.push(currentCell); currentCell = ""; }
          else if ((char === "\n" || char === "\r") && !inQuotes) {
            if (char === "\r" && text[i+1] === "\n") i++;
            currentRow.push(currentCell); rows.push(currentRow);
            currentRow = []; currentCell = "";
          } else { currentCell += char; }
        }
        if (currentRow.length > 0 || currentCell !== "") { currentRow.push(currentCell); rows.push(currentRow); }
        return rows;
      };

      const rows = parseCSV(csvText).filter(r => r.length > 1 && r.some(c => c.trim() !== ""));
      if (rows.length < 2) throw new Error("Sheet kosong atau format tidak valid.");

      const headers = rows[0].map(h => h.trim().toUpperCase());
      const dataRows = rows.slice(1);

      const getIdx = (keywords) => headers.findIndex(h => keywords.some(k => h.includes(k)));
      const colMap = {
        status: getIdx(["STATUS"]),
        listJob: getIdx(["LIST JOB"]),
        daerah: getIdx(["DAERAH"]),
        kodeJob: getIdx(["KODE JOB"]),
        gender: getIdx(["JENIS KELAMIN"]),
        gaji: getIdx(["GAJI"]),
        kuota: getIdx(["KANDIDAT", "DIBUTUHKAN"]),
        kualifikasi: getIdx(["KUALIFIKASI"]),
        biaya: getIdx(["BIAYA"]),
        keterangan: getIdx(["KETERANGAN"]),
        sumber: getIdx(["TSK", "SUMBER"]),
      };

      const jobsSnap = await getDocs(collection(db, "jobs"));
      const existingMap = {};
      jobsSnap.docs.forEach(doc => { if (doc.data().kodeJob) existingMap[doc.data().kodeJob] = doc.id; });

      let count = 0;
      for (const row of dataRows) {
        const val = (idx) => (idx !== -1 && row[idx] !== undefined) ? String(row[idx]).trim() : "";
        const kode = val(colMap.kodeJob);
        if (!kode || kode === "KODE JOB") continue;

        const jobData = {
          statusJob: val(colMap.status) || "Open",
          namaJob: val(colMap.listJob),
          lokasi: val(colMap.daerah),
          kodeJob: kode,
          jenisKelamin: val(colMap.gender),
          gaji: val(colMap.gaji),
          jumlahKandidat: val(colMap.kuota),
          klasifikasiKandidat: val(colMap.kualifikasi),
          deskripsiPekerjaan: val(colMap.kualifikasi),
          biayaJob: val(colMap.biaya),
          keterangan: val(colMap.keterangan),
          sumberJob: val(colMap.sumber),
          perusahaan: val(colMap.sumber),
          bidang: val(colMap.listJob),
          kategori: kode.toUpperCase().startsWith("IND") ? "ENGINEERING" : "SSW",
          updatedAt: new Date().toISOString()
        };

        Object.keys(jobData).forEach(k => { if (jobData[k] === undefined) jobData[k] = ""; });

        const existingId = existingMap[kode];
        if (existingId) {
          await updateDoc(doc(db, "jobs", existingId), jobData);
        } else {
          await addDoc(collection(db, "jobs"), { ...jobData, createdAt: new Date().toISOString() });
        }
        count++;
      }

      alert(`Berhasil impor ${count} data job.`);
      loadJobs();
    } catch (err) {
      alert("Gagal impor: " + err.message);
    }
    setImporting(false);
  };

  const handleResetAll = async () => {
    if (!window.confirm("PERINGATAN: Ini akan menghapus SEMUA data job secara permanen. Lanjutkan?")) return;
    setReseting(true);
    try {
      const snapshot = await getDocs(collection(db, "jobs"));
      for (const d of snapshot.docs) {
        await deleteDoc(doc(db, "jobs", d.id));
      }
      alert("Semua data job telah berhasil dihapus.");
      loadJobs();
    } catch (err) {
      alert("Gagal reset: " + err.message);
    }
    setReseting(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const storagePath = `jobs/attachments/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        setUploadProgress(pct);
      },
      (err) => {
        setUploading(false);
        alert("Upload gagal: " + err.message);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        setFormData(prev => ({ ...prev, fileUrl: downloadURL }));
        setUploading(false);
        setUploadProgress(0);
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const dataToSave = {
        ...formData,
        updatedAt: new Date().toISOString()
      };

      if (editingJob) {
        await updateDoc(doc(db, "jobs", editingJob.id), dataToSave);
      } else {
        await addDoc(collection(db, "jobs"), {
          ...dataToSave,
          createdAt: new Date().toISOString()
        });
      }

      closeModal();
      loadJobs();
    } catch (err) {
      alert("Gagal menyimpan data: " + err.message);
    }
    setSubmitting(false);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingJob(null);
    setFormData({
      kodeJob: "",
      namaJob: "",
      perusahaan: "",
      lokasi: "",
      bidang: "",
      kategori: "",
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
    });
  };

  const handleEdit = (job) => {
    setEditingJob(job);
    setFormData({
      kodeJob: job.kodeJob || "",
      namaJob: job.namaJob || "",
      perusahaan: job.perusahaan || "",
      lokasi: job.lokasi || "",
      bidang: job.bidang || "",
      kategori: job.kategori || "",
      gaji: job.gaji || "",
      keterangan: job.keterangan || "",
      benefit: job.benefit || "",
      klasifikasiKandidat: job.klasifikasiKandidat || "",
      deskripsiPekerjaan: job.deskripsiPekerjaan || "",
      statusJob: job.statusJob || "Open",
      domisiliKerja: job.domisiliKerja || "",
      fileUrl: job.fileUrl || "",
      biayaJob: job.biayaJob || "",
      skemaPembayaran: job.skemaPembayaran || "",
      benefitBiaya: job.benefitBiaya || "",
      sumberJob: job.sumberJob || "",
      usiaMax: job.usiaMax || "",
      jenisKelamin: job.jenisKelamin || "Pria & Wanita",
      jumlahKandidat: job.jumlahKandidat || "",
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Hapus job ini?")) return;
    try {
      await deleteDoc(doc(db, "jobs", id));
      loadJobs();
    } catch (err) {
      alert("Gagal menghapus: " + err.message);
    }
  };

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <>
      <Navbar />
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Manajemen Job Center</h1>
            <p className="text-gray-500 text-sm">Kelola katalog lowongan pekerjaan dan kriteria pendaftaran</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button
              onClick={handleResetAll}
              disabled={reseting || importing}
              className="bg-red-50 text-red-600 px-4 py-2.5 rounded-xl font-bold hover:bg-red-100 transition-all text-xs"
            >
              {reseting ? "Resetting..." : "Reset Semua"}
            </button>
            <button
              onClick={handleImportGoogleSheets}
              disabled={importing}
              className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center gap-2 text-xs"
            >
              {importing ? (
                <div className="animate-spin h-4 w-4 border-b-2 border-white rounded-full"></div>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              )}
              Import Sheets
            </button>
            <button
              onClick={() => { closeModal(); setShowModal(true); }}
              className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2 text-xs"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
              Tambah Lowongan
            </button>
          </div>
        </div>

        <div className="card overflow-hidden !p-0 border border-gray-100 shadow-xl rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="py-4 px-4 font-black uppercase tracking-widest text-[10px]">Kode</th>
                  <th className="py-4 px-4 font-black uppercase tracking-widest text-[10px]">Nama Lowongan</th>
                  <th className="py-4 px-4 font-black uppercase tracking-widest text-[10px]">Perusahaan & Lokasi</th>
                  <th className="py-4 px-4 font-black uppercase tracking-widest text-[10px]">Sektor</th>
                  <th className="py-4 px-4 font-black uppercase tracking-widest text-[10px]">Gaji</th>
                  <th className="py-4 px-4 font-black uppercase tracking-widest text-[10px]">Status</th>
                  <th className="py-4 px-4 font-black uppercase tracking-widest text-[10px] text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {jobs.map((j) => (
                  <tr key={j.id} className="hover:bg-indigo-50/30 transition-colors cursor-pointer group" onClick={() => {
                    setSelectedJobDetail(j);
                    setShowDetailModal(true);
                  }}>
                    <td className="py-4 px-4 font-bold text-indigo-600 group-hover:underline">{j.kodeJob || "N/A"}</td>
                    <td className="py-4 px-4">
                      <div className="font-black text-gray-800 uppercase text-xs group-hover:text-indigo-600 transition-colors">{j.namaJob}</div>
                      <div className="text-[10px] text-gray-400 font-bold mt-0.5">{j.kategori}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-bold text-gray-700">{j.perusahaan}</div>
                      <div className="text-[10px] text-gray-400 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                        {j.lokasi}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[9px] font-black uppercase">{j.bidang}</span>
                    </td>
                    <td className="py-4 px-4 font-black text-emerald-600 text-xs">
                      {j.gaji || "-"}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border ${
                        j.statusJob === "Open" || j.statusJob === "OPEN" || j.statusJob === "クローズ" ? "bg-green-50 text-green-600 border-green-100" : "bg-rose-50 text-rose-600 border-rose-100"
                      }`}>
                        {j.statusJob}
                      </span>
                    </td>
                    <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => { setSelectedJobDetail(j); setShowDetailModal(true); }}
                          className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                          title="Lihat Detail"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                        <button onClick={() => handleEdit(j)} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button onClick={() => handleDelete(j.id)} className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {jobs.length === 0 && (
                  <tr>
                    <td colSpan="7" className="py-24 text-center">
                       <div className="mb-4 inline-block p-4 bg-slate-50 rounded-full text-slate-300">
                          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                       </div>
                       <h3 className="text-slate-800 font-black uppercase tracking-tight">Katalog Kosong</h3>
                       <p className="text-slate-400 text-xs mt-1">Belum ada daftar lowongan. Klik tombol di atas untuk membuat.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showDetailModal && selectedJobDetail && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Detail Lowongan</span>
                <h3 className="text-xl font-black uppercase tracking-tight">{selectedJobDetail.namaJob}</h3>
              </div>
              <button onClick={() => { setShowDetailModal(false); setSelectedJobDetail(null); }} className="p-2 hover:bg-white/20 rounded-full transition-colors text-white">&times;</button>
            </div>

            <div className="overflow-y-auto p-8 custom-scrollbar space-y-8">
              {/* Header Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Kode Job</p>
                  <p className="font-bold text-indigo-600">{selectedJobDetail.kodeJob || "-"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Status</p>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${selectedJobDetail.statusJob === "Open" || selectedJobDetail.statusJob === "OPEN" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {selectedJobDetail.statusJob || "Open"}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Sektor</p>
                  <p className="font-bold text-slate-700">{selectedJobDetail.bidang || "-"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Kategori</p>
                  <p className="font-bold text-slate-700">{selectedJobDetail.kategori || "-"}</p>
                </div>
              </div>

              {/* Main Content */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                    <h4 className="text-xs font-black text-slate-800 uppercase flex items-center gap-2">
                      <div className="w-1 h-3 bg-indigo-500 rounded-full"></div>
                      Informasi Penempatan
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between border-b border-slate-100 pb-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Perusahaan</span>
                        <span className="text-xs font-black text-slate-700">{selectedJobDetail?.perusahaan || "-"}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Prefektur</span>
                        <span className="text-xs font-black text-slate-700">{selectedJobDetail?.lokasi || "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Domisili</span>
                        <span className="text-xs font-black text-slate-700">{selectedJobDetail?.domisiliKerja || "-"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-4">
                    <h4 className="text-xs font-black text-emerald-800 uppercase flex items-center gap-2">
                      <div className="w-1 h-3 bg-emerald-500 rounded-full"></div>
                      Financial & Benefit
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between border-b border-emerald-100/50 pb-2">
                        <span className="text-[10px] font-bold text-emerald-600/60 uppercase">Gaji Pokok</span>
                        <span className="text-xs font-black text-emerald-700">{selectedJobDetail.gaji || "-"}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-emerald-600/60 uppercase">Benefit/Fasilitas</span>
                        <p className="text-[11px] font-medium text-slate-600 leading-relaxed whitespace-pre-line">{selectedJobDetail.benefit || "-"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-4">
                    <h4 className="text-xs font-black text-indigo-800 uppercase flex items-center gap-2">
                      <div className="w-1 h-3 bg-indigo-500 rounded-full"></div>
                      Kriteria Kandidat
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-indigo-400 uppercase">Usia Max</p>
                        <p className="text-xs font-black text-slate-700">{selectedJobDetail.usiaMax || "-"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-indigo-400 uppercase">Gender</p>
                        <p className="text-xs font-black text-slate-700">{selectedJobDetail.jenisKelamin || "-"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-indigo-400 uppercase">Kuota</p>
                        <p className="text-xs font-black text-slate-700">{selectedJobDetail.jumlahKandidat || "-"} Orang</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-indigo-400 uppercase">Target</p>
                        <p className="text-xs font-black text-slate-700 line-clamp-1">{selectedJobDetail.klasifikasiKandidat || "-"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                    <h4 className="text-xs font-black text-slate-800 uppercase">Administrasi & File</h4>
                    <div className="space-y-2">
                       <div className="flex justify-between text-[11px]">
                          <span className="text-slate-400">Biaya Proses:</span>
                          <span className="font-bold text-rose-600">{selectedJobDetail.biayaJob || "-"}</span>
                       </div>
                       {selectedJobDetail.fileUrl ? (
                         <a href={selectedJobDetail.fileUrl} target="_blank" className="flex items-center justify-center gap-2 w-full py-2 bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all mt-2">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                            Lihat Dokumen Job
                         </a>
                       ) : (
                         <div className="text-[10px] text-slate-400 italic text-center py-2 border border-dashed border-slate-200 rounded-xl mt-2">Tidak ada lampiran file</div>
                       )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Descriptions Section */}
              <div className="space-y-6 pt-6 border-t border-slate-50">
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-800 uppercase">Kualifikasi & Deskripsi Pekerjaan</h4>
                  <div className="p-5 bg-slate-50 rounded-2xl text-[13px] leading-relaxed text-slate-600 whitespace-pre-line border border-slate-100">
                    {selectedJobDetail.deskripsiPekerjaan || selectedJobDetail.klasifikasiKandidat || "Tidak ada deskripsi detail."}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-800 uppercase">Keterangan Tambahan</h4>
                  <div className="p-5 bg-indigo-50/30 rounded-2xl text-[13px] leading-relaxed text-slate-600 whitespace-pre-line border border-indigo-50/50">
                    {selectedJobDetail.keterangan || "Tidak ada keterangan tambahan."}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button onClick={() => { setShowDetailModal(false); setSelectedJobDetail(null); }} className="px-8 py-2.5 bg-slate-800 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-700 transition-all">
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      ))}

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center shrink-0 bg-slate-50">
              <div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">{editingJob ? "Update Data Lowongan" : "Entry Lowongan Baru"}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Sistem Katalog Job Matching IJEF</p>
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-slate-800">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto p-8 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Basic Info Section */}
                <div className="space-y-4">
                   <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-4">Informasi Dasar & Lokasi</h4>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="form-label text-[10px] font-black uppercase text-slate-400">Kode Lowongan</label>
                        <input className="input-field bg-slate-50 border-none font-bold" value={formData.kodeJob} onChange={(e) => setFormData({...formData, kodeJob: e.target.value})} required placeholder="Contoh: IJEF-001" />
                      </div>
                      <div>
                        <label className="form-label text-[10px] font-black uppercase text-slate-400">Status Lowongan</label>
                        <select className="input-field bg-slate-50 border-none font-bold" value={formData.statusJob} onChange={(e) => setFormData({...formData, statusJob: e.target.value})}>
                          <option value="Open">OPEN</option>
                          <option value="Closed">CLOSED</option>
                          <option value="Full">FULL / PENUH</option>
                          <option value="クローズ">クローズ (CLOSED)</option>
                        </select>
                      </div>
                   </div>
                   <div>
                      <label className="form-label text-[10px] font-black uppercase text-slate-400">Nama Lowongan / Judul Job</label>
                      <input className="input-field bg-slate-50 border-none font-bold" value={formData.namaJob} onChange={(e) => setFormData({...formData, namaJob: e.target.value})} required placeholder="Contoh: Perawat Lansia (Kaigo)" />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="form-label text-[10px] font-black uppercase text-slate-400">Nama Perusahaan</label>
                        <input className="input-field bg-slate-50 border-none font-bold" value={formData.perusahaan} onChange={(e) => setFormData({...formData, perusahaan: e.target.value})} required placeholder="Nama PT / Kumiai" />
                      </div>
                      <div>
                        <label className="form-label text-[10px] font-black uppercase text-slate-400">Gaji (Bulan/Tahun)</label>
                        <input className="input-field bg-slate-50 border-none font-bold" value={formData.gaji} onChange={(e) => setFormData({...formData, gaji: e.target.value})} placeholder="Contoh: ¥180.000 / bln" />
                      </div>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="form-label text-[10px] font-black uppercase text-slate-400">Prefektur / Lokasi</label>
                        <input className="input-field bg-slate-50 border-none font-bold" value={formData.lokasi} onChange={(e) => setFormData({...formData, lokasi: e.target.value})} required placeholder="Contoh: Tokyo, Japan" />
                      </div>
                      <div>
                        <label className="form-label text-[10px] font-black uppercase text-slate-400">Domisili Kerja</label>
                        <input className="input-field bg-slate-50 border-none font-bold" value={formData.domisiliKerja} onChange={(e) => setFormData({...formData, domisiliKerja: e.target.value})} placeholder="Contoh: Kawasan Industri Chiba" />
                      </div>
                   </div>
                </div>

                {/* Classification & Details Section */}
                <div className="space-y-4">
                   <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-4">Klasifikasi & Dokumen</h4>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="form-label text-[10px] font-black uppercase text-slate-400">Sektor / Bidang</label>
                        <input className="input-field bg-slate-50 border-none font-bold" value={formData.bidang} onChange={(e) => setFormData({...formData, bidang: e.target.value})} placeholder="KAIGO, PM, dll" />
                      </div>
                      <div>
                        <label className="form-label text-[10px] font-black uppercase text-slate-400">Klasifikasi Kandidat</label>
                        <input className="input-field bg-slate-50 border-none font-bold" value={formData.klasifikasiKandidat} onChange={(e) => setFormData({...formData, klasifikasiKandidat: e.target.value})} placeholder="Ex-Magang, New Comer, dll" />
                      </div>
                   </div>
                   <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="form-label text-[10px] font-black uppercase text-slate-400">Usia Max</label>
                        <input className="input-field bg-slate-50 border-none font-bold" value={formData.usiaMax} onChange={(e) => setFormData({...formData, usiaMax: e.target.value})} placeholder="Contoh: 35 Thn" />
                      </div>
                      <div>
                        <label className="form-label text-[10px] font-black uppercase text-slate-400">Gender</label>
                        <select className="input-field bg-slate-50 border-none font-bold text-xs" value={formData.jenisKelamin} onChange={(e) => setFormData({...formData, jenisKelamin: e.target.value})}>
                          <option value="Pria & Wanita">Pria & Wanita</option>
                          <option value="Pria Saja">Pria Saja</option>
                          <option value="Wanita Saja">Wanita Saja</option>
                        </select>
                      </div>
                      <div>
                        <label className="form-label text-[10px] font-black uppercase text-slate-400">Kuota</label>
                        <input className="input-field bg-slate-50 border-none font-bold" value={formData.jumlahKandidat} onChange={(e) => setFormData({...formData, jumlahKandidat: e.target.value})} placeholder="Jml Orang" />
                      </div>
                   </div>
                   <div>
                      <label className="form-label text-[10px] font-black uppercase text-slate-400">Upload File Pendukung (PDF/IMG/DOC)</label>
                      <div className="flex gap-2">
                         <button
                            type="button"
                            onClick={() => fileInputRef.current.click()}
                            className="bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-700 disabled:opacity-50 flex items-center gap-2"
                            disabled={uploading}
                         >
                            {uploading ? "Uploading..." : "Pilih File"}
                         </button>
                         <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" />
                         {formData.fileUrl && (
                           <div className="flex-grow flex items-center justify-between bg-emerald-50 px-3 rounded-xl border border-emerald-100 overflow-hidden">
                              <span className="text-[10px] font-bold text-emerald-600 truncate max-w-[150px]">File Terlampir ✓</span>
                              <a href={formData.fileUrl} target="_blank" className="text-[10px] font-black text-emerald-700 underline">LIHAT</a>
                           </div>
                         )}
                      </div>
                      {uploading && (
                        <div className="w-full bg-slate-100 h-1 mt-2 rounded-full overflow-hidden">
                           <div className="h-full bg-indigo-500 transition-all" style={{ width: `${uploadProgress}%` }}></div>
                        </div>
                      )}
                   </div>
                   <div>
                      <label className="form-label text-[10px] font-black uppercase text-slate-400">Fasilitas / Benefit</label>
                      <textarea className="input-field bg-slate-50 border-none font-bold text-xs" rows="3" value={formData.benefit} onChange={(e) => setFormData({...formData, benefit: e.target.value})} placeholder="Asrama, Transportasi, Lembur, dll" />
                   </div>
                </div>

                <div className="md:col-span-2 space-y-4 pt-4 border-t border-slate-50">
                   <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-4">Informasi Biaya & Sumber</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="form-label text-[10px] font-black uppercase text-slate-400">Biaya Job</label>
                        <input className="input-field bg-slate-50 border-none font-bold text-xs" value={formData.biayaJob} onChange={(e) => setFormData({...formData, biayaJob: e.target.value})} placeholder="Contoh: Rp 5.000.000" />
                      </div>
                      <div>
                        <label className="form-label text-[10px] font-black uppercase text-slate-400">Skema Pembayaran</label>
                        <input className="input-field bg-slate-50 border-none font-bold text-xs" value={formData.skemaPembayaran} onChange={(e) => setFormData({...formData, skemaPembayaran: e.target.value})} placeholder="Potong Gaji / Cash" />
                      </div>
                      <div>
                        <label className="form-label text-[10px] font-black uppercase text-slate-400">Benefit Biaya</label>
                        <input className="input-field bg-slate-50 border-none font-bold text-xs" value={formData.benefitBiaya} onChange={(e) => setFormData({...formData, benefitBiaya: e.target.value})} placeholder="Free Tiket, dll" />
                      </div>
                      <div>
                        <label className="form-label text-[10px] font-black uppercase text-slate-400">Sumber Job</label>
                        <input className="input-field bg-slate-50 border-none font-bold text-xs" value={formData.sumberJob} onChange={(e) => setFormData({...formData, sumberJob: e.target.value})} placeholder="Nama Agen / TSK" />
                      </div>
                   </div>
                </div>

                {/* Descriptions Section */}
                <div className="md:col-span-2 space-y-4 pt-4 border-t border-slate-50">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="form-label text-[10px] font-black uppercase text-slate-400">Deskripsi Pekerjaan</label>
                        <textarea className="input-field bg-slate-50 border-none font-bold text-xs" rows="4" value={formData.deskripsiPekerjaan} onChange={(e) => setFormData({...formData, deskripsiPekerjaan: e.target.value})} placeholder="Uraian tugas harian di tempat kerja..." />
                      </div>
                      <div>
                        <label className="form-label text-[10px] font-black uppercase text-slate-400">Keterangan Tambahan / Syarat Khusus</label>
                        <textarea className="input-field bg-slate-50 border-none font-bold text-xs" rows="4" value={formData.keterangan} onChange={(e) => setFormData({...formData, keterangan: e.target.value})} placeholder="Tinggi badan min. 165cm, Tidak buta warna, dll" />
                      </div>
                   </div>
                </div>

              </div>

              <div className="flex gap-3 justify-end pt-8 pb-4">
                <button type="button" onClick={closeModal} className="px-6 py-2.5 rounded-xl font-bold text-slate-400 hover:bg-slate-50 transition-all uppercase text-xs tracking-widest">Batal</button>
                <button type="submit" className="bg-slate-900 text-white px-10 py-2.5 rounded-xl font-black shadow-xl shadow-slate-200 hover:bg-indigo-600 transition-all uppercase text-xs tracking-widest" disabled={submitting || uploading}>
                  {submitting ? "Processing..." : "Simpan Data Lowongan"}
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
        .card { animation: fadeIn 0.3s ease-out forwards; }
      `}</style>
    </>
  );
}
