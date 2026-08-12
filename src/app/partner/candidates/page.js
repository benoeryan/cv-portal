"use client";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import DriveImage from "@/components/DriveImage";

export default function PartnerCandidatePage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBidang, setFilterBidang] = useState("");

  useEffect(() => {
    if (!authLoading && (!user || userData?.role !== "partner")) {
      router.push("/");
      return;
    }
    if (user && userData?.role === "partner") {
      loadCandidates();
    }
  }, [user, userData, authLoading]);

  const loadCandidates = async () => {
    setLoading(true);
    try {
      // Fetch candidates who have SSW and are pending or have no status
      const q = query(collection(db, "candidates"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(c => {
          // Rule: Must have SSW (either 1 or 2)
          const hasSSW = (c.sertifikatSSW && c.sertifikatSSW.includes("http")) ||
                         (c.sertifikatSSW2 && c.sertifikatSSW2.includes("http"));

          // Rule: Available status
          const isAvailable = !c.statusProgres || c.statusProgres === "Pending Nunggu Job";

          return hasSSW && isAvailable;
        });

      setCandidates(data);
    } catch (err) {
      console.error("Error loading candidates:", err);
    }
    setLoading(false);
  };

  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      const matchSearch = !searchTerm || c.namaLengkap?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchBidang = !filterBidang || c.bidangKerja === filterBidang;
      return matchSearch && matchBidang;
    });
  }, [candidates, searchTerm, filterBidang]);

  const uniqueBidang = useMemo(() => [...new Set(candidates.map(c => c.bidangKerja).filter(Boolean))].sort(), [candidates]);

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Cari Siswa Tersedia</h1>
            <p className="text-gray-500 text-sm">Menampilkan siswa yang sudah memiliki sertifikat SSW & siap disalurkan</p>
          </div>
          <div className="bg-purple-50 text-purple-700 px-4 py-2 rounded-xl text-sm font-bold border border-purple-100">
            {candidates.length} Siswa Siap Kerja
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="md:col-span-2 relative">
            <svg className="w-5 h-5 absolute left-3 top-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              className="input-field pl-10"
              placeholder="Cari nama siswa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="input-field"
            value={filterBidang}
            onChange={(e) => setFilterBidang(e.target.value)}
          >
            <option value="">Semua Bidang Kerja</option>
            {uniqueBidang.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        {/* Grid List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCandidates.map((c) => (
            <div key={c.id} className="card group hover:border-blue-600 transition-all duration-300">
              <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-4 bg-gray-100">
                <DriveImage url={c.pasPhoto || c.sertifikatBahasaJepang} alt={c.namaLengkap} />
                <div className="absolute top-2 right-2 flex flex-col gap-1">
                  {c.sertifikatSSW && (
                    <span className="bg-blue-600 text-white text-[8px] font-black px-2 py-0.5 rounded uppercase">SSW 1</span>
                  )}
                  {c.sertifikatSSW2 && (
                    <span className="bg-purple-600 text-white text-[8px] font-black px-2 py-0.5 rounded uppercase">SSW 2</span>
                  )}
                </div>
              </div>

              <h3 className="font-bold text-gray-800 uppercase tracking-tight truncate leading-tight">{c.namaLengkap}</h3>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">{c.bidangKerja || "Umum"}</p>

              <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-2 text-[10px]">
                <div className="text-gray-400">
                  <p className="uppercase font-bold tracking-tighter">Pendidikan</p>
                  <p className="text-gray-700 font-bold truncate">{c.smaNama || c.univNama || "-"}</p>
                </div>
                <div className="text-gray-400">
                  <p className="uppercase font-bold tracking-tighter">Usia</p>
                  <p className="text-gray-700 font-bold">
                    {c.tanggalLahir ? (new Date().getFullYear() - new Date(c.tanggalLahir).getFullYear()) + " Thn" : "-"}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Link
                  href={`/admin/cv/${c.id}`}
                  target="_blank"
                  className="flex-1 text-center py-2 bg-gray-100 text-gray-700 text-[10px] font-black rounded-lg hover:bg-gray-200 transition-colors uppercase"
                >
                  Lihat CV
                </Link>
                <a
                  href={`https://wa.me/6281234567890?text=Halo%20Admin%20IJEF,%20saya%20tertarik%20dengan%20kandidat%20${encodeURIComponent(c.namaLengkap)}%20untuk%20disalurkan.`}
                  target="_blank"
                  className="flex-1 text-center py-2 bg-green-500 text-white text-[10px] font-black rounded-lg hover:bg-green-600 transition-colors uppercase"
                >
                  Pilih Siswa
                </a>
              </div>
            </div>
          ))}
        </div>

        {filteredCandidates.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-gray-400 italic">Tidak ada siswa yang sesuai dengan kriteria.</p>
          </div>
        )}
      </div>
    </>
  );
}
