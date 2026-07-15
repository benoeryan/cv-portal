"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import Navbar from "@/components/Navbar";
import Link from "next/link";

export default function CandidateStatusPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
      return;
    }
    if (user) {
      loadData();
    }
  }, [user, authLoading]);

  const loadData = async () => {
    try {
      const docRef = doc(db, "candidates", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setData(docSnap.data());
      }
    } catch (err) {
      console.error("Error loading status:", err);
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

  if (!data) {
    return (
      <>
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <div className="card">
            <div className="mb-4">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Belum Ada Data</h2>
            <p className="text-gray-500 mb-6">Anda belum mengisi form data kandidat. Silakan isi form untuk memulai proses.</p>
            <Link href="/candidate/form" className="btn-primary inline-block">
              Isi Form Sekarang
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Status Pendaftaran</h1>
            <p className="text-gray-500 text-sm">Pantau progres lamaran Anda di sini</p>
          </div>
          <div className="flex space-x-2">
            <Link href="/candidate/form" className="btn-secondary text-sm">
              Edit Data
            </Link>
            <Link href="/candidate/cv" className="btn-primary text-sm">
              Lihat CV
            </Link>
          </div>
        </div>

        {/* STATUS PROGRES DARI ADMIN */}
        <div className="card mb-6 border-l-4 border-blue-600">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            Status Progres Saat Ini
          </h2>
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Status Utama</label>
                <span className={`px-3 py-1 rounded-full text-sm font-bold border ${
                  data.statusProgres === "On Proses" ? "bg-sky-50 text-sky-700 border-sky-200" :
                  data.statusProgres === "Pending Nunggu Job" ? "bg-amber-50 text-amber-700 border-amber-200" :
                  data.statusProgres === "Cancel" ? "bg-rose-50 text-rose-700 border-rose-200" :
                  data.statusProgres === "Status On Job (Selesai)" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                  "bg-gray-50 text-gray-600 border-gray-200"
                }`}>
                  {data.statusProgres || "Belum Diproses"}
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Nama TSK</label>
                <p className="text-gray-700 font-medium">{data.namaTsk || "-"}</p>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Perusahaan</label>
                <p className="text-gray-700 font-medium">{data.namaPerusahaanProgres || "-"}</p>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Lokasi Kerja</label>
                <p className="text-gray-700 font-medium">{data.lokasiPerusahaan || "-"}</p>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Jadwal Keberangkatan</label>
                <p className="text-gray-700 font-medium">{data.jadwalKeberangkatan || "-"}</p>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Status COE</label>
                <p className="text-gray-700 font-medium">{data.coeTerbit || "-"}</p>
              </div>
            </div>
          </div>
          {data.updatedAt && (
            <p className="mt-4 text-[10px] text-gray-400 italic text-right">
              Terakhir diperbarui: {new Date(data.updatedAt).toLocaleString('id-ID')}
            </p>
          )}
        </div>

        {/* RINGKASAN DATA KANDIDAT */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">Ringkasan Profil</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500">Nama Lengkap</span>
              <span className="text-gray-800 font-medium">{data.namaLengkap}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500">Kategori</span>
              <span className="text-gray-800 font-medium">{data.kategoriKandidat}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500">Bidang Kerja</span>
              <span className="text-gray-800 font-medium">{data.bidangKerja}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500">Email</span>
              <span className="text-gray-800 font-medium">{data.email}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500">No. HP</span>
              <span className="text-gray-800 font-medium">{data.noHp}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500">Kode Job</span>
              <span className="text-gray-800 font-medium">{data.kodeJob || "-"}</span>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-blue-700 leading-relaxed">
              Data Anda telah tersimpan dengan aman di sistem kami. Tim admin akan melakukan verifikasi dan memperbarui status progres Anda secara berkala. Pastikan No. HP Anda aktif untuk memudahkan koordinasi.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
