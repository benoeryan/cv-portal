"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import Navbar from "@/components/Navbar";
import { translateToJapanese, translateToIndonesian } from "@/lib/translateHelper";
import JapaneseDatePicker from "@/components/JapaneseDatePicker";

// Fields that should be translated to Japanese
const TRANSLATABLE_FIELDS = [
  { key: "kelebihan", label: "Kelebihan" },
  { key: "kekurangan", label: "Kekurangan" },
  { key: "alasanKeJepang", label: "Alasan ke Jepang" },
  { key: "alasanMelamarBidang", label: "Alasan Melamar Bidang" },
  { key: "alasanKaigofukushishi", label: "Alasan Kaigofukushishi" },
  { key: "impianMasaDepan", label: "Impian Masa Depan" },
  { key: "hobi", label: "Hobi" },
  { key: "promosiDiri", label: "Promosi Diri" },
  { key: "deskripsiMagang", label: "Deskripsi Magang" },
  { key: "riwayatRelevan", label: "Riwayat Relevan" },
  { key: "tempatLahir", label: "Tempat Lahir" },
  { key: "alamatLengkap", label: "Alamat Lengkap" },
];

const CERT_TEMPLATES = [
  { nama: "国際交流基金日本語基礎テスト (JFT)", field: "tanggalJFT" },
  { nama: "介護日本語評価試験結果通知書", field: "tanggalSSW" },
  { nama: "介護日本語評価試験結果通知書 (Kaigo)", field: "tanggalSSWKaigo" },
  { nama: "日本語能力試験 (JLPT)", field: "tanggalJLPT" },
  { nama: "技能実習修了証明書", field: "tanggalShuryoShomei" },
];

