"use client";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import Navbar from "@/components/Navbar";

export default function CandidateJobListPage() {
  const { user, userData, candidateData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [filterSkema, setFilterSkema] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
      return;
    }
    const isAllowed = userData?.role === "admin" || (
      userData?.role === "candidate" &&
      (candidateData?.kategoriKandidat?.includes("NEW COMER") || candidateData?.kategoriKandidat?.includes("MATCHING JOB"))
    );

    if (!authLoading && !isAllowed && userData?.role !== "admin") {
      router.push("/");
      return;
    }
    loadJobs();
  }, [user, userData, candidateData, authLoading]);

  const loadJobs = async () => {
    try {
      const q = query(collection(db, "jobs"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(j => j.statusJob === "Open" || j.statusJob === "OPEN");
      setJobs(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter(j => !filterSkema || j.klasifikasiSkema === filterSkema);
  }, [jobs, filterSkema]);

  const statsBySkema = useMemo(() => {
    const counts = { "Urgency": 0, "Standard": 0, "Routine": 0 };
    jobs.forEach(j => {
      const s = j.klasifikasiSkema || "Standard";
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts);
  }, [jobs]);

  if (authLoading || loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-10 bg-[#F8F9FC] min-h-screen">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase">Lowongan Kerja Tersedia v3.0</h1>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-2">Daftar Job Unggulan IJEF - Silahkan Pilih & Daftar Melalui CV Anda</p>
        </div>

        {/* Priority Dashboard */}
        <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto mb-12">
           {statsBySkema.map(([skema, count]) => (
             <div
               key={skema}
               onClick={() => setFilterSkema(prev => prev === skema ? "" : skema)}
               className={`cursor-pointer p-4 rounded-[2rem] border-2 text-center transition-all ${
                 filterSkema === skema ? "bg-blue-600 border-blue-600 text-white shadow-xl scale-105" : "bg-white border-white shadow-sm hover:border-blue-100"
               }`}
             >
                <p className={`text-[8px] font-black uppercase tracking-widest ${filterSkema === skema ? "text-blue-200" : "text-slate-400"}`}>{skema}</p>
                <h3 className="text-xl font-black">{count}</h3>
             </div>
           ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-1 space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                onClick={() => setSelectedJob(job)}
                className={`p-6 rounded-[2.5rem] border-2 cursor-pointer transition-all ${
                  selectedJob?.id === job.id ? "border-blue-600 bg-blue-50 shadow-2xl scale-[1.02]" : "border-white bg-white shadow-sm hover:border-blue-100"
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                   <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${job.klasifikasiSkema === 'Urgency' ? 'bg-rose-600 text-white animate-pulse' : 'bg-blue-600 text-white'}`}>{job.klasifikasiSkema || "Standard"}</span>
                   <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">{job.kodeJob}</span>
                </div>
                <h3 className="font-black text-slate-800 leading-tight uppercase text-sm mb-4">{job.namaJob}</h3>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase">
                  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                  {job.lokasi}
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-2">
            {selectedJob ? (
              <div className="card border border-blue-50 shadow-2xl rounded-[3rem] overflow-hidden bg-white sticky top-20 animate-fadeIn">
                <div className={`p-10 text-white ${selectedJob.klasifikasiSkema === 'Urgency' ? 'bg-gradient-to-r from-rose-600 to-pink-700' : 'bg-gradient-to-r from-blue-600 to-indigo-700'}`}>
                  <h2 className="text-4xl font-black uppercase tracking-tight leading-none mb-6">{selectedJob.namaJob}</h2>
                  <div className="flex gap-4">
                     <span className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-xl text-[10px] font-black uppercase border border-white/10">{selectedJob.bidang}</span>
                     <span className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-xl text-[10px] font-black uppercase border border-white/10">{selectedJob.kategori}</span>
                  </div>
                </div>

                <div className="p-10 space-y-10">
                   <div className="grid grid-cols-2 gap-8">
                      <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Penempatan</p>
                        <p className="text-xl font-black text-slate-700">{selectedJob.lokasi}</p>
                        <p className="text-xs text-blue-500 font-bold italic mt-1">{selectedJob.domisiliKerja || "Info menyusul"}</p>
                      </div>
                      <div className="p-6 bg-emerald-50 rounded-[2rem] border border-emerald-100">
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Estimasi Gaji</p>
                        <p className="text-2xl font-black text-emerald-600">{selectedJob.gaji || "---"}</p>
                      </div>
                   </div>

                   <div className="space-y-4">
                      <h4 className="text-xs font-black text-slate-800 uppercase flex items-center gap-3 tracking-widest"><div className="w-1.5 h-4 bg-blue-600 rounded-full"></div>Deskripsi & Kualifikasi</h4>
                      <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 text-slate-600 text-sm leading-relaxed whitespace-pre-line font-medium italic">
                        {selectedJob.deskripsiPekerjaan || selectedJob.klasifikasiKandidat || "Tidak ada deskripsi detail."}
                      </div>
                   </div>

                   {selectedJob.benefit && (
                     <div className="space-y-4">
                        <h4 className="text-xs font-black text-slate-800 uppercase flex items-center gap-3 tracking-widest"><div className="w-1.5 h-4 bg-emerald-500 rounded-full"></div>Benefit & Fasilitas</h4>
                        <div className="p-8 bg-emerald-50/20 rounded-[2.5rem] border border-emerald-50 text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                           {selectedJob.benefit}
                        </div>
                     </div>
                   )}

                   <div className="pt-6 border-t border-slate-100">
                      <p className="text-[10px] text-slate-400 font-bold uppercase italic mb-6 text-center">Pastikan Anda sudah melengkapi data CV untuk melamar job ini.</p>
                      <button onClick={() => router.push('/candidate/form')} className="w-full py-6 bg-slate-900 text-white font-black rounded-3xl uppercase tracking-[0.2em] text-xs shadow-2xl shadow-slate-200 hover:bg-blue-700 transition-all scale-105 active:scale-95">Daftar Melalui CV Saya Sekarang →</button>
                   </div>
                </div>
              </div>
            ) : (
              <div className="h-[60vh] flex flex-col items-center justify-center p-12 bg-white rounded-[4rem] border-2 border-dashed border-slate-100 text-center shadow-inner">
                 <div className="p-8 bg-blue-50 rounded-full mb-6 text-blue-200 animate-pulse"><svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745" /></svg></div>
                 <h3 className="text-slate-800 font-black uppercase tracking-tight text-2xl">Cari Karir Impian</h3>
                 <p className="text-slate-400 text-sm mt-3 max-w-xs font-bold uppercase tracking-widest leading-loose">Silahkan klik salah satu lowongan di panel kiri</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </>
  );
}
