"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs, query } from "firebase/firestore";
import Navbar from "@/components/Navbar";

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
          "On Proses": 0,
          "Pending Nunggu Job": 0,
          "Cancel": 0,
          "Status On Job (Selesai)": 0,
          "Lainnya": 0
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

        {/* Total Card */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card p-6 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
            <h3 className="text-lg font-medium opacity-80">Total Kandidat</h3>
            <p className="text-4xl font-bold mt-2">{stats.total}</p>
          </div>

          {Object.entries(stats.byStatus).map(([status, count]) => {
            if (count === 0 && status === "Lainnya") return null;
            return (
              <div key={status} className="card p-6 bg-white border border-gray-100 shadow-sm">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">{status}</h3>
                <p className="text-3xl font-bold text-gray-800 mt-2">{count}</p>
                <div className="w-full bg-gray-100 h-2 mt-4 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      status === "On Proses" ? "bg-sky-500" :
                      status === "Status On Job (Selesai)" ? "bg-emerald-500" :
                      status === "Cancel" ? "bg-rose-500" :
                      "bg-amber-500"
                    }`}
                    style={{ width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
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
                <div key={bidang}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{bidang}</span>
                    <span className="text-gray-500">{count} Kandidat ({Math.round((count/stats.total)*100)}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-500 h-full"
                      style={{ width: `${(count / stats.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
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
                <div key={cat} className="flex items-center">
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        cat === "NEW COMER" ? "bg-green-100 text-green-700" :
                        cat === "EX-MAGANG/EX-TRAINEER" ? "bg-purple-100 text-purple-700" :
                        "bg-orange-100 text-orange-700"
                      }`}>{cat}</span>
                      <span className="text-xl font-bold text-gray-800">{count}</span>
                    </div>
                    <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          cat === "NEW COMER" ? "bg-green-500" :
                          cat === "EX-MAGANG/EX-TRAINEER" ? "bg-purple-500" :
                          "bg-orange-500"
                        }`}
                        style={{ width: `${(count / stats.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
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
