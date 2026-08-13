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
  const [stats, setStats] = useState({ activeJobs: 0, pendingRequests: 0, approvedRequests: 0, totalCandidates: 0 });
  const [recentRequests, setRecentRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || !["partner", "admin"].includes(userData?.role))) {
      router.push("/");
      return;
    }
    if (user && ["partner", "admin"].includes(userData?.role)) {
      loadDashboardData();
    }
  }, [user, userData, authLoading]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // 1. My Jobs
      const jobsSnap = await getDocs(query(collection(db, "jobs"), where("createdBy", "==", user.uid)));

      // 2. Requests
      const reqQuery = query(collection(db, "requests"), where("partnerId", "==", user.uid), orderBy("createdAt", "desc"));
      const reqSnap = await getDocs(reqQuery);
      const reqData = reqSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // 3. Ready Students Count (Global)
      const studentsSnap = await getDocs(collection(db, "candidates"));
      const readyStudents = studentsSnap.docs.filter(d => {
        const c = d.data();
        return ((c.sertifikatSSW && c.sertifikatSSW.includes("http")) || (c.sertifikatSSW2 && c.sertifikatSSW2.includes("http"))) &&
               (!c.statusProgres || c.statusProgres === "Pending Nunggu Job");
      });

      setStats({
        activeJobs: jobsSnap.size,
        pendingRequests: reqData.filter(r => r.status === "Pending").length,
        approvedRequests: reqData.filter(r => r.status === "Approved").length,
        totalCandidates: readyStudents.length
      });
      setRecentRequests(reqData.slice(0, 10));
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
        <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
           <div>
              <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Partner Control Panel</h1>
              <p className="text-gray-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">International Japan Employment Foundation</p>
           </div>
           <div className="flex gap-3">
              <Link href="/partner/jobs" className="bg-purple-600 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-purple-100 hover:bg-purple-700 transition-all">Manajemen Job</Link>
              <Link href="/partner/candidates" className="bg-white border-2 border-purple-100 text-purple-600 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:border-purple-600 transition-all">Cari Siswa</Link>
           </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
           <div className="card border-none bg-slate-900 text-white p-6 shadow-2xl relative overflow-hidden group">
              <div className="relative z-10">
                 <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Job Aktif Saya</p>
                 <h3 className="text-4xl font-black">{stats.activeJobs}</h3>
              </div>
              <svg className="absolute -right-2 -bottom-2 w-24 h-24 text-white/5 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" /></svg>
           </div>
           <div className="card border-2 border-purple-50 bg-purple-50/20 p-6 shadow-sm group">
              <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-2">Menunggu Approval</p>
              <h3 className="text-4xl font-black text-purple-600">{stats.pendingRequests}</h3>
              <div className="w-full bg-purple-100 h-1.5 rounded-full mt-4 overflow-hidden">
                 <div className="bg-purple-600 h-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
           </div>
           <div className="card border-2 border-emerald-50 bg-emerald-50/20 p-6 shadow-sm">
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">Approved Admin</p>
              <h3 className="text-4xl font-black text-emerald-600">{stats.approvedRequests}</h3>
              <div className="mt-4 flex items-center gap-2 text-emerald-500">
                 <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                 <span className="text-[10px] font-bold uppercase tracking-wider">Matching Berhasil</span>
              </div>
           </div>
           <div className="card border-2 border-blue-50 bg-blue-50/20 p-6 shadow-sm">
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Siswa Ready Job</p>
              <h3 className="text-4xl font-black text-blue-600">{stats.totalCandidates}</h3>
              <p className="text-[10px] text-blue-400 font-bold mt-4 uppercase">Total Seluruh Sistem</p>
           </div>
        </div>

        {/* Pipeline & Requests */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-2">
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Monitoring Progres Request</h2>
              </div>
              <div className="card !p-0 overflow-hidden border-2 border-gray-50 shadow-xl rounded-3xl">
                 <table className="w-full text-sm">
                    <thead>
                       <tr className="bg-slate-900 text-white uppercase tracking-widest text-[9px]">
                          <th className="py-5 px-6 text-left">Detail Request</th>
                          <th className="py-5 px-6 text-center">Status Verifikasi</th>
                          <th className="py-5 px-6 text-right">Informasi</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                       {recentRequests.map(r => (
                          <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group">
                             <td className="py-5 px-6">
                                <div className="flex flex-col">
                                   <span className="font-black text-slate-800 uppercase text-xs mb-1 group-hover:text-purple-600 transition-colors">{r.studentName}</span>
                                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">UNTUK JOB: {r.jobTitle}</span>
                                </div>
                             </td>
                             <td className="py-5 px-6 text-center">
                                <div className="inline-flex flex-col items-center">
                                   <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.1em] border ${
                                      r.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                      r.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                      'bg-amber-50 text-amber-700 border-amber-100'
                                   }`}>{r.status}</span>
                                   {r.verifiedAt && <span className="text-[8px] text-slate-400 font-bold mt-1.5 uppercase">{new Date(r.verifiedAt).toLocaleDateString('id')}</span>}
                                </div>
                             </td>
                             <td className="py-5 px-6 text-right">
                                <div className="text-[10px] text-slate-500 font-medium leading-relaxed italic line-clamp-2 max-w-[150px] ml-auto">
                                   "{r.notes || 'Tidak ada catatan'}"
                                </div>
                             </td>
                          </tr>
                       ))}
                       {recentRequests.length === 0 && (
                          <tr><td colSpan="3" className="py-24 text-center text-slate-300 font-bold uppercase tracking-widest text-xs">Belum ada progres request matching.</td></tr>
                       )}
                    </tbody>
                 </table>
              </div>
           </div>

           <div className="space-y-8">
              <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Katalog Cepat</h2>
              <div className="grid grid-cols-1 gap-6">
                 <Link href="/partner/candidates" className="group">
                    <div className="p-8 bg-gradient-to-br from-white to-purple-50/30 border-2 border-purple-100 rounded-[2.5rem] hover:border-purple-600 transition-all shadow-lg hover:shadow-purple-100">
                       <div className="w-14 h-14 bg-purple-600 text-white rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-purple-200 group-hover:scale-110 transition-transform">
                          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                       </div>
                       <h3 className="font-black text-slate-800 uppercase text-lg tracking-tight">Cari Siswa Ready</h3>
                       <p className="text-xs text-slate-400 mt-2 font-bold leading-relaxed">Temukan kandidat yang sudah memiliki sertifikat SSW untuk matching job Anda.</p>
                    </div>
                 </Link>

                 <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                    <div className="relative z-10">
                       <h4 className="font-black uppercase tracking-widest text-[10px] text-white/50 mb-4">Informasi Mitra</h4>
                       <div className="space-y-4">
                          <div className="flex justify-between border-b border-white/10 pb-2">
                             <span className="text-[10px] font-bold text-white/40 uppercase">Nama Akun</span>
                             <span className="text-xs font-black uppercase tracking-tight">{userData?.fullName}</span>
                          </div>
                          <div className="flex justify-between">
                             <span className="text-[10px] font-bold text-white/40 uppercase">Hak Akses</span>
                             <span className="text-xs font-black text-purple-400 uppercase">Partner Verified</span>
                          </div>
                       </div>
                    </div>
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                       <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.955 0 0010 19.577a11.954 11.955 0 007.834-14.578 11.037 11.037 0 00-7.834-2.999 11.037 11.037 0 00-7.834 2.999zM9 8a1 1 0 112 0v5a1 1 0 11-2 0V8zm1-5a1 1 0 00-1 1v.01a1 1 0 002 0V4a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </>
  );
}
