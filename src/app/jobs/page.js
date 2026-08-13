"use client";
import { useState, useEffect } from "react";
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

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
      return;
    }
    // Visibility check
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

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <>
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight uppercase">Lowongan Kerja Tersedia</h1>
          <p className="text-gray-500 text-sm">Temukan pekerjaan yang sesuai dengan kriteria Anda</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            {jobs.map((job) => (
              <div
                key={job.id}
                onClick={() => setSelectedJob(job)}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                  selectedJob?.id === job.id ? "border-blue-600 bg-blue-50 shadow-md" : "border-gray-100 bg-white hover:border-blue-200"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                   <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">{job.kodeJob || "JOB"}</span>
                   <span className="bg-green-100 text-green-700 text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-tighter">Available</span>
                </div>
                <h3 className="font-black text-gray-800 leading-tight uppercase text-sm">{job.namaJob}</h3>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-4 font-bold">
                  <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {job.lokasi}
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-2">
            {selectedJob ? (
              <div className="card border border-blue-100 shadow-xl rounded-3xl overflow-hidden animate-fadeIn">
                <div className="bg-blue-600 p-8 text-white">
                  <h2 className="text-2xl font-black uppercase tracking-tight">{selectedJob.namaJob}</h2>
                  <div className="flex gap-4 mt-4">
                     <span className="bg-white/20 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest">{selectedJob.bidang}</span>
                     <span className="bg-white/20 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest">{selectedJob.kategori}</span>
                  </div>
                </div>
                <div className="p-8 space-y-6">
                   <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Lokasi</p>
                        <p className="font-bold text-gray-700">{selectedJob.lokasi}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Estimasi Gaji</p>
                        <p className="font-bold text-emerald-600">{selectedJob.gaji || "N/A"}</p>
                      </div>
                   </div>
                   <div>
                      <h4 className="text-xs font-black text-gray-800 uppercase mb-3">Deskripsi & Syarat</h4>
                      <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line bg-gray-50 p-6 rounded-2xl border border-gray-100">
                        {selectedJob.deskripsiPekerjaan || selectedJob.klasifikasiKandidat || "Tidak ada deskripsi detail."}
                      </p>
                   </div>
                   <div className="mt-8 pt-6 border-t">
                      <p className="text-[10px] text-gray-400 font-bold uppercase italic mb-4">Ingin melamar lowongan ini? Pastikan CV Anda sudah lengkap.</p>
                      <button onClick={() => router.push('/candidate/form')} className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-lg shadow-blue-100">Lengkapi Data CV & Daftar Sekarang →</button>
                   </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center p-12 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200 text-center">
                <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Pilih lowongan untuk melihat detail</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
