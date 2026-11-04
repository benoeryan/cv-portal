"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import Navbar from "@/components/Navbar";
import CVTemplate from "@/components/CVTemplate";
import { getBackupCandidates } from "@/lib/backupData";

export default function AdminCVViewPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || userData?.role !== "admin")) {
      router.push("/");
      return;
    }
    if (user && params.id) {
      loadData();
    }
  }, [user, userData, authLoading, params.id]);

  const loadData = async () => {
    try {
      const docRef = doc(db, "candidates", params.id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setData(docSnap.data());
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error("Firestore getDoc error, searching backup:", err);
    }

    const backups = getBackupCandidates();
    const found = backups.find(c => String(c.id) === String(params.id) || String(c.namaLengkap).toLowerCase().includes(String(params.id).toLowerCase()));
    if (found) {
      setData(found);
    }
    setLoading(false);
  };

  const handlePrint = () => {
    window.print();
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
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <div className="card">
            <p className="text-gray-500">Data kandidat tidak ditemukan.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6 no-print">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">CV - {data.namaLengkap}</h1>
            <p className="text-gray-500 text-sm">Bidang: {data.bidangKerja} | Kode Job: {data.kodeJob}</p>
          </div>
          <div className="flex space-x-3">
            <button onClick={() => router.back()} className="btn-secondary">
              Kembali
            </button>
            <button onClick={handlePrint} className="btn-primary">
              Print / Cetak PDF
            </button>
          </div>
        </div>
        <CVTemplate data={data} />
      </div>
    </>
  );
}
