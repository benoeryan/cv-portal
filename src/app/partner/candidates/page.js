"use client";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, query, where, orderBy, doc, getDoc } from "firebase/firestore";
import Navbar from "@/components/Navbar";
import DriveImage from "@/components/DriveImage";

export default function PartnerCandidateSearchPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBidang, setFilterBidang] = useState("");

  // Request Flow State
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [myJobs, setMyJobs] = useState([]);
  const [requestData, setRequestData] = useState({ jobId: "", jobTitle: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || userData?.role !== "partner")) {
      router.push("/");
      return;
    }
    if (user && userData?.role === "partner") {
      loadCandidates();
      loadMyJobs();
    }
  }, [user, userData, authLoading]);

  const loadCandidates = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "candidates"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(c => {
          // Candidates with SSW and available status
          const hasSSW = (c.sertifikatSSW && c.sertifikatSSW.includes("http")) ||
                         (c.sertifikatSSW2 && c.sertifikatSSW2.includes("http"));
          const isAvailable = !c.statusProgres || c.statusProgres === "Pending Nunggu Job";
          return hasSSW && isAvailable;
        });
      setCandidates(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const loadMyJobs = async () => {
    try {
      const q = query(collection(db, "jobs"), where("createdBy", "==", user.uid));
      const snap = await getDocs(q);
      setMyJobs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!requestData.jobId) { alert("Pilih job terlebih dahulu!"); return; }

    setSubmitting(true);
    try {
      const selectedJob = myJobs.find(j => j.id === requestData.jobId);
      await addDoc(collection(db, "requests"), {
        studentId: selectedStudent.id,
        studentName: selectedStudent.namaLengkap,
        partnerId: user.uid,
        partnerName: userData.fullName,
        jobId: selectedJob.id,
        jobTitle: selectedJob.namaJob,
        notes: requestData.notes,
        status: "Pending",
        createdAt: new Date().toISOString(),
      });
      alert("Request siswa berhasil diajukan ke admin!");
      setShowRequestModal(false);
      setRequestData({ jobId: "", jobTitle: "", notes: "" });
    } catch (err) { alert(err.message); }
    setSubmitting(false);
  };

  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      const matchSearch = !searchTerm || c.namaLengkap?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchBidang = !filterBidang || c.bidangKerja === filterBidang;
      return matchSearch && matchBidang;
    });
  }, [candidates, searchTerm, filterBidang]);

  const uniqueBidang = [...new Set(candidates.map(c => c.bidangKerja).filter(Boolean))].sort();

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-gray-800 tracking-tight uppercase">Pencarian Siswa Ready Job</h1>
            <p className="text-gray-500 text-sm">List siswa yang sudah memiliki sertifikat SSW & siap disalurkan</p>
          </div>
          <div className="bg-purple-50 text-purple-700 px-4 py-2 rounded-xl text-xs font-black border border-purple-100 uppercase tracking-widest">
            {candidates.length} Siswa Siap Kerja
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="md:col-span-2 relative">
             <input className="input-field pl-10" placeholder="Cari nama siswa..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
             <svg className="w-5 h-5 absolute left-3 top-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <select className="input-field" value={filterBidang} onChange={(e) => setFilterBidang(e.target.value)}>
            <option value="">Semua Bidang Kerja</option>
            {uniqueBidang.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredCandidates.map((c) => (
            <div key={c.id} className="card group hover:border-purple-600 transition-all duration-300 flex flex-col h-full bg-white border-2 border-gray-50 shadow-sm hover:shadow-xl rounded-3xl p-6">
              <div className="flex gap-6 mb-6">
                 <div className="relative w-24 h-32 rounded-2xl overflow-hidden bg-slate-100 shrink-0 shadow-md">
                    <DriveImage url={c.pasPhoto} alt={c.namaLengkap} />
                 </div>
                 <div className="min-w-0 flex-grow">
                    <div className="flex justify-between items-start mb-1">
                       <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest truncate">{c.bidangKerja || "Umum"}</span>
                    </div>
                    <h3 className="font-black text-gray-900 uppercase tracking-tight truncate text-base leading-tight mb-0.5">{c.namaLengkap}</h3>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest italic mb-3">"{c.namaPanggilan}"</p>

                    <div className="flex flex-wrap gap-1.5">
                       {c.sertifikatSSW && <span className="bg-blue-100 text-blue-700 text-[8px] font-black px-2 py-0.5 rounded uppercase">SSW 1</span>}
                       {c.sertifikatSSW2 && <span className="bg-indigo-100 text-indigo-700 text-[8px] font-black px-2 py-0.5 rounded uppercase">SSW 2</span>}
                       <span className="bg-emerald-100 text-emerald-700 text-[8px] font-black px-2 py-0.5 rounded uppercase">{c.levelBahasa || "-"}</span>
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6 text-[10px]">
                 <div className="space-y-3">
                    <div>
                       <p className="font-black text-slate-400 uppercase tracking-tighter mb-0.5">Usia / Gender</p>
                       <p className="font-bold text-slate-700 uppercase">
                          {c.tanggalLahir ? (new Date().getFullYear() - new Date(c.tanggalLahir).getFullYear()) : "?"} Thn • {c.jenisKelamin}
                       </p>
                    </div>
                    <div>
                       <p className="font-black text-slate-400 uppercase tracking-tighter mb-0.5">Agama / Status</p>
                       <p className="font-bold text-slate-700 uppercase">{c.agama} • {c.statusPernikahan}</p>
                    </div>
                 </div>
                 <div className="space-y-3">
                    <div>
                       <p className="font-black text-slate-400 uppercase tracking-tighter mb-0.5">Tinggi / Berat</p>
                       <p className="font-bold text-slate-700 uppercase">{c.tinggiBadan}cm / {c.beratBadan}kg</p>
                    </div>
                    <div>
                       <p className="font-black text-slate-400 uppercase tracking-tighter mb-0.5">Status Progres</p>
                       <span className="text-[9px] font-black text-indigo-600 uppercase bg-indigo-50 px-1.5 py-0.5 rounded">{c.statusProgres || "READY"}</span>
                    </div>
                 </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl space-y-3 mb-6 flex-grow">
                 <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Kelebihan & Kekurangan</p>
                    <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2">ID: {c.kelebihan} / {c.kekurangan}</p>
                 </div>
                 <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Jikoshoukai Singkat</p>
                    <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-3">{c.promosiDiri || "-"}</p>
                 </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => router.push(`/admin/cv/${c.id}`)}
                  className="flex-1 py-3 border-2 border-slate-100 text-slate-500 text-[10px] font-black rounded-xl hover:bg-slate-50 transition-all uppercase tracking-widest"
                >
                  LIHAT CV
                </button>
                <button
                  onClick={() => { setSelectedStudent(c); setShowRequestModal(true); }}
                  className="flex-1 py-3 bg-purple-600 text-white text-[10px] font-black rounded-xl hover:bg-purple-700 transition-all uppercase tracking-widest shadow-lg shadow-purple-100"
                >
                  REQUEST SISWA INI
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredCandidates.length === 0 && (
          <div className="py-24 text-center">
             <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Tidak ada siswa yang sesuai kriteria.</p>
          </div>
        )}
      </div>

      {/* Request Modal */}
      {showRequestModal && selectedStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-10">
            <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight mb-2 text-center">Request Matching Siswa</h3>
            <p className="text-[11px] text-center text-slate-400 mb-8 px-4">Ajukan kandidat <span className="font-black text-purple-600 uppercase">{selectedStudent.namaLengkap}</span> ke admin untuk Matching Job Anda.</p>

            <form onSubmit={handleSubmitRequest} className="space-y-5">
               <div>
                  <label className="form-label text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block">Pilih Lowongan Anda</label>
                  <select className="input-field bg-slate-50 border-none font-bold text-sm h-12 px-4" value={requestData.jobId} onChange={(e) => setRequestData({...requestData, jobId: e.target.value})} required>
                     <option value="">-- Pilih Job --</option>
                     {myJobs.map(j => <option key={j.id} value={j.id}>[{j.kodeJob}] {j.namaJob}</option>)}
                  </select>
               </div>
               <div>
                  <label className="form-label text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block">Catatan Khusus</label>
                  <textarea className="input-field bg-slate-50 border-none font-bold text-xs p-4" rows="4" value={requestData.notes} onChange={(e) => setRequestData({...requestData, notes: e.target.value})} placeholder="Catatan untuk verifikasi admin..." />
               </div>
               <div className="flex gap-4 pt-6">
                  <button type="button" onClick={() => setShowRequestModal(false)} className="flex-1 py-4 font-black text-slate-300 uppercase text-[10px] tracking-[0.2em] hover:text-slate-500 transition-colors">Batal</button>
                  <button type="submit" className="flex-2 py-4 px-10 bg-purple-600 text-white font-black rounded-2xl uppercase text-[10px] tracking-[0.2em] shadow-2xl shadow-purple-200 hover:bg-purple-700 disabled:opacity-50" disabled={submitting}>
                    {submitting ? "Processing..." : "Submit Request →"}
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
