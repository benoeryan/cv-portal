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
      // Sort by submittedAt desc
      data.sort((a, b) => (b.submittedAt || "").localeCompare(a.submittedAt || ""));
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
      c.namaPanggilan?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchBidang = !filterBidang || c.bidangKerja === filterBidang;
    const matchKategori = !filterKategori || c.kategoriKandidat === filterKategori;
    return matchSearch && matchBidang && matchKategori;
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

    setExtractingAll(true);
    setBulkProgress("Mengekstrak sertifikat... 0/" + targets.length);

    for (let i = 0; i < targets.length; i++) {
      const candidate = targets[i];
      setBulkProgress(`Mengekstrak sertifikat... ${i + 1}/${targets.length}`);

      const updates = {};

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
        }
      }

      // Update Firestore if we have any extracted dates
      if (Object.keys(updates).length > 0) {
        try {
          await updateDoc(doc(db, "candidates", candidate.id), updates);
        } catch (err) {
          console.error("Update doc error:", err);
        }
      }
    }

    setExtractingAll(false);
    setBulkProgress("");
    loadCandidates();
  };

  // Bulk translate
  const handleBulkTranslate = async () => {
    const targets = selected.length > 0
      ? filtered.filter((c) => selected.includes(c.id))
      : filtered;

    if (targets.length === 0) return;

    const TRANSLATABLE_FIELDS = ["kelebihan", "kekurangan", "alasanKeJepang", "alasanMelamarBidang", "alasanKaigofukushishi", "impianMasaDepan"];

    setTranslatingAll(true);
    setBulkProgress("Menerjemahkan... 0/" + targets.length);

    for (let i = 0; i < targets.length; i++) {
      const candidate = targets[i];
      setBulkProgress(`Menerjemahkan... ${i + 1}/${targets.length}`);

      const translations = candidate.translations || {};

      for (const field of TRANSLATABLE_FIELDS) {
        if (candidate[field] && candidate[field].trim()) {
          try {
            const translated = await translateToJapanese(candidate[field]);
            translations[field] = translated;
          } catch (err) {
            console.error(`Translate error for ${field}:`, err);
          }
        }
      }

      // Save translations to Firestore
      try {
        await updateDoc(doc(db, "candidates", candidate.id), { translations });
      } catch (err) {
        console.error("Update translations error:", err);
      }

      // Delay between candidates to avoid rate limiting
      if (i < targets.length - 1) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    setTranslatingAll(false);
    setBulkProgress("");
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
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Data Kandidat</h1>
            <p className="text-gray-500 text-sm">{candidates.length} kandidat terdaftar</p>
          </div>
          <div className="flex space-x-2">
            {userData?.role === "admin" && (
              <button
                onClick={handleBulkExtract}
                disabled={extractingAll || translatingAll}
                className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Ekstraksi Semua Sertifikat
              </button>
            )}
            {userData?.role === "admin" && (
              <button
                onClick={handleBulkTranslate}
                disabled={extractingAll || translatingAll}
                className="bg-purple-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Translate Semua
              </button>
            )}
            {userData?.role === "admin" && selected.length > 0 && (
              <button onClick={handleDeleteBulk} className="bg-red-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-red-600">
                Hapus {selected.length} terpilih
              </button>
            )}
            {userData?.role === "admin" && (
              <button onClick={handleResetAll} className="bg-red-100 text-red-700 px-3 py-2 rounded-lg text-sm hover:bg-red-200">
                Reset Semua
              </button>
            )}
          </div>
        </div>

        {/* Progress Banner */}
        {(extractingAll || translatingAll) && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600"></div>
            <span className="text-sm font-medium text-yellow-800">{bulkProgress}</span>
          </div>
        )}

        {/* Filters */}
        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="form-label">Cari</label>
              <input className="input-field" placeholder="Nama / Kode Job..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Kategori</label>
              <select className="input-field" value={filterKategori} onChange={(e) => setFilterKategori(e.target.value)}>
                <option value="">Semua</option>
                {uniqueKategori.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Bidang</label>
              <select className="input-field" value={filterBidang} onChange={(e) => setFilterBidang(e.target.value)}>
                <option value="">Semua</option>
                {uniqueBidang.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <span className="text-sm text-gray-500">{filtered.length} hasil</span>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-3 px-2">
                  <input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={selectAll} className="rounded" />
                </th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">Foto</th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">Nama Lengkap</th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">Bidang</th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">Kategori</th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">Kode Job</th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">No HP</th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className={`border-b border-gray-100 hover:bg-gray-50 ${selected.includes(c.id) ? "bg-blue-50" : ""}`}>
                  <td className="py-3 px-2">
                    <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggleSelect(c.id)} className="rounded" />
                  </td>
                  <td className="py-3 px-2">
                    <DriveImage url={c.pasPhoto || c.sertifikatBahasaJepang} alt={c.namaLengkap} />
                  </td>
                  <td className="py-3 px-2">
                    <div className="font-medium text-gray-800">{c.namaLengkap}</div>
                    <div className="text-xs text-gray-400">{c.namaPanggilan}</div>
                  </td>
                  <td className="py-3 px-2">
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">{c.bidangKerja}</span>
                  </td>
                  <td className="py-3 px-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      c.kategoriKandidat === "NEW COMER" ? "bg-green-100 text-green-700" :
                      c.kategoriKandidat === "EX-MAGANG/EX-TRAINEER" ? "bg-purple-100 text-purple-700" :
                      "bg-orange-100 text-orange-700"
                    }`}>{c.kategoriKandidat}</span>
                  </td>
                  <td className="py-3 px-2 text-gray-600">{c.kodeJob}</td>
                  <td className="py-3 px-2 text-gray-600 text-xs">{c.noHp}</td>
                  <td className="py-3 px-2">
                    <div className="flex space-x-2">
                      <Link href={`/admin/cv/${c.id}`} className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                        CV
                      </Link>
                      {(userData?.role === "admin" || userData?.role === "approval") && (
                        <Link href={`/admin/edit/${c.id}`} className="text-green-600 hover:text-green-800 text-xs font-medium">
                          Edit
                        </Link>
                      )}
                      {userData?.role === "admin" && (
                        <button onClick={() => handleDeleteSingle(c)} className="text-red-500 hover:text-red-700 text-xs font-medium">
                          Hapus
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan="8" className="py-8 text-center text-gray-400">Tidak ada data</td></tr>
              )}
            </tbody>
          </table>
        </div>
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
