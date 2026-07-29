"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs, query } from "firebase/firestore";
import Navbar from "@/components/Navbar";
import Link from "next/link";

export default function AdminDashboard() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    total: 0,
    byCategory: {},
    byBidang: {},
    byStatus: {}
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || !["admin", "viewer", "approval"].includes(userData?.role))) {
      router.push("/");
      return;
    }
    if (user && ["admin", "viewer", "approval"].includes(userData?.role)) {
      loadDashboardData();
    }
  }, [user, userData, authLoading]);

  const loadDashboardData = async () => {
    try {
      const q = query(collection(db, "candidates"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => d.data());

      const summary = {
        total: data.length,
        byCategory: {},
        byBidang: {},
        byStatus: {
          "Nihongo check": 0,
          "Belum Lolos Nihongo check": 0,
          "Pending Nunggu Job": 0,
          "Penjadwalan Interview": 0,
          "On Proses": 0,
          "Tidak Lolos Interview": 0,
          "Status On Job (Selesai)": 0,
          "Cancel": 0
        }
      };

      data.forEach(c => {
        // Stats by Category
        const cat = c.kategoriKandidat || "Tidak Diketahui";
        summary.byCategory[cat] = (summary.byCategory[cat] || 0) + 1;

        // Stats by Bidang
        const bidang = c.bidangKerja || "Tidak Diketahui";
        summary.byBidang[bidang] = (summary.byBidang[bidang] || 0) + 1;

        // Stats by Status
        const status = c.statusProgres || "Lainnya";
        if (summary.byStatus.hasOwnProperty(status)) {
          summary.byStatus[status]++;
        } else {
          summary.byStatus["Lainnya"]++;
        }
      });

      setStats(summary);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    }
    setLoading(false);
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Dashboard Statistik</h1>
          <p className="text-gray-500">Ringkasan data kandidat portal CV IJEF</p>
        </div>

        {/* Total Card & Status Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <Link href="/admin/candidates" className="card p-6 bg-gradient-to-br from-blue-600 to-indigo-700 text-white hover:shadow-lg transition-shadow flex flex-col justify-center">
            <h3 className="text-sm font-medium opacity-80 uppercase">Total Kandidat</h3>
            <p className="text-4xl font-bold mt-2">{stats.total}</p>
          </Link>

          {Object.entries(stats.byStatus).map(([status, count]) => {
            return (
              <Link
                href={`/admin/candidates?status=${encodeURIComponent(status)}`}
                key={status}
                className="card p-4 bg-white border border-gray-100 shadow-sm hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 line-clamp-1">{status}</h3>
                  <p className="text-2xl font-bold text-gray-800">{count}</p>
                </div>
                <div className="w-full bg-gray-100 h-1.5 mt-3 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      status === "Nihongo check" ? "bg-indigo-500" :
                      status === "Belum Lolos Nihongo check" ? "bg-gray-400" :
                      status === "Pending Nunggu Job" ? "bg-amber-500" :
                      status === "Penjadwalan Interview" ? "bg-violet-500" :
                      status === "On Proses" ? "bg-sky-500" :
                      status === "Tidak Lolos Interview" ? "bg-orange-500" :
                      status === "Status On Job (Selesai)" ? "bg-emerald-500" :
                      status === "Cancel" ? "bg-rose-500" :
                      "bg-gray-500"
                    }`}
                    style={{ width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%` }}
                  ></div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Bidang Kerja Table */}
          <div className="card p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Berdasarkan Bidang Kerja</h3>
            <div className="space-y-4">
              {Object.entries(stats.byBidang)
                .sort((a, b) => b[1] - a[1])
                .map(([bidang, count]) => (
                <Link
                  href={`/admin/candidates?bidang=${encodeURIComponent(bidang)}`}
                  key={bidang}
                  className="block group"
                >
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700 group-hover:text-blue-600 transition-colors">{bidang}</span>
                    <span className="text-gray-500">{count} Kandidat ({Math.round((count/stats.total)*100)}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-500 h-full group-hover:bg-blue-600 transition-colors"
                      style={{ width: `${(count / stats.total) * 100}%` }}
                    ></div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Kategori Table */}
          <div className="card p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Berdasarkan Kategori</h3>
            <div className="space-y-6">
              {Object.entries(stats.byCategory)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, count]) => (
                <Link
                  href={`/admin/candidates?kategori=${encodeURIComponent(cat)}`}
                  key={cat}
                  className="flex items-center group"
                >
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold transition-transform group-hover:scale-105 ${
                        cat === "NEW COMER" ? "bg-green-100 text-green-700" :
                        cat === "EX-MAGANG/EX-TRAINEER" ? "bg-purple-100 text-purple-700" :
                        "bg-orange-100 text-orange-700"
                      }`}>{cat}</span>
                      <span className="text-xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{count}</span>
                    </div>
                    <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          cat === "NEW COMER" ? "bg-green-500" :
                          cat === "EX-MAGANG/EX-TRAINEER" ? "bg-purple-500" :
                          "bg-orange-500"
                        }`}
                        style={{ width: `${(count / stats.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <button
                onClick={() => router.push("/admin/candidates")}
                className="w-full py-3 bg-gray-50 text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
              >
                Lihat Detail Semua Kandidat →
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
