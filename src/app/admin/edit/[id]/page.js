"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import Navbar from "@/components/Navbar";
import { translateToJapanese } from "@/lib/translateHelper";
import JapaneseDatePicker from "@/components/JapaneseDatePicker";

// Fields that should be translated to Japanese
const TRANSLATABLE_FIELDS = [
  { key: "kelebihan", label: "Kelebihan" },
  { key: "kekurangan", label: "Kekurangan" },
  { key: "alasanKeJepang", label: "Alasan ke Jepang" },
  { key: "alasanMelamarBidang", label: "Alasan Melamar Bidang" },
  { key: "alasanKaigofukushishi", label: "Alasan Kaigofukushishi" },
  { key: "impianMasaDepan", label: "Impian Masa Depan" },
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("data"); // data | certs | japanese

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

  const handleTranslationChange = (key, value) => {
    setTranslations((prev) => ({ ...prev, [key]: value }));
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

    setTranslations(newTranslations);
    setTranslating(false);
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
          <button onClick={() => setActiveTab("certs")} className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === "certs" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            Sertifikat
          </button>
          <button onClick={() => setActiveTab("japanese")} className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === "japanese" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            Terjemahan Jepang
          </button>
        </div>

        {activeTab === "data" && (
          <div className="space-y-4">
            <div className="card">
              <h3 className="font-semibold text-gray-700 mb-3">Data Pribadi</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: "namaLengkap", label: "Nama Lengkap" },
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
                ].map((f) => (
                  <div key={f.key}>
                    <label className="form-label">{f.label}</label>
                    <input className="input-field" value={data[f.key] || ""} onChange={(e) => handleChange(f.key, e.target.value)} />
                  </div>
                ))}
                <div className="md:col-span-2">
                  <label className="form-label">Alamat</label>
                  <textarea className="input-field" value={data.alamatLengkap || ""} onChange={(e) => handleChange("alamatLengkap", e.target.value)} />
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-700 mb-3">Motivasi & Kelebihan (Indonesia)</h3>
              <div className="space-y-4">
                {TRANSLATABLE_FIELDS.map((f) => (
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
                    onClick={async () => {
                      // Check if any certificate links exist
                      const hasJFT = data.sertifikatBahasaJepang && data.sertifikatBahasaJepang.includes("http");
                      const hasSSW = data.sertifikatSSW && data.sertifikatSSW.includes("http");
                      
                      if (!hasJFT && !hasSSW) {
                        setMessage("Tidak ada link sertifikat. Isi link di bagian 'Link Dokumen' terlebih dahulu.");
                        return;
                      }

                      setExtracting(true);
                      setMessage("");
                      const results = [];
                      let successCount = 0;
                      let failCount = 0;

                      // Extract from sertifikatBahasaJepang -> tanggalJFT
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
                            results.push(`JFT: ${result.date}`);
                            successCount++;
                          } else {
                            results.push(`JFT: Gagal - ${result.error}`);
                            failCount++;
                          }
                        } catch (err) {
                          results.push(`JFT: Error - ${err.message}`);
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

                            // If bidangKerja is KAIGO, also fill tanggalSSWKaigo
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

                      setExtracting(false);
                      const summary = `Ekstraksi selesai: ${successCount} berhasil${failCount > 0 ? `, ${failCount} gagal` : ""}. ${results.join(" | ")}`;
                      setMessage(summary);
                    }}
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
                  <div>
                    <label className="form-label">Pas Photo (URL)</label>
                    <input className="input-field text-xs" value={data.pasPhoto || ""} onChange={(e) => handleChange("pasPhoto", e.target.value)} placeholder="https://drive.google.com/..." />
                  </div>
                  <div>
                    <label className="form-label">Sertifikat Bahasa Jepang (URL)</label>
                    <input className="input-field text-xs" value={data.sertifikatBahasaJepang || ""} onChange={(e) => handleChange("sertifikatBahasaJepang", e.target.value)} placeholder="https://drive.google.com/..." />
                  </div>
                  <div>
                    <label className="form-label">Sertifikat SSW (URL)</label>
                    <input className="input-field text-xs" value={data.sertifikatSSW || ""} onChange={(e) => handleChange("sertifikatSSW", e.target.value)} placeholder="https://drive.google.com/..." />
                  </div>
                  <div>
                    <label className="form-label">CV/Rirekisho (URL)</label>
                    <input className="input-field text-xs" value={data.cvRirekisho || ""} onChange={(e) => handleChange("cvRirekisho", e.target.value)} placeholder="https://drive.google.com/..." />
                  </div>
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
                <h3 className="font-semibold text-gray-700">Terjemahan Bahasa Jepang</h3>
                <button onClick={handleAutoTranslate} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700" disabled={translating}>
                  {translating ? "Menerjemahkan..." : "Auto Translate Semua"}
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                Klik "Auto Translate" untuk terjemahan otomatis, lalu edit manual jika perlu. Hasil terjemahan akan muncul di CV.
              </p>

              <div className="space-y-6">
                {TRANSLATABLE_FIELDS.map((f) => (
                  <div key={f.key} className="border border-gray-200 rounded-lg p-4">
                    <label className="form-label text-blue-600">{f.label}</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                      <div>
                        <span className="text-xs text-gray-400 block mb-1">Indonesia (asli)</span>
                        <div className="bg-gray-50 p-2 rounded text-xs text-gray-600 min-h-[60px]">
                          {data[f.key] || <span className="text-gray-300 italic">kosong</span>}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-400 block mb-1">日本語 (Jepang) — bisa diedit</span>
                        <textarea
                          className="input-field min-h-[60px] text-sm"
                          value={translations[f.key] || ""}
                          onChange={(e) => handleTranslationChange(f.key, e.target.value)}
                          placeholder="Terjemahan bahasa Jepang..."
                        />
                      </div>
                    </div>
                  </div>
                ))}
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
    </>
  );
}