export default function EditCandidatePage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [data, setData] = useState(null);
  const [translations, setTranslations] = useState({});
  const [fieldTranslating, setFieldTranslating] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("data"); // data | certs | japanese
  const [viewerUrl, setViewerUrl] = useState("");
  const [viewerTitle, setViewerTitle] = useState("");

  const handleOpenViewer = (url, title) => {
    if (!url) return;
    let embedUrl = url;
    const patterns = [
      /\/open\?id=([a-zA-Z0-9_-]+)/,
      /\/file\/d\/([a-zA-Z0-9_-]+)/,
      /id=([a-zA-Z0-9_-]+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        embedUrl = `https://drive.google.com/file/d/${match[1]}/preview`;
        break;
      }
    }
    setViewerUrl(embedUrl);
    setViewerTitle(title);
  };

  const handleDownload = async (url, filename = "document") => {
    if (!url) return;

    // Construct proxy download URL
    const nameSlug = data.namaLengkap.replace(/\s+/g, '_');
    const proxyUrl = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(`${nameSlug}_${filename}`)}`;

    // Use a hidden anchor to trigger download from the proxy
    const link = document.createElement('a');
    link.href = proxyUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (!authLoading && (!user || userData?.role !== "admin")) {
      router.push("/");
      return;
    }
    if (user && params.id) loadData();
  }, [user, userData, authLoading, params.id]);

  const loadData = async () => {
    try {
      const docRef = doc(db, "candidates", params.id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const d = docSnap.data();
        setData(d);
        setTranslations(d.translations || {});
      }
    } catch (err) {
      console.error("Error:", err);
    }
    setLoading(false);
  };

  const handleChange = (key, value) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const handleKeluargaChange = (index, field, value) => {
    const updated = [...(data.keluarga || [{}, {}, {}, {}])];
    updated[index] = { ...updated[index], [field]: value };
    setData((prev) => ({ ...prev, keluarga: updated }));
  };

  const handlePekerjaanChange = (index, field, value) => {
    const updated = [...(data.pekerjaan || [{}, {}, {}, {}])];
    updated[index] = { ...updated[index], [field]: value };
    setData((prev) => ({ ...prev, pekerjaan: updated }));
  };

  const handleTranslationChange = (key, value) => {
    setTranslations((prev) => ({ ...prev, [key]: value }));
  };

  const translateSingleField = async (fieldKey, targetLang) => {
    const loadingKey = `${fieldKey}_${targetLang}`;
    setFieldTranslating((prev) => ({ ...prev, [loadingKey]: true }));
    try {
      if (targetLang === "ja") {
        const text = data[fieldKey];
        if (text && text.trim()) {
          const result = await translateToJapanese(text);
          handleTranslationChange(fieldKey, result);
        }
      } else {
        const text = translations[fieldKey];
        if (text && text.trim()) {
          const result = await translateToIndonesian(text);
          handleChange(fieldKey, result);
        }
      }
    } catch (err) {
      console.error(`Translation error for ${fieldKey} to ${targetLang}:`, err);
    } finally {
      setFieldTranslating((prev) => ({ ...prev, [loadingKey]: false }));
    }
  };

  const translateJobField = async (index, targetLang) => {
    const fieldKey = `pekerjaan_${index}_uraian`;
    const loadingKey = `${fieldKey}_${targetLang}`;
    setFieldTranslating((prev) => ({ ...prev, [loadingKey]: true }));
    try {
      if (targetLang === "ja") {
        const text = data.pekerjaan?.[index]?.uraian;
        if (text && text.trim()) {
          const result = await translateToJapanese(text);
          handleTranslationChange(fieldKey, result);
        }
      } else {
        const text = translations[fieldKey];
        if (text && text.trim()) {
          const result = await translateToIndonesian(text);
          handlePekerjaanChange(index, "uraian", result);
        }
      }
    } catch (err) {
      console.error(`Translation error for ${fieldKey} to ${targetLang}:`, err);
    } finally {
      setFieldTranslating((prev) => ({ ...prev, [loadingKey]: false }));
    }
  };

  const translateFamilyField = async (index, targetLang) => {
    const fieldKey = `keluarga_${index}_pekerjaan`;
    const loadingKey = `${fieldKey}_${targetLang}`;
    setFieldTranslating((prev) => ({ ...prev, [loadingKey]: true }));
    try {
      if (targetLang === "ja") {
        const text = data.keluarga?.[index]?.pekerjaan;
        if (text && text.trim()) {
          const result = await translateToJapanese(text);
          handleTranslationChange(fieldKey, result);
        }
      } else {
        const text = translations[fieldKey];
        if (text && text.trim()) {
          const result = await translateToIndonesian(text);
          handleKeluargaChange(index, "pekerjaan", result);
        }
      }
    } catch (err) {
      console.error(`Translation error for ${fieldKey} to ${targetLang}:`, err);
    } finally {
      setFieldTranslating((prev) => ({ ...prev, [loadingKey]: false }));
    }
  };

  // Auto translate all translatable fields
  const handleAutoTranslate = async () => {
    setTranslating(true);
    const newTranslations = { ...translations };

    for (const field of TRANSLATABLE_FIELDS) {
      if (data[field.key] && data[field.key].trim()) {
        try {
          const result = await translateToJapanese(data[field.key]);
          newTranslations[field.key] = result;
        } catch (err) {
          console.error(`Translation error for ${field.key}:`, err);
        }
      }
    }

    // Translate pekerjaan uraian fields
    const pekerjaan = data.pekerjaan || [];
    for (let i = 0; i < pekerjaan.length; i++) {
      if (pekerjaan[i]?.uraian && pekerjaan[i].uraian.trim()) {
        try {
          const result = await translateToJapanese(pekerjaan[i].uraian);
          newTranslations[`pekerjaan_${i}_uraian`] = result;
        } catch (err) {
          console.error(`Translation error for pekerjaan_${i}_uraian:`, err);
        }
      }
    }

    // Translate keluarga pekerjaan fields
    const keluarga = data.keluarga || [];
    for (let i = 0; i < keluarga.length; i++) {
      if (keluarga[i]?.pekerjaan && keluarga[i].pekerjaan.trim()) {
        try {
          const result = await translateToJapanese(keluarga[i].pekerjaan);
          newTranslations[`keluarga_${i}_pekerjaan`] = result;
        } catch (err) {
          console.error(`Translation error for keluarga_${i}_pekerjaan:`, err);
        }
      }
    }

    setTranslations(newTranslations);
    setTranslating(false);
  };

  const handleFetchCertDates = async () => {
    // Check if any certificate links exist
    const hasJFT = data.sertifikatBahasaJepang && data.sertifikatBahasaJepang.includes("http");
    const hasSSW = data.sertifikatSSW && data.sertifikatSSW.includes("http");
    const hasSenmonkyuu = data.sertifikatSenmonkyuu && data.sertifikatSenmonkyuu.includes("http");
    const hasMagang = data.sertifikatSelesaiMagang && data.sertifikatSelesaiMagang.includes("http");

    if (!hasJFT && !hasSSW && !hasSenmonkyuu && !hasMagang) {
      setMessage("Tidak ada link sertifikat. Isi link di bagian 'Link Dokumen' terlebih dahulu.");
      return;
    }

    setExtracting(true);
    setMessage("");
    const results = [];
    let successCount = 0;
    let failCount = 0;

    // Extract from sertifikatBahasaJepang -> tanggalJFT & tanggalJLPT
    if (hasJFT) {
      try {
        const res = await fetch("/api/extract-cert-date", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: data.sertifikatBahasaJepang }),
        });
        const result = await res.json();
        if (result.success) {
          handleChange("tanggalJFT", result.date);
          handleChange("tanggalJLPT", result.date);
          results.push(`JFT/JLPT: ${result.date}`);
          successCount++;
        } else {
          results.push(`JFT/JLPT: Gagal - ${result.error}`);
          failCount++;
        }
      } catch (err) {
        results.push(`JFT/JLPT: Error - ${err.message}`);
        failCount++;
      }
    }

    // Extract from sertifikatSSW -> tanggalSSW
    if (hasSSW) {
      try {
        const res = await fetch("/api/extract-cert-date", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: data.sertifikatSSW }),
        });
        const result = await res.json();
        if (result.success) {
          handleChange("tanggalSSW", result.date);
          results.push(`SSW: ${result.date}`);
          successCount++;

          if (data.bidangKerja === "KAIGO") {
            handleChange("tanggalSSWKaigo", result.date);
            results.push(`SSW Kaigo: ${result.date}`);
          }
        } else {
          results.push(`SSW: Gagal - ${result.error}`);
          failCount++;
        }
      } catch (err) {
        results.push(`SSW: Error - ${err.message}`);
        failCount++;
      }
    }

    // Extract from sertifikatSenmonkyuu -> tanggalShuryoShomei
    if (hasSenmonkyuu) {
      try {
        const res = await fetch("/api/extract-cert-date", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: data.sertifikatSenmonkyuu }),
        });
        const result = await res.json();
        if (result.success) {
          handleChange("tanggalShuryoShomei", result.date);
          results.push(`Senmonkyuu: ${result.date}`);
          successCount++;
        } else {
          results.push(`Senmonkyuu: Gagal - ${result.error}`);
          failCount++;
        }
      } catch (err) {
        results.push(`Senmonkyuu: Error - ${err.message}`);
        failCount++;
      }
    }

    // Extract from sertifikatSelesaiMagang -> tanggalShuryoShomei (alternative)
    if (hasMagang && !data.tanggalShuryoShomei) {
      try {
        const res = await fetch("/api/extract-cert-date", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: data.sertifikatSelesaiMagang }),
        });
        const result = await res.json();
        if (result.success) {
          handleChange("tanggalShuryoShomei", result.date);
          results.push(`Selesai Magang: ${result.date}`);
          successCount++;
        }
      } catch (err) {}
    }

    setExtracting(false);
    const summary = `Ekstraksi selesai: ${successCount} berhasil${failCount > 0 ? `, ${failCount} gagal` : ""}. ${results.join(" | ")}`;
    setMessage(summary);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, "candidates", params.id), {
        ...data,
        translations,
        updatedAt: new Date().toISOString(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert("Error: " + err.message);
    }
    setSaving(false);
  };

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  if (!data) {
    return <><Navbar /><div className="max-w-4xl mx-auto px-4 py-8"><div className="card text-center text-gray-500">Data tidak ditemukan</div></div></>;
  }

  return (
    <>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Edit: {data.namaLengkap}</h1>
            <p className="text-gray-500 text-sm">{data.bidangKerja} - {data.kategoriKandidat}</p>
          </div>
          <div className="flex space-x-2">
            <button onClick={() => router.back()} className="btn-secondary">Kembali</button>
            <button onClick={handleSave} className="btn-primary" disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </div>

        {saved && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">Data berhasil disimpan!</div>
        )}

        {message && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {message}
            <button onClick={() => setMessage("")} className="float-right text-blue-400 hover:text-blue-600">x</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex space-x-1 mb-6 border-b border-gray-200">
          <button onClick={() => setActiveTab("data")} className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === "data" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            Data Kandidat
          </button>
          <button onClick={() => setActiveTab("progres")} className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === "progres" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            Status Progres
          </button>
          <button onClick={() => setActiveTab("certs")} className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === "certs" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            Sertifikat
          </button>
          <button onClick={() => setActiveTab("japanese")} className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === "japanese" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            Terjemahan Jepang
          </button>
        </div>

        {activeTab === "progres" && (
          <div className="space-y-4 animate-fadeIn">
            <div className="card">
              <h3 className="font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                Manajemen Status Progres Kandidat
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Status Progres</label>
                  <select 
                    className="input-field" 
                    value={data.statusProgres || ""} 
                    onChange={(e) => handleChange("statusProgres", e.target.value)}
                  >
                    <option value="">-- Pilih Status --</option>
                    <option value="On Proses">On Proses</option>
                    <option value="Pending Nunggu Job">Pending Nunggu Job</option>
                    <option value="Cancel">Cancel</option>
                    <option value="Status On Job (Selesai)">Status On Job (Selesai)</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Nama TSK</label>
                  <input 
                    className="input-field" 
                    value={data.namaTsk || ""} 
                    onChange={(e) => handleChange("namaTsk", e.target.value)}
                    placeholder="Masukkan Nama TSK..."
                  />
                </div>
                <div>
                  <label className="form-label">Nama Perusahaan</label>
                  <input 
                    className="input-field" 
                    value={data.namaPerusahaanProgres || ""} 
                    onChange={(e) => handleChange("namaPerusahaanProgres", e.target.value)}
                    placeholder="Masukkan Nama Perusahaan..."
                  />
                </div>
                <div>
                  <label className="form-label">Lokasi Perusahaan</label>
                  <input 
                    className="input-field" 
                    value={data.lokasiPerusahaan || ""} 
                    onChange={(e) => handleChange("lokasiPerusahaan", e.target.value)}
                    placeholder="Masukkan lokasi di Jepang..."
                  />
                </div>
                <div>
                  <label className="form-label">Jadwal Keberangkatan</label>
                  <input 
                    className="input-field" 
                    value={data.jadwalKeberangkatan || ""} 
                    onChange={(e) => handleChange("jadwalKeberangkatan", e.target.value)}
                    placeholder="Contoh: April 2026 atau tanggal keberangkatan..."
                  />
                </div>
                <div>
                  <label className="form-label">COE Terbit</label>
                  <input 
                    className="input-field" 
                    value={data.coeTerbit || ""} 
                    onChange={(e) => handleChange("coeTerbit", e.target.value)}
                    placeholder="Contoh: Terbit / Diproses / Belum Terbit..."
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={handleSave} className="btn-primary" disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan Progres"}
              </button>
            </div>
          </div>
        )}

        {activeTab === "data" && (
          <div className="space-y-4">
            {/* Informasi Referensi & Job */}
            <div className="card">
              <h3 className="font-semibold text-gray-700 mb-3">Informasi Referensi & Job</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Kode Referensi</label>
                  <input className="input-field" value={data.kodeReferensi || ""} onChange={(e) => handleChange("kodeReferensi", e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Kode Job</label>
                  <input className="input-field" value={data.kodeJob || ""} onChange={(e) => handleChange("kodeJob", e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Kategori Kandidat</label>
                  <select className="input-field" value={data.kategoriKandidat || ""} onChange={(e) => handleChange("kategoriKandidat", e.target.value)}>
                    <option value="">-- Pilih --</option>
                    <option value="NEW COMER">NEW COMER</option>
                    <option value="EX-MAGANG/EX-TRAINEER">EX-MAGANG/EX-TRAINEER</option>
                    <option value="ENGINEERING/GIJINKOKU">ENGINEERING/GIJINKOKU</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Domisili</label>
                  <input className="input-field" value={data.domisili || ""} onChange={(e) => handleChange("domisili", e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Bidang Kerja</label>
                  <input className="input-field" value={data.bidangKerja || ""} onChange={(e) => handleChange("bidangKerja", e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Bidang Kerja Lainnya (Manual)</label>
                  <input className="input-field" value={data.bidangKerjaLainnya || ""} onChange={(e) => handleChange("bidangKerjaLainnya", e.target.value)} placeholder="Jika bidang kerja LAINNYA" />
                </div>
              </div>
            </div>

            {/* Data Pribadi (expanded) */}
            <div className="card">
              <h3 className="font-semibold text-gray-700 mb-3">Data Pribadi</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: "namaLengkap", label: "Nama Lengkap" },
                  { key: "namaTangan", label: "Nama (Tulis Tangan - Optional)" },
                  { key: "namaPanggilan", label: "Nama Panggilan" },
                  { key: "noHp", label: "No HP" },
                  { key: "email", label: "Email" },
                  { key: "tanggalLahir", label: "Tanggal Lahir" },
                  { key: "tempatLahir", label: "Tempat Lahir" },
                  { key: "jenisKelamin", label: "Jenis Kelamin" },
                  { key: "agama", label: "Agama" },
                  { key: "golonganDarah", label: "Golongan Darah" },
                  { key: "tinggiBadan", label: "Tinggi Badan (CM)" },
                  { key: "beratBadan", label: "Berat Badan (KG)" },
                  { key: "statusPernikahan", label: "Status" },
                  { key: "dominanTangan", label: "Dominan Tangan" },
                  { key: "butaWarna", label: "Buta Warna" },
                  { key: "merokok", label: "Merokok" },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="form-label">{f.label}</label>
                    <input className="input-field" value={data[f.key] || ""} onChange={(e) => handleChange(f.key, e.target.value)} />
                  </div>
                ))}
                {data.merokok === "YA" && (
                  <div>
                    <label className="form-label">Jumlah Rokok/Hari</label>
                    <input className="input-field" value={data.jumlahRokok || ""} onChange={(e) => handleChange("jumlahRokok", e.target.value)} />
                  </div>
                )}
                <div>
                  <label className="form-label">Minum Alkohol</label>
                  <input className="input-field" value={data.minumAlkohol || ""} onChange={(e) => handleChange("minumAlkohol", e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Tato</label>
                  <input className="input-field" value={data.tato || ""} onChange={(e) => handleChange("tato", e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Penyakit Berat</label>
                  <input className="input-field" value={data.penyakitBerat || ""} onChange={(e) => handleChange("penyakitBerat", e.target.value)} />
                </div>
                {(data.penyakitBerat === "YA") && (
                  <div>
                    <label className="form-label">Nama Penyakit</label>
                    <input className="input-field" value={data.namaPenyakit || ""} onChange={(e) => handleChange("namaPenyakit", e.target.value)} />
                  </div>
                )}
                <div>
                  <label className="form-label">Alergi</label>
                  <input className="input-field" value={data.alergi || ""} onChange={(e) => handleChange("alergi", e.target.value)} />
                </div>
                {(data.alergi === "YA") && (
                  <div>
                    <label className="form-label">Nama Alergi</label>
                    <input className="input-field" value={data.namaAlergi || ""} onChange={(e) => handleChange("namaAlergi", e.target.value)} />
                  </div>
                )}
                <div>
                  <label className="form-label">Hobi</label>
                  <input className="input-field" value={data.hobi || ""} onChange={(e) => handleChange("hobi", e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <label className="form-label">Alamat</label>
                  <textarea className="input-field" value={data.alamatLengkap || ""} onChange={(e) => handleChange("alamatLengkap", e.target.value)} />
                </div>
              </div>
            </div>

            {/* SIM */}
            <div className="card">
              <h3 className="font-semibold text-gray-700 mb-3">SIM (Surat Izin Mengemudi)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Memiliki SIM</label>
                  <select className="input-field" value={data.memilikiSim || ""} onChange={(e) => handleChange("memilikiSim", e.target.value)}>
                    <option value="">-- Pilih --</option>
                    <option value="YA">YA</option>
                    <option value="TIDAK">TIDAK</option>
                  </select>
                </div>
              </div>
              {data.memilikiSim === "YA" && (
                <div className="mt-4 space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="form-label">SIM A</label>
                        <select className="input-field" value={data.simA || ""} onChange={(e) => handleChange("simA", e.target.value)}>
                          <option value="">-- Pilih --</option>
                          <option value="YA">YA</option>
                          <option value="TIDAK">TIDAK</option>
                        </select>
                      </div>
                      {data.simA === "YA" && (
                        <>
                          <div>
                            <label className="form-label">Nomor SIM A</label>
                            <input className="input-field" value={data.nomorSimA || ""} onChange={(e) => handleChange("nomorSimA", e.target.value)} />
                          </div>
                          <div>
                            <label className="form-label">Dokumen SIM A (URL)</label>
                            <div className="flex gap-2">
                              <input className="input-field text-xs flex-grow" value={data.dokumenSimA || ""} onChange={(e) => handleChange("dokumenSimA", e.target.value)} placeholder="https://..." />
                              {data.dokumenSimA && data.dokumenSimA.match(/^https?:\/\//) && (
                                <div className="flex gap-2 shrink-0">
                                  <button type="button" onClick={() => handleOpenViewer(data.dokumenSimA, "Dokumen SIM A")} className="btn-secondary text-xs px-3 font-medium transition-colors">
                                    View
                                  </button>
                                  <button type="button" onClick={() => handleDownload(data.dokumenSimA, "SIM_A")} className="bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs px-3 rounded-lg font-medium transition-colors">
                                    Save
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="form-label">SIM B</label>
                        <select className="input-field" value={data.simB || ""} onChange={(e) => handleChange("simB", e.target.value)}>
                          <option value="">-- Pilih --</option>
                          <option value="YA">YA</option>
                          <option value="TIDAK">TIDAK</option>
                        </select>
                      </div>
                      {data.simB === "YA" && (
                        <>
                          <div>
                            <label className="form-label">Nomor SIM B</label>
                            <input className="input-field" value={data.nomorSimB || ""} onChange={(e) => handleChange("nomorSimB", e.target.value)} />
                          </div>
                          <div>
                            <label className="form-label">Dokumen SIM B (URL)</label>
                            <div className="flex gap-2">
                              <input className="input-field text-xs flex-grow" value={data.dokumenSimB || ""} onChange={(e) => handleChange("dokumenSimB", e.target.value)} placeholder="https://..." />
                              {data.dokumenSimB && data.dokumenSimB.match(/^https?:\/\//) && (
                                <div className="flex gap-2 shrink-0">
                                  <button type="button" onClick={() => handleOpenViewer(data.dokumenSimB, "Dokumen SIM B")} className="btn-secondary text-xs px-3 font-medium transition-colors">
                                    View
                                  </button>
                                  <button type="button" onClick={() => handleDownload(data.dokumenSimB, "SIM_B")} className="bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs px-3 rounded-lg font-medium transition-colors">
                                    Save
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="form-label">SIM C</label>
                        <select className="input-field" value={data.simC || ""} onChange={(e) => handleChange("simC", e.target.value)}>
                          <option value="">-- Pilih --</option>
                          <option value="YA">YA</option>
                          <option value="TIDAK">TIDAK</option>
                        </select>
                      </div>
                      {data.simC === "YA" && (
                        <>
                          <div>
                            <label className="form-label">Nomor SIM C</label>
                            <input className="input-field" value={data.nomorSimC || ""} onChange={(e) => handleChange("nomorSimC", e.target.value)} />
                          </div>
                          <div>
                            <label className="form-label">Dokumen SIM C (URL)</label>
                            <div className="flex gap-2">
                              <input className="input-field text-xs flex-grow" value={data.dokumenSimC || ""} onChange={(e) => handleChange("dokumenSimC", e.target.value)} placeholder="https://..." />
                              {data.dokumenSimC && data.dokumenSimC.match(/^https?:\/\//) && (
                                <div className="flex gap-2 shrink-0">
                                  <button type="button" onClick={() => handleOpenViewer(data.dokumenSimC, "Dokumen SIM C")} className="btn-secondary text-xs px-3 font-medium transition-colors">
                                    View
                                  </button>
                                  <button type="button" onClick={() => handleDownload(data.dokumenSimC, "SIM_C")} className="bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs px-3 rounded-lg font-medium transition-colors">
                                    Save
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Paspor */}
            <div className="card">
              <h3 className="font-semibold text-gray-700 mb-3">Paspor & Pengalaman Jepang</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Pernah ke Jepang</label>
                  <select className="input-field" value={data.pernahKeJepang || ""} onChange={(e) => handleChange("pernahKeJepang", e.target.value)}>
                    <option value="">-- Pilih --</option>
                    <option value="YA">YA</option>
                    <option value="TIDAK">TIDAK</option>
                  </select>
                </div>
                {data.pernahKeJepang === "YA" && (
                  <>
                    <div>
                      <label className="form-label">Dari Kapan?</label>
                      <input className="input-field" value={data.dariKapan || ""} onChange={(e) => handleChange("dariKapan", e.target.value)} />
                    </div>
                    <div>
                      <label className="form-label">Atas Keperluan Apa?</label>
                      <input className="input-field" value={data.keperluanApa || ""} onChange={(e) => handleChange("keperluanApa", e.target.value)} />
                    </div>
                  </>
                )}
                <div>
                  <label className="form-label">Memiliki Paspor</label>
                  <select className="input-field" value={data.memilikiPaspor || ""} onChange={(e) => handleChange("memilikiPaspor", e.target.value)}>
                    <option value="">-- Pilih --</option>
                    <option value="YA">YA</option>
                    <option value="TIDAK">TIDAK</option>
                  </select>
                </div>
                {data.memilikiPaspor === "YA" && (
                  <>
                    <div>
                      <label className="form-label">Nomor Paspor</label>
                      <input className="input-field" value={data.nomorPaspor || ""} onChange={(e) => handleChange("nomorPaspor", e.target.value)} />
                    </div>
                    <div>
                      <label className="form-label">Masa Berlaku Paspor</label>
                      <input className="input-field" type="date" value={data.masaBerlakuPaspor || ""} onChange={(e) => handleChange("masaBerlakuPaspor", e.target.value)} />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Dokumen Khusus Ex-Magang */}
            {data.kategoriKandidat === "EX-MAGANG/EX-TRAINEER" && (
              <div className="card">
                <h3 className="font-semibold text-gray-700 mb-3">Dokumen Khusus Ex-Magang/Ex-Traineer</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Sertifikat Senmonkyuu/Hyoukachosho (URL)</label>
                    <div className="flex gap-2">
                      <input className="input-field text-xs flex-grow" value={data.sertifikatSenmonkyuu || ""} onChange={(e) => handleChange("sertifikatSenmonkyuu", e.target.value)} placeholder="https://..." />
                      {data.sertifikatSenmonkyuu && data.sertifikatSenmonkyuu.match(/^https?:\/\//) && (
                        <button type="button" onClick={() => handleOpenViewer(data.sertifikatSenmonkyuu, "Sertifikat Senmonkyuu")} className="btn-secondary text-xs flex items-center justify-center px-4 shrink-0 font-medium transition-colors">
                          View
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Sertifikat Selesai Magang/JITCO (URL)</label>
                    <div className="flex gap-2">
                      <input className="input-field text-xs flex-grow" value={data.sertifikatSelesaiMagang || ""} onChange={(e) => handleChange("sertifikatSelesaiMagang", e.target.value)} placeholder="https://..." />
                      {data.sertifikatSelesaiMagang && data.sertifikatSelesaiMagang.match(/^https?:\/\//) && (
                        <button type="button" onClick={() => handleOpenViewer(data.sertifikatSelesaiMagang, "Sertifikat Selesai Magang")} className="btn-secondary text-xs flex items-center justify-center px-4 shrink-0 font-medium transition-colors">
                          View
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="form-label">Deskripsi Pekerjaan Magang/TG</label>
                    <textarea className="input-field min-h-[80px]" value={data.deskripsiMagang || ""} onChange={(e) => handleChange("deskripsiMagang", e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {/* Dokumen Khusus Engineering */}
            {data.kategoriKandidat === "ENGINEERING/GIJINKOKU" && (
              <div className="card">
                <h3 className="font-semibold text-gray-700 mb-3">Dokumen Khusus Engineering/Gijinkoku</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Jurusan D3/S1</label>
                    <input className="input-field" value={data.jurusanUniv || ""} onChange={(e) => handleChange("jurusanUniv", e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label">Scan Ijazah (URL)</label>
                    <div className="flex gap-2">
                      <input className="input-field text-xs flex-grow" value={data.scanIjazah || ""} onChange={(e) => handleChange("scanIjazah", e.target.value)} placeholder="https://..." />
                      {data.scanIjazah && data.scanIjazah.match(/^https?:\/\//) && (
                        <button type="button" onClick={() => handleOpenViewer(data.scanIjazah, "Scan Ijazah")} className="btn-secondary text-xs flex items-center justify-center px-4 shrink-0 font-medium transition-colors">
                          View
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Transkrip Nilai D3/S1 (URL)</label>
                    <div className="flex gap-2">
                      <input className="input-field text-xs flex-grow" value={data.transkripNilai || ""} onChange={(e) => handleChange("transkripNilai", e.target.value)} placeholder="https://..." />
                      {data.transkripNilai && data.transkripNilai.match(/^https?:\/\//) && (
                        <button type="button" onClick={() => handleOpenViewer(data.transkripNilai, "Transkrip Nilai")} className="btn-secondary text-xs flex items-center justify-center px-4 shrink-0 font-medium transition-colors">
                          View
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="form-label">Riwayat Pekerjaan yang Relevan</label>
                    <textarea className="input-field min-h-[80px]" value={data.riwayatRelevan || ""} onChange={(e) => handleChange("riwayatRelevan", e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {/* Data Keluarga */}
            <div className="card">
              <h3 className="font-semibold text-gray-700 mb-3">Data Keluarga</h3>
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 mb-3">
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Keluarga {index + 1}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      { key: "nama", label: "Nama" },
                      { key: "hubungan", label: "Hubungan" },
                      { key: "usia", label: "Usia" },
                      { key: "pekerjaan", label: "Pekerjaan" },
                      { key: "gaji", label: "Gaji" },
                      { key: "tinggalBersama", label: "Tinggal Bersama" },
                    ].map((f) => (
                      <div key={f.key}>
                        <label className="form-label">{f.label}</label>
                        <input
                          className="input-field"
                          value={(data.keluarga && data.keluarga[index] && data.keluarga[index][f.key]) || ""}
                          onChange={(e) => handleKeluargaChange(index, f.key, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Riwayat Pendidikan */}
            <div className="card">
              <h3 className="font-semibold text-gray-700 mb-3">Riwayat Pendidikan</h3>

              <div className="border border-gray-200 rounded-lg p-4 mb-3">
                <h4 className="text-sm font-medium text-gray-600 mb-2">SD</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { key: "sdNama", label: "Nama Sekolah" },
                    { key: "sdMasuk", label: "Tahun Masuk" },
                    { key: "sdLulus", label: "Tahun Lulus" },
                  ].map((f) => (
                    <div key={f.key}>
                      <label className="form-label">{f.label}</label>
                      <input className="input-field" value={data[f.key] || ""} onChange={(e) => handleChange(f.key, e.target.value)} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4 mb-3">
                <h4 className="text-sm font-medium text-gray-600 mb-2">SMP</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { key: "smpNama", label: "Nama Sekolah" },
                    { key: "smpMasuk", label: "Tahun Masuk" },
                    { key: "smpLulus", label: "Tahun Lulus" },
                  ].map((f) => (
                    <div key={f.key}>
                      <label className="form-label">{f.label}</label>
                      <input className="input-field" value={data[f.key] || ""} onChange={(e) => handleChange(f.key, e.target.value)} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4 mb-3">
                <h4 className="text-sm font-medium text-gray-600 mb-2">SMA/K</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { key: "smaNama", label: "Nama Sekolah" },
                    { key: "smaMasuk", label: "Tahun Masuk" },
                    { key: "smaLulus", label: "Tahun Lulus" },
                    { key: "smaJurusan", label: "Jurusan" },
                  ].map((f) => (
                    <div key={f.key}>
                      <label className="form-label">{f.label}</label>
                      <input className="input-field" value={data[f.key] || ""} onChange={(e) => handleChange(f.key, e.target.value)} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4 mb-3">
                <h4 className="text-sm font-medium text-gray-600 mb-2">Universitas</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { key: "univNama", label: "Nama Universitas" },
                    { key: "univMasuk", label: "Tahun Masuk" },
                    { key: "univLulus", label: "Tahun Lulus" },
                    { key: "univJurusan", label: "Jurusan" },
                  ].map((f) => (
                    <div key={f.key}>
                      <label className="form-label">{f.label}</label>
                      <input className="input-field" value={data[f.key] || ""} onChange={(e) => handleChange(f.key, e.target.value)} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Riwayat Pekerjaan */}
            <div className="card">
              <h3 className="font-semibold text-gray-700 mb-3">Riwayat Pekerjaan</h3>
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 mb-3">
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Pekerjaan {index + 1}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      { key: "perusahaan", label: "Perusahaan" },
                      { key: "masuk", label: "Masuk" },
                      { key: "keluar", label: "Keluar" },
                      { key: "bidang", label: "Bidang" },
                      { key: "status", label: "Status" },
                    ].map((f) => (
                      <div key={f.key}>
                        <label className="form-label">{f.label}</label>
                        <input
                          className="input-field"
                          value={(data.pekerjaan && data.pekerjaan[index] && data.pekerjaan[index][f.key]) || ""}
                          onChange={(e) => handlePekerjaanChange(index, f.key, e.target.value)}
                        />
                      </div>
                    ))}
                    <div className="md:col-span-3">
                      <label className="form-label">Uraian Pekerjaan</label>
                      <textarea
                        className="input-field"
                        value={(data.pekerjaan && data.pekerjaan[index] && data.pekerjaan[index].uraian) || ""}
                        onChange={(e) => handlePekerjaanChange(index, "uraian", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tentang Jepang & Bahasa */}
            <div className="card">
              <h3 className="font-semibold text-gray-700 mb-3">Tentang Jepang & Bahasa</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: "lamaInginTinggal", label: "Lama Ingin Tinggal di Jepang" },
                  { key: "lamaBelajarBahasaJepang", label: "Lama Belajar Bahasa Jepang" },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="form-label">{f.label}</label>
                    <input className="input-field" value={data[f.key] || ""} onChange={(e) => handleChange(f.key, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>

            {/* Kontak Darurat */}
            <div className="card">
              <h3 className="font-semibold text-gray-700 mb-3">Kontak Darurat</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: "nomorDarurat", label: "Nomor Darurat" },
                  { key: "namaPemilikDarurat", label: "Nama Pemilik Nomor" },
                  { key: "hubunganDarurat", label: "Hubungan" },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="form-label">{f.label}</label>
                    <input className="input-field" value={data[f.key] || ""} onChange={(e) => handleChange(f.key, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>

            {/* Promosi Diri */}
            <div className="card">
              <h3 className="font-semibold text-gray-700 mb-3">Promosi Diri</h3>
              <div>
                <label className="form-label">Promosi Diri</label>
                <textarea className="input-field min-h-[100px]" value={data.promosiDiri || ""} onChange={(e) => handleChange("promosiDiri", e.target.value)} />
              </div>
            </div>

            {/* Link Dokumen */}
            <div className="card">
              <h3 className="font-semibold text-gray-700 mb-3">Link Dokumen</h3>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { key: "pasPhoto", label: "Pas Photo (URL)" },
                  { key: "sertifikatBahasaJepang", label: "Sertifikat Bahasa Jepang (URL)" },
                  { key: "videoJFT", label: "Video JFT (URL)" },
                  { key: "sertifikatSSW", label: "Sertifikat SSW (URL)" },
                  { key: "videoSSW", label: "Video SSW (URL)" },
                  { key: "cvRirekisho", label: "CV/Rirekisho (URL)" },
                  { key: "sertifikatSenmonkyuu", label: "Sertifikat Senmonkyuu (URL)" },
                  { key: "sertifikatSelesaiMagang", label: "Sertifikat Selesai Magang (URL)" },
                  { key: "dokumenSIM", label: "Dokumen SIM (URL)" },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="form-label">{f.label}</label>
                    <div className="flex gap-2">
                      <input className="input-field text-xs flex-grow" value={data[f.key] || ""} onChange={(e) => handleChange(f.key, e.target.value)} placeholder="https://drive.google.com/..." />
                      {data[f.key] && data[f.key].match(/^https?:\/\//) && (
                        <div className="flex gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenViewer(data[f.key], f.label)}
                            className="btn-secondary text-xs px-4 font-medium transition-colors"
                            title="View Document"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownload(data[f.key], f.key)}
                            className="bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs px-4 rounded-lg font-medium transition-colors"
                            title="Download Document"
                          >
                            Save
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Motivasi & Kelebihan */}
            <div className="card">
              <h3 className="font-semibold text-gray-700 mb-3">Motivasi & Kelebihan (Indonesia)</h3>
              <div className="space-y-4">
                {TRANSLATABLE_FIELDS.filter((f) => {
                  // Hide alasanKaigofukushishi for ENGINEERING/GIJINKOKU
                  if (f.key === "alasanKaigofukushishi" && data.kategoriKandidat === "ENGINEERING/GIJINKOKU") return false;
                  return true;
                }).map((f) => (
                  <div key={f.key}>
                    <label className="form-label">{f.label}</label>
                    <textarea className="input-field min-h-[80px]" value={data[f.key] || ""} onChange={(e) => handleChange(f.key, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "certs" && (
          <div className="space-y-4">
            <div className="card">
              <h3 className="font-semibold text-gray-700 mb-4">Sertifikat & Tanggal Ujian (免許・資格・受験日)</h3>
              <p className="text-xs text-gray-500 mb-4">Isi tanggal ujian untuk setiap sertifikat yang dimiliki. Data ini akan muncul di CV.</p>
              
              {/* Auto fetch from links */}
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700">Auto-detect dari Link Sertifikat</p>
                    <p className="text-xs text-blue-500">Ekstrak tanggal ujian secara otomatis dari PDF sertifikat yang tersimpan di Google Drive</p>
                  </div>
                  <button
                    onClick={handleFetchCertDates}
                    className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={extracting}
                  >
                    {extracting ? "Mengekstrak..." : "Fetch dari Link"}
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {CERT_TEMPLATES.map((cert) => (
                  <div key={cert.field} className="p-3 border border-gray-200 rounded-lg">
                    <label className="form-label mb-2 block">{cert.nama}</label>
                    <JapaneseDatePicker
                      value={data[cert.field] || ""}
                      onChange={(val) => handleChange(cert.field, val)}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-6 border-t pt-4">
                <h4 className="font-medium text-gray-700 mb-3">Sertifikat Custom (Tambahan)</h4>
                <p className="text-xs text-gray-500 mb-3">Format: satu baris per sertifikat. Contoh: "JLPT N3 - 受験日: 2025年12月01日"</p>
                <textarea
                  className="input-field min-h-[100px] text-sm"
                  value={(data.sertifikat || []).map((s) => `${s.nama} - 受験日: ${s.tanggal}`).join("\n")}
                  onChange={(e) => {
                    const lines = e.target.value.split("\n").filter((l) => l.trim());
                    const serts = lines.map((line) => {
                      const match = line.match(/^(.+?)\s*-\s*受験日:\s*(.+)$/);
                      if (match) return { nama: match[1].trim(), tanggal: match[2].trim() };
                      return { nama: line.trim(), tanggal: "" };
                    });
                    handleChange("sertifikat", serts);
                  }}
                  placeholder="国際交流基金日本語基礎テスト - 受験日: 2026年06月05日"
                />
              </div>

              <div className="mt-4 border-t pt-4">
                <h4 className="font-medium text-gray-700 mb-3">Link Dokumen</h4>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { key: "pasPhoto", label: "Pas Photo (URL)" },
                    { key: "sertifikatBahasaJepang", label: "Sertifikat Bahasa Jepang (URL)" },
                    { key: "sertifikatSSW", label: "Sertifikat SSW (URL)" },
                    { key: "cvRirekisho", label: "CV/Rirekisho (URL)" },
                  ].map((f) => (
                    <div key={f.key}>
                      <label className="form-label">{f.label}</label>
                      <div className="flex gap-2">
                        <input className="input-field text-xs flex-grow" value={data[f.key] || ""} onChange={(e) => handleChange(f.key, e.target.value)} placeholder="https://drive.google.com/..." />
                        {data[f.key] && data[f.key].match(/^https?:\/\//) && (
                          <button
                            type="button"
                            onClick={() => handleOpenViewer(data[f.key], f.label)}
                            className="btn-secondary text-xs flex items-center justify-center px-4 shrink-0 font-medium transition-colors"
                            title="View Document"
                          >
                            View
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={handleSave} className="btn-primary" disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</button>
            </div>
          </div>
        )}

        {activeTab === "japanese" && (
          <div className="space-y-4">
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-700">Terjemahan Bahasa Jepang (Versi Terintegrasi)</h3>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      await handleFetchCertDates();
                      await handleAutoTranslate();
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 font-medium disabled:opacity-50"
                    disabled={translating || extracting}
                  >
                    {translating || extracting ? "Memproses..." : "Generate & Terjemahkan Semua"}
                  </button>
                  <button onClick={handleAutoTranslate} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700 font-medium" disabled={translating}>
                    {translating ? "Menerjemahkan..." : "Auto Translate Semua"}
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                Versi Indonesia dan Jepang kini saling terintegrasi. Anda bisa langsung mengedit kedua bahasa di bawah ini secara bersamaan. Gunakan tombol terjemahan per-kolom untuk sinkronisasi instan arah bolak-balik (ID <span className="text-blue-600 font-bold font-mono">⇌</span> JP).
              </p>

              <div className="space-y-6">
                {TRANSLATABLE_FIELDS.map((f) => (
                  <div key={f.key} className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
                    <label className="form-label text-blue-600 font-semibold mb-2 block">{f.label}</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Indonesia input (bisa diedit!) */}
                      <div className="flex flex-col justify-between h-full">
                        <div>
                          <span className="text-xs text-gray-500 block mb-1 font-medium font-mono">Bahasa Indonesia</span>
                          <textarea
                            className="input-field min-h-[85px] text-sm bg-white"
                            value={data[f.key] || ""}
                            onChange={(e) => handleChange(f.key, e.target.value)}
                            placeholder="Ketik deskripsi dalam bahasa Indonesia..."
                          />
                        </div>
                        <div className="mt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => translateSingleField(f.key, "ja")}
                            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded transition-colors disabled:opacity-50"
                            disabled={fieldTranslating[`${f.key}_ja`]}
                          >
                            {fieldTranslating[`${f.key}_ja`] ? "Menerjemahkan..." : "Terjemahkan ke Jepang ➜"}
                          </button>
                        </div>
                      </div>

                      {/* Japanese input */}
                      <div className="flex flex-col justify-between h-full">
                        <div>
                          <span className="text-xs text-gray-500 block mb-1 font-medium font-mono">日本語 (Bahasa Jepang)</span>
                          <textarea
                            className="input-field min-h-[85px] text-sm bg-white"
                            value={translations[f.key] || ""}
                            onChange={(e) => handleTranslationChange(f.key, e.target.value)}
                            placeholder="Terjemahan bahasa Jepang..."
                          />
                        </div>
                        <div className="mt-2 flex justify-start">
                          <button
                            type="button"
                            onClick={() => translateSingleField(f.key, "id")}
                            className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1 font-medium bg-purple-50 hover:bg-purple-100 px-2.5 py-1.5 rounded transition-colors disabled:opacity-50"
                            disabled={fieldTranslating[`${f.key}_id`]}
                          >
                            {fieldTranslating[`${f.key}_id`] ? "Menerjemahkan..." : "⬅ Terjemahkan ke Indonesia"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Pekerjaan Uraian Translations */}
                {(data.pekerjaan || []).some((p) => p?.uraian && p.uraian.trim()) && (
                  <div className="border-t border-gray-200 pt-6">
                    <h4 className="font-semibold text-gray-700 mb-4">Uraian Riwayat Pekerjaan</h4>
                    <div className="space-y-4">
                      {(data.pekerjaan || []).map((p, index) => {
                        if (!p?.uraian || !p.uraian.trim()) return null;
                        const key = `pekerjaan_${index}_uraian`;
                        return (
                          <div key={key} className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
                            <label className="form-label text-blue-600 font-semibold mb-2 block">
                              Pekerjaan {index + 1}: {p.perusahaan || `Entry ${index + 1}`}
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Indonesia input (bisa diedit!) */}
                              <div className="flex flex-col justify-between h-full">
                                <div>
                                  <span className="text-xs text-gray-500 block mb-1 font-medium font-mono">Bahasa Indonesia</span>
                                  <textarea
                                    className="input-field min-h-[85px] text-sm bg-white"
                                    value={p.uraian || ""}
                                    onChange={(e) => handlePekerjaanChange(index, "uraian", e.target.value)}
                                    placeholder="Deskripsi pekerjaan dalam bahasa Indonesia..."
                                  />
                                </div>
                                <div className="mt-2 flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() => translateJobField(index, "ja")}
                                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded transition-colors disabled:opacity-50"
                                    disabled={fieldTranslating[`${key}_ja`]}
                                  >
                                    {fieldTranslating[`${key}_ja`] ? "Menerjemahkan..." : "Terjemahkan ke Jepang ➜"}
                                  </button>
                                </div>
                              </div>

                              {/* Japanese input */}
                              <div className="flex flex-col justify-between h-full">
                                <div>
                                  <span className="text-xs text-gray-500 block mb-1 font-medium font-mono">日本語 (Bahasa Jepang)</span>
                                  <textarea
                                    className="input-field min-h-[85px] text-sm bg-white"
                                    value={translations[key] || ""}
                                    onChange={(e) => handleTranslationChange(key, e.target.value)}
                                    placeholder="Terjemahan bahasa Jepang..."
                                  />
                                </div>
                                <div className="mt-2 flex justify-start">
                                  <button
                                    type="button"
                                    onClick={() => translateJobField(index, "id")}
                                    className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1 font-medium bg-purple-50 hover:bg-purple-100 px-2.5 py-1.5 rounded transition-colors disabled:opacity-50"
                                    disabled={fieldTranslating[`${key}_id`]}
                                  >
                                    {fieldTranslating[`${key}_id`] ? "Menerjemahkan..." : "⬅ Terjemahkan ke Indonesia"}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Keluarga Pekerjaan Translations */}
                {(data.keluarga || []).some((k) => k?.pekerjaan && k.pekerjaan.trim()) && (
                  <div className="border-t border-gray-200 pt-6">
                    <h4 className="font-semibold text-gray-700 mb-4">Pekerjaan Keluarga</h4>
                    <div className="space-y-4">
                      {(data.keluarga || []).map((k, index) => {
                        if (!k?.pekerjaan || !k.pekerjaan.trim()) return null;
                        const key = `keluarga_${index}_pekerjaan`;
                        return (
                          <div key={key} className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
                            <label className="form-label text-blue-600 font-semibold mb-2 block">
                              Keluarga {index + 1}: {k.nama || `Entry ${index + 1}`} ({k.hubungan || "?"})
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="flex flex-col justify-between h-full">
                                <div>
                                  <span className="text-xs text-gray-500 block mb-1 font-medium font-mono">Bahasa Indonesia</span>
                                  <input
                                    className="input-field text-sm bg-white"
                                    value={k.pekerjaan || ""}
                                    onChange={(e) => handleKeluargaChange(index, "pekerjaan", e.target.value)}
                                  />
                                </div>
                                <div className="mt-2 flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() => translateFamilyField(index, "ja")}
                                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded transition-colors disabled:opacity-50"
                                    disabled={fieldTranslating[`${key}_ja`]}
                                  >
                                    {fieldTranslating[`${key}_ja`] ? "Menerjemahkan..." : "Terjemahkan ke Jepang ➜"}
                                  </button>
                                </div>
                              </div>
                              <div className="flex flex-col justify-between h-full">
                                <div>
                                  <span className="text-xs text-gray-500 block mb-1 font-medium font-mono">日本語 (Bahasa Jepang)</span>
                                  <input
                                    className="input-field text-sm bg-white"
                                    value={translations[key] || ""}
                                    onChange={(e) => handleTranslationChange(key, e.target.value)}
                                  />
                                </div>
                                <div className="mt-2 flex justify-start">
                                  <button
                                    type="button"
                                    onClick={() => translateFamilyField(index, "id")}
                                    className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1 font-medium bg-purple-50 hover:bg-purple-100 px-2.5 py-1.5 rounded transition-colors disabled:opacity-50"
                                    disabled={fieldTranslating[`${key}_id`]}
                                  >
                                    {fieldTranslating[`${key}_id`] ? "Menerjemahkan..." : "⬅ Terjemahkan ke Indonesia"}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button onClick={handleSave} className="btn-primary" disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan Terjemahan"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Document Viewer Modal */}
      {viewerUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl w-[95vw] max-w-5xl h-[88vh] flex flex-col overflow-hidden border border-gray-100">
            {/* Modal Header */}
            <div className="bg-gray-50 px-5 py-4 border-b border-gray-200 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <h3 className="font-semibold text-gray-800 text-sm md:text-base">Document Viewer - {viewerTitle}</h3>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={viewerUrl.replace("/preview", "/view")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded transition-transform"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Buka Tab Baru
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setViewerUrl("");
                    setViewerTitle("");
                  }}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 p-1.5 rounded-lg transition-colors focus:outline-none"
                  aria-label="Close Viewer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body (Iframe) */}
            <div className="flex-grow bg-gray-100 relative">
              <iframe
                src={viewerUrl}
                className="absolute inset-0 w-full h-full border-0"
                allow="autoplay"
                title={viewerTitle}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
