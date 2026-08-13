"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import Navbar from "@/components/Navbar";
import Link from "next/link";

export default function PartnerDashboard() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({ activeJobs: 0, requestedStudents: 0, approvedRequests: 0 });
  const [recentRequests, setRecentRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || userData?.role !== "partner")) {
      router.push("/");
      return;
    }
    if (user && userData?.role === "partner") {
      loadStats();
    }
  }, [user, userData, authLoading]);

  const loadStats = async () => {
    setLoading(true);
    try {
      // Jobs count
      const jobsSnap = await getDocs(query(collection(db, "jobs"), where("createdBy", "==", user.uid)));

      // Requests
      const reqQuery = query(collection(db, "requests"), where("partnerId", "==", user.uid), orderBy("createdAt", "desc"));
      const reqSnap = await getDocs(reqQuery);
      const reqData = reqSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      setStats({
        activeJobs: jobsSnap.size,
        requestedStudents: reqData.length,
        approvedRequests: reqData.filter(r => r.status === "Approved").length
      });
      setRecentRequests(reqData.slice(0, 5));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Selamat Datang, {userData?.fullName}</h1>
          <p className="text-gray-500">Monitor progres rekrutmen dan manajemen lowongan Anda</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
           <div className="card bg-gradient-to-br from-purple-600 to-indigo-700 text-white p-6 border-none shadow-xl shadow-purple-200">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Lowongan Saya</p>
              <h3 className="text-4xl font-black">{stats.activeJobs}</h3>
              <div className="mt-4 flex justify-between items-center">
                 <Link href="/partner/jobs" className="text-[10px] font-bold uppercase tracking-widest bg-white/20 px-3 py-1.5 rounded-lg hover:bg-white/30 transition-all">Kelola Job</Link>
                 <svg className="w-8 h-8 opacity-20" fill="currentColor" viewBox="0 0 20 20"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" /></svg>
              </div>
           </div>
           <div className="card border-2 border-gray-50 p-6 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Siswa Di-Request</p>
              <h3 className="text-4xl font-black text-slate-800">{stats.requestedStudents}</h3>
              <div className="mt-4 flex justify-between items-center text-slate-400">
                 <span className="text-[10px] font-bold uppercase tracking-widest">Menunggu Verifikasi</span>
                 <svg className="w-8 h-8 opacity-10" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>
              </div>
           </div>
           <div className="card border-2 border-emerald-50 bg-emerald-50/30 p-6 shadow-sm">
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Berhasil Approved</p>
              <h3 className="text-4xl font-black text-emerald-700">{stats.approvedRequests}</h3>
              <div className="mt-4 flex justify-between items-center text-emerald-600">
                 <span className="text-[10px] font-bold uppercase tracking-widest">Matching Sukses</span>
                 <svg className="w-8 h-8 opacity-20" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           {/* Recent Progress */}
           <div className="lg:col-span-2 space-y-6">
              <div className="flex justify-between items-center">
                 <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Progres Request Terbaru</h2>
              </div>
              <div className="card !p-0 overflow-hidden border-2 border-gray-50 shadow-sm">
                 <table className="w-full text-sm">
                    <thead>
                       <tr className="bg-slate-900 text-white uppercase tracking-widest text-[10px]">
                          <th className="py-4 px-6 text-left">Nama Siswa</th>
                          <th className="py-4 px-6 text-left">Lowongan</th>
                          <th className="py-4 px-6 text-center">Status</th>
                          <th className="py-4 px-6 text-right">Tanggal</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                       {recentRequests.map(r => (
                          <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                             <td className="py-4 px-6 font-bold text-slate-700 uppercase text-xs">{r.studentName}</td>
                             <td className="py-4 px-6 text-slate-500 font-medium">{r.jobTitle}</td>
                             <td className="py-4 px-6 text-center">
                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                   r.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                                   r.status === 'Rejected' ? 'bg-rose-100 text-rose-700' :
                                   'bg-amber-100 text-amber-700'
                                }`}>{r.status}</span>
                             </td>
                             <td className="py-4 px-6 text-right text-[10px] text-slate-400 font-bold">
                                {new Date(r.createdAt).toLocaleDateString('id')}
                             </td>
                          </tr>
                       ))}
                       {recentRequests.length === 0 && (
                          <tr><td colSpan="4" className="py-12 text-center text-slate-400 italic">Belum ada request siswa.</td></tr>
                       )}
                    </tbody>
                 </table>
              </div>
           </div>

           {/* Quick Actions */}
           <div className="space-y-6">
              <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Aksi Cepat</h2>
              <div className="grid grid-cols-1 gap-4">
                 <button onClick={() => router.push('/partner/candidates')} className="p-5 bg-white border-2 border-purple-100 rounded-3xl text-left hover:border-purple-600 transition-all group shadow-sm">
                    <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-purple-600 group-hover:text-white transition-all">
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    <h3 className="font-black text-slate-800 uppercase text-sm">Cari Siswa</h3>
                    <p className="text-[11px] text-slate-400 mt-1 font-bold">Temukan kandidat ready untuk penempatan</p>
                 </button>
                 <button onClick={() => router.push('/partner/jobs')} className="p-5 bg-white border-2 border-indigo-100 rounded-3xl text-left hover:border-indigo-600 transition-all group shadow-sm">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    </div>
                    <h3 className="font-black text-slate-800 uppercase text-sm">Daftar Lowongan</h3>
                    <p className="text-[11px] text-slate-400 mt-1 font-bold">Lihat detail kriteria job yang tersedia</p>
                 </button>
              </div>
           </div>
        </div>
      </div>
    </>
  );
}
