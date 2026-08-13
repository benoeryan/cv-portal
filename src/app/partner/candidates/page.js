"use client";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, query, where, orderBy } from "firebase/firestore";
import Navbar from "@/components/Navbar";
import DriveImage from "@/components/DriveImage";

export default function PartnerCandidateSearchPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBidang, setFilterBidang] = useState("");

  // Modals State
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [myJobs, setMyJobs] = useState([]);
  const [requestData, setRequestData] = useState({ jobId: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !["partner", "admin"].includes(userData?.role))) {
      router.push("/");
      return;
    }
    if (user && ["partner", "admin"].includes(userData?.role)) {
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
          const hasSSW = (c.sertifikatSSW && String(c.sertifikatSSW).includes("http")) ||
                         (c.sertifikatSSW2 && String(c.sertifikatSSW2).includes("http"));
          const isAvailable = !c.statusProgres || c.statusProgres === "Pending Nunggu Job";
          return hasSSW && isAvailable;
        });
      setCandidates(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const loadMyJobs = async () => {
    try {
      let q;
      if (userData?.role === "admin") {
        q = query(collection(db, "jobs"), where("statusJob", "==", "Open"));
      } else {
        q = query(collection(db, "jobs"), where("createdBy", "==", user.uid));
      }
      const snap = await getDocs(q);
      setMyJobs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
  };

  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      const matchSearch = !searchTerm || c.namaLengkap?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchBidang = !filterBidang || c.bidangKerja === filterBidang;
      return matchSearch && matchBidang;
    });
  }, [candidates, searchTerm, filterBidang]);

  const statsByBidang = useMemo(() => {
    const counts = {};
    candidates.forEach(c => {
      const b = c.bidangKerja || "Umum";
      counts[b] = (counts[b] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [candidates]);

  const handleOpenDetail = (student) => {
    setSelectedStudent(student);
    setShowDetailModal(true);
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
      alert("Request berhasil!");
      setShowRequestModal(false);
      setShowDetailModal(false);
      setRequestData({ jobId: "", notes: "" });
    } catch (err) { alert(err.message); }
    setSubmitting(false);
  };

  if (authLoading || loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <>
      <Navbar />
      <div className="max-w-full mx-auto px-6 py-8 bg-[#F8F9FC] min-h-screen">
        <div className="mb-10 text-center">
            <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Pencarian Siswa Ready Match v3.0</h1>
            <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-2">Katalog Siswa Bersertifikat SSW & Siap Kerja</p>
        </div>

        {/* Dashboard Bidang SSW */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
           <div
             onClick={() => setFilterBidang("")}
             className={`cursor-pointer px-8 py-5 rounded-[2.5rem] border-2 transition-all ${!filterBidang ? "bg-slate-900 border-slate-900 text-white shadow-2xl scale-105" : "bg-white border-white shadow-sm hover:border-slate-200"}`}
           >
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Semua</p>
              <h3 className="text-2xl font-black">{candidates.length}</h3>
           </div>
           {statsByBidang.map(([bidang, count]) => (
             <div
               key={bidang}
               onClick={() => setFilterBidang(prev => prev === bidang ? "" : bidang)}
               className={`cursor-pointer px-8 py-5 rounded-[2.5rem] border-2 transition-all ${filterBidang === bidang ? "bg-purple-600 border-purple-600 text-white shadow-2xl scale-105" : "bg-white border-white shadow-sm hover:border-purple-100"}`}
             >
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60 line-clamp-1">{bidang}</p>
                <h3 className="text-2xl font-black">{count}</h3>
             </div>
           ))}
        </div>

        {/* List Kandidat */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
          {filteredCandidates.map((c) => (
            <div
              key={c.id}
              onClick={() => handleOpenDetail(c)}
              className="group bg-white rounded-[3.5rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 cursor-pointer border-4 border-white hover:border-purple-100 flex flex-col h-full relative"
            >
               {/* IMAGE FULL AREA */}
               <div className="relative aspect-[3/4.5] overflow-hidden bg-slate-100">
                  <DriveImage url={c.pasPhoto} alt={c.namaLengkap} size="w-full h-full" className="group-hover:scale-110 transition-transform duration-1000 object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/10 to-transparent opacity-90"></div>

                  {/* Floating Badges */}
                  <div className="absolute top-6 left-6 flex gap-2">
                     {c.sertifikatSSW && <span className="bg-blue-600/90 backdrop-blur-md text-white text-[8px] font-black px-3 py-1 rounded-full uppercase border border-white/20">SSW 1</span>}
                     {c.sertifikatSSW2 && <span className="bg-indigo-600/90 backdrop-blur-md text-white text-[8px] font-black px-3 py-1 rounded-full uppercase border border-white/20">SSW 2</span>}
                  </div>

                  <div className="absolute bottom-8 left-8 right-8 text-white">
                     <span className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em] mb-1 block">{c.bidangKerja}</span>
                     <h3 className="text-2xl font-black uppercase leading-none tracking-tighter drop-shadow-xl">{c.namaLengkap}</h3>
                     <div className="mt-4 flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest opacity-70">
                        <span>{c.tanggalLahir ? (new Date().getFullYear() - new Date(c.tanggalLahir).getFullYear()) : "?"} Thn</span>
                        <span className="w-1 h-1 rounded-full bg-white/30"></span>
                        <span>{c.jenisKelamin === 'LAKI-LAKI' ? 'PRIA' : 'WANITA'}</span>
                     </div>
                  </div>
               </div>

               <div className="p-8 space-y-6">
                  <div className="flex justify-between items-center bg-slate-50 p-4 rounded-3xl border border-slate-100">
                     <div className="text-center flex-1 border-r border-slate-200">
                        <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Bahasa</p>
                        <p className="text-xs font-black text-indigo-600 uppercase">{c.levelBahasa || "-"}</p>
                     </div>
                     <div className="text-center flex-1">
                        <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Status</p>
                        <p className="text-[10px] font-black text-emerald-500 uppercase">Ready</p>
                     </div>
                  </div>
                  <button className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] group-hover:bg-purple-600 transition-colors shadow-xl shadow-slate-100">
                     Lihat Profil Lengkap
                  </button>
               </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail Modal Full UI */}
      {showDetailModal && selectedStudent && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl animate-fadeIn">
           <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-6xl overflow-hidden max-h-[90vh] flex flex-col md:flex-row">
              <div className="w-full md:w-2/5 relative bg-slate-100 overflow-hidden">
                 <DriveImage url={selectedStudent.pasPhoto} alt={selectedStudent.namaLengkap} size="w-full h-full" className="object-cover" />
                 <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>
                 <div className="absolute bottom-10 left-10 right-10 text-white">
                    <h2 className="text-5xl font-black uppercase leading-none mb-2">{selectedStudent.namaLengkap}</h2>
                    <p className="text-xl font-bold opacity-60 uppercase tracking-widest italic">"{selectedStudent.namaPanggilan}"</p>
                 </div>
                 <button onClick={() => setShowDetailModal(false)} className="absolute top-8 right-8 w-12 h-12 bg-white/20 backdrop-blur-md rounded-full text-white text-3xl font-light hover:bg-white/40 transition-all">&times;</button>
              </div>
              <div className="flex-1 p-12 overflow-y-auto custom-scrollbar space-y-12">
                 <div className="grid grid-cols-3 gap-8">
                    <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 text-center">
                       <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Usia</p>
                       <p className="text-2xl font-black text-slate-800">{selectedStudent.tanggalLahir ? (new Date().getFullYear() - new Date(selectedStudent.tanggalLahir).getFullYear()) : "?"} Tahun</p>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 text-center">
                       <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Gender</p>
                       <p className="text-2xl font-black text-slate-800">{selectedStudent.jenisKelamin}</p>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 text-center">
                       <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Bidang SSW</p>
                       <p className="text-2xl font-black text-purple-600 uppercase">{selectedStudent.bidangKerja}</p>
                    </div>
                 </div>

                 <div className="space-y-6">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-3"><div className="w-2 h-4 bg-indigo-600 rounded-full"></div>Promosi Diri (Jikoshoukai)</h4>
                    <p className="text-lg text-slate-600 leading-relaxed font-medium italic bg-indigo-50/30 p-10 rounded-[3rem] border border-indigo-50">"{selectedStudent.promosiDiri || "---"}"</p>
                 </div>

                 <div className="flex gap-4 pt-10">
                    <button onClick={() => setShowRequestModal(true)} className="flex-1 py-6 bg-purple-600 text-white font-black rounded-3xl shadow-2xl shadow-purple-200 uppercase tracking-[0.2em] hover:bg-purple-700 transition-all">AJUKAN MATCHING SEKARANG →</button>
                    <button onClick={() => setShowDetailModal(false)} className="px-10 py-6 border-2 border-slate-100 rounded-3xl font-black text-slate-400 uppercase text-[10px] tracking-widest hover:bg-slate-50">Kembali</button>
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
