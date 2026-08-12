"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import Navbar from "@/components/Navbar";

export default function PartnerJobListPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);

  useEffect(() => {
    if (!authLoading && (!user || userData?.role !== "partner")) {
      router.push("/");
      return;
    }
    if (user && userData?.role === "partner") {
      loadJobs();
    }
  }, [user, userData, authLoading]);

  const loadJobs = async () => {
    setLoading(true);
    try {
      // Mitra only sees "Open" jobs
      // Note: we check for "Open", "OPEN", and also handle case where status might be missing
      const q = query(
        collection(db, "jobs"),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(j => j.statusJob === "Open" || j.statusJob === "OPEN");

      setJobs(data);
    } catch (err) {
      console.error("Error loading jobs:", err);
    }
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
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight uppercase">Daftar Lowongan Tersedia</h1>
          <p className="text-gray-500 text-sm">Pilih lowongan untuk melihat detail kriteria dan persyaratan</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* List Section */}
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
                   <span className="bg-green-100 text-green-700 text-[8px] font-black px-2 py-0.5 rounded uppercase">Open</span>
                </div>
                <h3 className="font-black text-gray-800 leading-tight uppercase text-sm">{job.namaJob}</h3>
                <p className="text-gray-400 text-[11px] font-bold mt-1">{job.perusahaan}</p>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-4 font-bold">
                  <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {job.lokasi}
                </div>
              </div>
            ))}
            {jobs.length === 0 && (
              <div className="text-center py-16 text-gray-400 italic bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">Belum ada job tersedia saat ini.</div>
            )}
          </div>

          {/* Detail Section */}
          <div className="lg:col-span-2">
            {selectedJob ? (
              <div className="card sticky top-20 border border-blue-100 shadow-2xl shadow-blue-100/20 rounded-3xl overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Detail Lowongan #{selectedJob.kodeJob}</span>
                    <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-black px-3 py-1 rounded-full uppercase border border-white/20">Status: Active</span>
                  </div>
                  <h2 className="text-3xl font-black leading-tight uppercase tracking-tight">{selectedJob.namaJob}</h2>
                  <p className="text-blue-100 font-bold text-lg mt-2">{selectedJob.perusahaan}</p>
                </div>

                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                    <div className="space-y-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 shrink-0">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lokasi Penempatan</p>
                          <p className="font-black text-gray-700 text-lg">{selectedJob.lokasi}</p>
                          {selectedJob.domisiliKerja && <p className="text-xs text-slate-400 mt-1 font-bold italic">{selectedJob.domisiliKerja}</p>}
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 shrink-0">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estimasi Gaji Pokok</p>
                          <p className="font-black text-emerald-600 text-2xl">{selectedJob.gaji || "N/A"}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                       <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-2">Kriteria & Fasilitas</h4>
                       <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">Gender</p>
                            <p className="text-xs font-black text-slate-700">{selectedJob.jenisKelamin || "-"}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">Usia Max</p>
                            <p className="text-xs font-black text-slate-700">{selectedJob.usiaMax || "-"}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-[9px] font-bold text-slate-400 uppercase">Sektor</p>
                            <p className="text-xs font-black text-blue-600 uppercase">{selectedJob.bidang || "-"}</p>
                          </div>
                       </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div>
                      <h4 className="text-xs font-black text-gray-800 uppercase mb-4 flex items-center gap-3">
                        <span className="w-1.5 h-4 bg-blue-600 rounded-full"></span>
                        Deskripsi & Tanggung Jawab
                      </h4>
                      <div className="text-gray-600 text-[13px] leading-relaxed whitespace-pre-line bg-gray-50/50 p-6 rounded-2xl border border-gray-100 font-medium">
                        {selectedJob.deskripsiPekerjaan || "Tidak ada deskripsi detail."}
                      </div>
                    </div>

                    {selectedJob.benefit && (
                      <div>
                        <h4 className="text-xs font-black text-gray-800 uppercase mb-4 flex items-center gap-3">
                          <span className="w-1.5 h-4 bg-emerald-500 rounded-full"></span>
                          Fasilitas & Benefit
                        </h4>
                        <div className="text-gray-600 text-[13px] leading-relaxed whitespace-pre-line bg-emerald-50/20 p-6 rounded-2xl border border-emerald-50 font-medium">
                          {selectedJob.benefit}
                        </div>
                      </div>
                    )}

                    <div>
                      <h4 className="text-xs font-black text-gray-800 uppercase mb-4 flex items-center gap-3">
                        <span className="w-1.5 h-4 bg-orange-500 rounded-full"></span>
                        Kualifikasi Khusus
                      </h4>
                      <div className="text-gray-600 text-[13px] leading-relaxed whitespace-pre-line bg-orange-50/20 p-6 rounded-2xl border border-orange-50 font-medium italic">
                        {selectedJob.keterangan || selectedJob.klasifikasiKandidat || "Tidak ada persyaratan khusus."}
                      </div>
                    </div>
                  </div>

                  <div className="mt-10 pt-8 border-t border-gray-100 flex flex-col md:flex-row gap-4">
                    <button
                      onClick={() => router.push("/partner/candidates")}
                      className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 uppercase tracking-widest text-xs"
                    >
                      Cari Siswa untuk Lowongan Ini →
                    </button>
                    {selectedJob.fileUrl && (
                      <a
                        href={selectedJob.fileUrl}
                        target="_blank"
                        className="py-4 px-8 bg-slate-800 text-white font-black rounded-2xl hover:bg-slate-900 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                        Unduh Dokumen
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[70vh] flex flex-col items-center justify-center text-center p-12 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
                <div className="p-6 bg-white rounded-full shadow-lg mb-6">
                  <svg className="w-16 h-16 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <h3 className="text-gray-800 font-black uppercase tracking-tight text-xl">Silakan Pilih Lowongan</h3>
                <p className="text-gray-400 text-sm mt-2 max-w-sm">Klik pada salah satu kartu lowongan di panel kiri untuk melihat informasi lengkap dan kualifikasi.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #E2E8F0;
          border-radius: 10px;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .card {
          animation: fadeIn 0.4s ease-out forwards;
        }
      `}</style>
    </>
  );
}
