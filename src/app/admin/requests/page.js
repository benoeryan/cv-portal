"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs, updateDoc, doc, query, orderBy } from "firebase/firestore";
import Navbar from "@/components/Navbar";

export default function AdminRequestsPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || userData?.role !== "admin")) {
      router.push("/");
      return;
    }
    if (user && userData?.role === "admin") {
      loadRequests();
    }
  }, [user, userData, authLoading]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "requests"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      setRequests(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleAction = async (id, status) => {
    if (!window.confirm(`Konfirmasi ${status} untuk request ini?`)) return;
    try {
      await updateDoc(doc(db, "requests", id), { status, verifiedAt: new Date().toISOString() });
      loadRequests();
    } catch (err) { alert(err.message); }
  };

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <>
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Verifikasi Request Mitra</h1>
          <p className="text-gray-500 text-sm">Validasi pengajuan matching job dari mitra perusahaan</p>
        </div>

        <div className="card !p-0 overflow-hidden border border-gray-100 shadow-xl">
           <table className="w-full text-sm text-left">
              <thead>
                 <tr className="bg-slate-900 text-white uppercase tracking-widest text-[10px]">
                    <th className="py-4 px-6">Mitra</th>
                    <th className="py-4 px-6">Siswa</th>
                    <th className="py-4 px-6">Job Di-Request</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-center">Aksi</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                 {requests.map(r => (
                    <tr key={r.id} className="hover:bg-blue-50/30 transition-colors">
                       <td className="py-4 px-6 font-bold text-indigo-600 uppercase text-xs">{r.partnerName}</td>
                       <td className="py-4 px-6 font-bold text-slate-700 uppercase text-xs">{r.studentName}</td>
                       <td className="py-4 px-6">
                          <p className="font-bold text-slate-800">{r.jobTitle}</p>
                          <p className="text-[10px] text-slate-400 italic line-clamp-1">{r.notes}</p>
                       </td>
                       <td className="py-4 px-6">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                             r.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                             r.status === 'Rejected' ? 'bg-rose-100 text-rose-700' :
                             'bg-amber-100 text-amber-700'
                          }`}>{r.status}</span>
                       </td>
                       <td className="py-4 px-6">
                          {r.status === 'Pending' ? (
                             <div className="flex justify-center gap-2">
                                <button onClick={() => handleAction(r.id, 'Approved')} className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase">Approve</button>
                                <button onClick={() => handleAction(r.id, 'Rejected')} className="bg-rose-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase">Reject</button>
                             </div>
                          ) : (
                             <p className="text-center text-[10px] text-gray-400 font-bold">Verified</p>
                          )}
                       </td>
                    </tr>
                 ))}
                 {requests.length === 0 && (
                    <tr><td colSpan="5" className="py-24 text-center text-gray-400 italic">Belum ada request pengajuan.</td></tr>
                 )}
              </tbody>
           </table>
        </div>
      </div>
    </>
  );
}
