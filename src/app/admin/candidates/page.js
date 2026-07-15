"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { translateToJapanese } from "@/lib/translateHelper";
import Navbar from "@/components/Navbar";
import DriveImage from "@/components/DriveImage";
import Link from "next/link";

export default function AdminCandidatesPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBidang, setFilterBidang] = useState("");
  const [filterKategori, setFilterKategori] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [selected, setSelected] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // single delete
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [extractingAll, setExtractingAll] = useState(false);
  const [translatingAll, setTranslatingAll] = useState(false);
  const [bulkProgress, setBulkProgress] = useState("");

  useEffect(() => {
    if (!authLoading && (!user || !["admin", "viewer", "approval"].includes(userData?.role))) {
      router.push("/");
      return;
    }
    if (user && ["admin", "viewer", "approval"].includes(userData?.role)) {
      loadCandidates();
    }
  }, [user, userData, authLoading]);

  const loadCandidates = async () => {
    try {
      const q = query(collection(db, "candidates"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Advanced sorting: Newest first, Invalid/Missing dates at the bottom
      data.sort((a, b) => {
        const dateA = a.submittedAt ? new Date(a.submittedAt) : null;
        const dateB = b.submittedAt ? new Date(b.submittedAt) : null;

        const isValidA = dateA instanceof Date && !isNaN(dateA);
        const isValidB = dateB instanceof Date && !isNaN(dateB);

        if (isValidA && isValidB) {
          return dateB - dateA; // Newest first
        }
        if (isValidA && !isValidB) return -1; // A comes first
        if (!isValidA && isValidB) return 1;  // B comes first
        return 0; // Both invalid
      });

      setCandidates(data);
    } catch (err) {
      console.error("Error loading candidates:", err);
    }
    setLoading(false);
  };

  const filtered = candidates.filter((c) => {
    const matchSearch = !searchTerm ||
      c.namaLengkap?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.kodeJob?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.namaPanggilan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.namaTsk?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.namaPerusahaanProgres?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchBidang = !filterBidang || c.bidangKerja === filterBidang;
    const matchKategori = !filterKategori || c.kategoriKandidat === filterKategori;
    const matchStatus = !filterStatus || c.statusProgres === filterStatus;
    const matchDate = !filterDate || (c.submittedAt && c.submittedAt.startsWith(filterDate));
    return matchSearch && matchBidang && matchKategori && matchStatus && matchDate;
  });

  const uniqueBidang = [...new Set(candidates.map((c) => c.bidangKerja).filter(Boolean))];
  const uniqueKategori = [...new Set(candidates.map((c) => c.kategoriKandidat).filter(Boolean))];

  // Selection handlers
  const toggleSelect = (id) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };
  const selectAll = () => {
    if (selected.length === filtered.length) {
      setSelected([]);
    } else {
      setSelected(filtered.map((c) => c.id));
    }
  };

  // Delete single
  const handleDeleteSingle = (candidate) => {
    setDeleteTarget(candidate);
    setShowDeleteConfirm(true);
    setConfirmText("");
  };

  // Delete selected (bulk)
  const handleDeleteBulk = () => {
    setDeleteTarget(null);
    setShowDeleteConfirm(true);
    setConfirmText("");
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (confirmText !== "HAPUS") return;
    setDeleting(true);

    try {
      if (deleteTarget) {
        // Single delete
        await deleteDoc(doc(db, "candidates", deleteTarget.id));
        setCandidates((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      } else {
        // Bulk delete
        for (const id of selected) {
          await deleteDoc(doc(db, "candidates", id));
        }
        setCandidates((prev) => prev.filter((c) => !selected.includes(c.id)));
        setSelected([]);
      }
    } catch (err) {
      alert("Error: " + err.message);
    }

    setDeleting(false);
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
    setConfirmText("");
  };

  // Reset all
  const handleResetAll = () => {
    setSelected(filtered.map((c) => c.id));
    setDeleteTarget(null);
    setShowDeleteConfirm(true);
    setConfirmText("");
  };

  // Bulk extract certificates
  const handleBulkExtract = async () => {
    const targets = selected.length > 0
      ? filtered.filter((c) => selected.includes(c.id))
      : filtered;

    if (targets.length === 0) return;

    if (!window.confirm(`Proses ekstraksi sertifikat untuk ${targets.length} kandidat?`)) return;

    setExtractingAll(true);
    setBulkProgress("Mengekstrak sertifikat... 0/" + targets.length);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < targets.length; i++) {
      const candidate = targets[i];
      setBulkProgress(`Mengekstrak sertifikat... ${i + 1}/${targets.length}`);

      const updates = {};
      let candidateFailed = false;

      // Extract tanggalJFT from sertifikatBahasaJepang
      if (candidate.sertifikatBahasaJepang) {
        try {
          const res = await fetch("/api/extract-cert-date", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: candidate.sertifikatBahasaJepang }),
          });
          const data = await res.json();
          if (data.success && data.date) {
            updates.tanggalJFT = data.date;
          }
        } catch (err) {
          console.error("Extract JFT error:", err);
          candidateFailed = true;
        }
      }

      // Extract tanggalSSW (or tanggalSSWKaigo for KAIGO) from sertifikatSSW
      if (candidate.sertifikatSSW) {
        try {
          const res = await fetch("/api/extract-cert-date", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: candidate.sertifikatSSW }),
          });
          const data = await res.json();
          if (data.success && data.date) {
            if (candidate.bidangKerja === "KAIGO") {
              updates.tanggalSSWKaigo = data.date;
            } else {
              updates.tanggalSSW = data.date;
            }
          }
        } catch (err) {
          console.error("Extract SSW error:", err);
          candidateFailed = true;
        }
      }

      // Extract tanggalShuryoShomei from sertifikatSenmonkyuu
      if (candidate.sertifikatSenmonkyuu) {
        try {
          const res = await fetch("/api/extract-cert-date", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: candidate.sertifikatSenmonkyuu }),
          });
          const data = await res.json();
          if (data.success && data.date) {
            updates.tanggalShuryoShomei = data.date;
          }
        } catch (err) {
          console.error("Extract Senmonkyuu error:", err);
          candidateFailed = true;
        }
      }

      // Update Firestore if we have any extracted dates
      if (Object.keys(updates).length > 0) {
        try {
          await updateDoc(doc(db, "candidates", candidate.id), updates);
          if (!candidateFailed) successCount++;
          else failCount++;
        } catch (err) {
          console.error("Update doc error:", err);
          failCount++;
        }
      } else if (candidateFailed) {
        failCount++;
      } else {
        // No cert URLs to process, count as success (nothing to do)
        successCount++;
      }
    }

    setExtractingAll(false);
    setBulkProgress(`Selesai! Berhasil: ${successCount}, Gagal: ${failCount}`);
    loadCandidates();
  };

  // Bulk translate
  const handleBulkTranslate = async () => {
    const targets = selected.length > 0
      ? filtered.filter((c) => selected.includes(c.id))
      : filtered;

    if (targets.length === 0) return;

    if (!window.confirm(`Proses terjemahan untuk ${targets.length} kandidat?`)) return;

    const TRANSLATABLE_FIELDS = ["kelebihan", "kekurangan", "alasanKeJepang", "alasanMelamarBidang", "alasanKaigofukushishi", "impianMasaDepan"];

    setTranslatingAll(true);
    setBulkProgress("Menerjemahkan... 0/" + targets.length);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < targets.length; i++) {
      const candidate = targets[i];
      setBulkProgress(`Menerjemahkan... ${i + 1}/${targets.length}`);

      const translations = candidate.translations || {};
      let candidateFailed = false;

      for (let j = 0; j < TRANSLATABLE_FIELDS.length; j++) {
        const field = TRANSLATABLE_FIELDS[j];
        if (candidate[field] && candidate[field].trim()) {
          try {
            const translated = await translateToJapanese(candidate[field]);
            translations[field] = translated;
          } catch (err) {
            console.error(`Translate error for ${field}:`, err);
            candidateFailed = true;
          }
          // Delay between fields to avoid rate limiting
          await new Promise((r) => setTimeout(r, 500));
        }
      }

      // Translate pekerjaan uraian fields
      const pekerjaan = candidate.pekerjaan || [];
      for (let j = 0; j < pekerjaan.length; j++) {
        if (pekerjaan[j]?.uraian && pekerjaan[j].uraian.trim()) {
          try {
            const translated = await translateToJapanese(pekerjaan[j].uraian);
            translations[`pekerjaan_${j}_uraian`] = translated;
          } catch (err) {
            console.error(`Translate error for pekerjaan_${j}_uraian:`, err);
            candidateFailed = true;
          }
          // Delay between fields to avoid rate limiting
          await new Promise((r) => setTimeout(r, 500));
        }
      }

      // Save translations to Firestore
      try {
        await updateDoc(doc(db, "candidates", candidate.id), { translations });
        if (!candidateFailed) successCount++;
        else failCount++;
      } catch (err) {
        console.error("Update translations error:", err);
        failCount++;
      }

      // Delay between candidates to avoid rate limiting
      if (i < targets.length - 1) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    setTranslatingAll(false);
    setBulkProgress(`Selesai! Berhasil: ${successCount}, Gagal: ${failCount}`);
    loadCandidates();
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
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Data Kandidat</h1>
            <p className="text-gray-500 text-xs sm:text-sm">{candidates.length} kandidat terdaftar</p>
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {userData?.role === "admin" && (
              <button
                onClick={handleBulkExtract}
                disabled={extractingAll || translatingAll}
                className="flex-1 md:flex-none bg-green-600 text-white px-3 py-2 rounded-lg text-xs hover:bg-green-700 disabled:opacity-50"
              >
                Ekstraksi Sertifikat
              </button>
            )}
            {userData?.role === "admin" && (
              <button
                onClick={handleBulkTranslate}
                disabled={extractingAll || translatingAll}
                className="flex-1 md:flex-none bg-purple-600 text-white px-3 py-2 rounded-lg text-xs hover:bg-purple-700 disabled:opacity-50"
              >
                Translate Semua
              </button>
            )}
            {userData?.role === "admin" && selected.length > 0 && (
              <button onClick={handleDeleteBulk} className="flex-1 md:flex-none bg-red-500 text-white px-3 py-2 rounded-lg text-xs hover:bg-red-600">
                Hapus ({selected.length})
              </button>
            )}
            {userData?.role === "admin" && (
              <button onClick={handleResetAll} className="flex-1 md:flex-none bg-red-100 text-red-700 px-3 py-2 rounded-lg text-xs hover:bg-red-200">
                Reset Semua
              </button>
            )}
          </div>
        </div>

        {/* Progress Banner */}
        {(extractingAll || translatingAll) && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600"></div>
            <span className="text-xs sm:text-sm font-medium text-yellow-800">{bulkProgress}</span>
          </div>
        )}

        {/* Filters */}
        <div className="card mb-6 p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
            <div>
              <label className="form-label text-xs">Cari</label>
              <input className="input-field text-sm" placeholder="Nama / Kode Job..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div>
              <label className="form-label text-xs">Tanggal Submit</label>
              <input type="date" className="input-field text-sm" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
            </div>
            <div>
              <label className="form-label text-xs">Kategori</label>
              <select className="input-field text-sm" value={filterKategori} onChange={(e) => setFilterKategori(e.target.value)}>
                <option value="">Semua</option>
                {uniqueKategori.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label text-xs">Bidang</label>
              <select className="input-field text-sm" value={filterBidang} onChange={(e) => setFilterBidang(e.target.value)}>
                <option value="">Semua</option>
                {uniqueBidang.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label text-xs font-medium text-gray-600">Status Progres</label>
              <select className="input-field text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">Semua</option>
                <option value="On Proses">On Proses</option>
                <option value="Pending Nunggu Job">Pending Nunggu Job</option>
                <option value="Cancel">Cancel</option>
                <option value="Status On Job (Selesai)">Status On Job (Selesai)</option>
              </select>
            </div>
            <div className="flex items-end space-x-2">
              <button
                onClick={() => {
                  setSearchTerm("");
                  setFilterDate("");
                  setFilterKategori("");
                  setFilterBidang("");
                  setFilterStatus("");
                }}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium mb-3"
              >
                Reset Filter
              </button>
              <span className="text-xs sm:text-sm text-gray-500 font-medium mb-3">{filtered.length} hasil</span>
            </div>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="py-3 px-2">
                    <input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={selectAll} className="rounded" />
                  </th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Foto</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Nama Lengkap</th>
                  <th className="text-left py-3 px-1 font-medium text-gray-600">Bidang</th>
                  <th className="text-left py-3 px-1 font-medium text-gray-600">Kategori</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Kode Job</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Status</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Detail Progres</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">No HP</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600 whitespace-nowrap">Tgl Submit</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const submitDate = c.submittedAt ? new Date(c.submittedAt) : null;
                  const isValidDate = submitDate && !isNaN(submitDate);

                  return (
                    <tr key={c.id} className={`border-b border-gray-100 hover:bg-gray-50 ${selected.includes(c.id) ? "bg-blue-50" : ""}`}>
                      <td className="py-3 px-2">
                        <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggleSelect(c.id)} className="rounded" />
                      </td>
                      <td className="py-3 px-2">
                        <DriveImage url={c.pasPhoto || c.sertifikatBahasaJepang} alt={c.namaLengkap} />
                      </td>
                      <td className="py-3 px-2">
                        <div className="font-medium text-gray-800 line-clamp-2">{c.namaLengkap}</div>
                        <div className="text-xs text-gray-400">{c.namaPanggilan}</div>
                      </td>
                      <td className="py-3 px-1">
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] whitespace-nowrap">{c.bidangKerja}</span>
                      </td>
                      <td className="py-3 px-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] whitespace-nowrap ${
                          c.kategoriKandidat === "NEW COMER" ? "bg-green-100 text-green-700" :
                          c.kategoriKandidat === "EX-MAGANG/EX-TRAINEER" ? "bg-purple-100 text-purple-700" :
                          "bg-orange-100 text-orange-700"
                        }`}>{c.kategoriKandidat}</span>
                      </td>
                      <td className="py-3 px-2 text-gray-600 text-xs">{c.kodeJob || "-"}</td>
                      <td className="py-3 px-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${
                          c.statusProgres === "On Proses" ? "bg-sky-100 text-sky-700" :
                          c.statusProgres === "Pending Nunggu Job" ? "bg-amber-100 text-amber-700" :
                          c.statusProgres === "Cancel" ? "bg-rose-100 text-rose-700" :
                          c.statusProgres === "Status On Job (Selesai)" ? "bg-emerald-100 text-emerald-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>
                          {c.statusProgres || "Belum Ada"}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-[10px] text-gray-600 min-w-[150px]">
                        <div className="line-clamp-3">
                          {c.namaTsk && <div>TSK: {c.namaTsk}</div>}
                          {c.namaPerusahaanProgres && <div>Co: {c.namaPerusahaanProgres}</div>}
                          {(!c.namaTsk && !c.namaPerusahaanProgres) && "-"}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-gray-600 text-xs">{c.noHp}</td>
                      <td className="py-3 px-2 text-xs text-gray-500 whitespace-nowrap">
                        {isValidDate ? (
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-700">{submitDate.toLocaleDateString('id-ID')}</span>
                            <span className="text-[10px] text-gray-400">{submitDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                            {(new Date() - submitDate) < 24 * 60 * 60 * 1000 && (
                              <span className="mt-1 w-fit bg-red-100 text-red-600 px-1 py-0.5 rounded text-[8px] font-bold">BARU</span>
                            )}
                          </div>
                        ) : "-"}
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex space-x-2">
                          <Link href={`/admin/cv/${c.id}`} className="text-blue-600 hover:underline text-xs">CV</Link>
                          {(userData?.role === "admin" || userData?.role === "approval") && (
                            <Link href={`/admin/edit/${c.id}`} className="text-green-600 hover:underline text-xs">Edit</Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile/Tablet Card View */}
        <div className="lg:hidden space-y-4">
          {filtered.map((c) => {
            const submitDate = c.submittedAt ? new Date(c.submittedAt) : null;
            const isValidDate = submitDate && !isNaN(submitDate);

            return (
              <div key={c.id} className={`card p-4 relative ${selected.includes(c.id) ? "border-blue-500 ring-1 ring-blue-500" : ""}`}>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 relative">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border border-gray-100">
                      <DriveImage url={c.pasPhoto || c.sertifikatBahasaJepang} alt={c.namaLengkap} />
                    </div>
                    <div className="absolute -top-2 -left-2">
                      <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggleSelect(c.id)} className="w-5 h-5 rounded" />
                    </div>
                  </div>

                  <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-gray-800 text-sm sm:text-base truncate leading-tight">{c.namaLengkap}</h3>
                        <p className="text-xs text-gray-400">{c.namaPanggilan}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                        c.statusProgres === "On Proses" ? "bg-sky-100 text-sky-700" :
                        c.statusProgres === "Pending Nunggu Job" ? "bg-amber-100 text-amber-700" :
                        c.statusProgres === "Cancel" ? "bg-rose-100 text-rose-700" :
                        c.statusProgres === "Status On Job (Selesai)" ? "bg-emerald-100 text-emerald-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {c.statusProgres || "NEW"}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-medium">{c.bidangKerja}</span>
                      <span className="bg-gray-50 text-gray-500 px-2 py-0.5 rounded text-[10px] font-medium">{c.kodeJob || "-"}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-50 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-gray-400 text-[10px] font-medium uppercase">Kategori</p>
                    <p className="font-semibold text-gray-700">{c.kategoriKandidat}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-[10px] font-medium uppercase text-right">Tanggal Submit</p>
                    <p className="font-semibold text-gray-700 text-right">
                      {isValidDate ? submitDate.toLocaleDateString('id-ID') : "-"}
                      {isValidDate && (new Date() - submitDate) < 24 * 60 * 60 * 1000 && (
                        <span className="ml-1 text-[8px] text-red-500 font-bold">BARU</span>
                      )}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-400 text-[10px] font-medium uppercase">No HP</p>
                    <p className="font-semibold text-gray-700">{c.noHp}</p>
                  </div>
                  {c.namaTsk && (
                    <div className="col-span-2 bg-gray-50 p-2 rounded">
                      <p className="text-[10px] text-gray-500">TSK: <span className="text-gray-800 font-medium">{c.namaTsk}</span></p>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex gap-2">
                  <Link href={`/admin/cv/${c.id}`} className="flex-1 bg-blue-50 text-blue-600 text-center py-2 rounded-lg font-bold text-xs hover:bg-blue-100 transition-colors">Lihat CV</Link>
                  {(userData?.role === "admin" || userData?.role === "approval") && (
                    <Link href={`/admin/edit/${c.id}`} className="flex-1 bg-green-50 text-green-600 text-center py-2 rounded-lg font-bold text-xs hover:bg-green-100 transition-colors">Edit Data</Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="card py-12 text-center text-gray-400">Tidak ada data ditemukan</div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-red-600 mb-2">Konfirmasi Hapus</h3>
            <p className="text-sm text-gray-600 mb-4">
              {deleteTarget
                ? `Apakah Anda yakin ingin menghapus data "${deleteTarget.namaLengkap}"?`
                : `Apakah Anda yakin ingin menghapus ${selected.length} data kandidat?`
              }
            </p>
            <p className="text-sm text-gray-500 mb-3">
              Ketik <strong className="text-red-600">HAPUS</strong> untuk konfirmasi:
            </p>
            <input
              className="input-field mb-4"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Ketik HAPUS"
            />
            <div className="flex space-x-3 justify-end">
              <button onClick={() => { setShowDeleteConfirm(false); setConfirmText(""); }} className="btn-secondary">
                Batal
              </button>
              <button
                onClick={confirmDelete}
                disabled={confirmText !== "HAPUS" || deleting}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? "Menghapus..." : "Hapus Permanen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
