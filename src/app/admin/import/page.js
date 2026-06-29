"use client";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import Navbar from "@/components/Navbar";

const SPREADSHEET_ID = "1ZBpJyZasfXfWGZY1F88wddtIEQpzCkF1tRbDJoappqY";
const SHEET_NAME = "Form Responses 3";
const API_KEY = "AIzaSyAWlNi_iBOWxZBD6E20aHOSrRpPsirDdOM"; // Reuse Firebase API key (enable Sheets API in GCP)

function parseRow(headers, values) {
  const get = (keyword) => {
    const idx = headers.findIndex((h) => h && h.toLowerCase().includes(keyword.toLowerCase()));
    return idx >= 0 ? (values[idx] || "").trim() : "";
  };

  const nama = get("NAMA LENGKAP");
  if (!nama) return null;

  return {
    kodeReferensi: get("Kode Referensi"),
    kodeJob: get("Kode Job"),
    kategoriKandidat: get("KATEGORI KANDIDAT"),
    domisili: get("DOMISILI"),
    namaLengkap: nama,
    namaPanggilan: get("NAMA PANGGILAN"),
    bidangKerja: get("BIDANG KERJA YANG DIPILIH"),
    noHp: get("NO. HP AKTIF"),
    email: get("ALAMAT EMAIL"),
    tanggalLahir: get("TANGGA LAHIR"),
    tempatLahir: get("TEMPAT LAHIR"),
    alamatLengkap: get("ALAMAT LENGKAP"),
    jenisKelamin: get("JENIS KELAMIN"),
    agama: get("AGAMA"),
    golonganDarah: get("GOLONGAN DARAH"),
    tinggiBadan: get("TINGGI BADAN"),
    beratBadan: get("BERAT BADAN"),
    dominanTangan: get("DOMINAN TANGAN"),
    butaWarna: get("BUTA WARNA"),
    merokok: get("APAKAH ANDA MEROKOK"),
    minumAlkohol: get("APAKAH ANDA MINUM ALKOHOL"),
    tato: get("APAKAH MEMILIKI TATO"),
    penyakitBerat: get("APAKAH MEMILIKI PENYAKIT BERAT"),
    alergi: get("APAKAH MEMILIKI ALERGI"),
    hobi: get("HOBI"),
    statusPernikahan: get("STATUS PERNIKAHAN"),
    pernahKeJepang: get("APAKAH PERNAH KE JEPANG"),
    memilikiPaspor: get("APAKAH MEMILIKI PASPOR"),
    nomorPaspor: get("NOMOR PASPOR"),
    masaBerlakuPaspor: get("MASA BERLAKU PASPOR"),
    memilikiSim: get("APAKAH MEMILIKI SIM"),
    keluarga: [
      { nama: get("DATA KELUARGA 1 : NAMA LENGKAP"), hubungan: get("DATA KELUARGA 1 : HUBUNGAN DENGAN ANDA"), usia: get("DATA KELUARGA 1 : USIA"), pekerjaan: get("DATA KELUARGA 1 : PEKERJAAN"), gaji: get("DATA KELUARGA 1 : GAJI PER BULAN"), tinggalBersama: get("DATA KELUARGA 1 : APAKAH TINGGAL BERSAMA") },
      { nama: get("DATA KELUARGA 2 : NAMA LENGKAP"), hubungan: get("DATA KELUARGA 2 : HUBUNGAN DENGAN ANDA"), usia: get("DATA KELUARGA 2 : USIA"), pekerjaan: get("DATA KELUARGA 2 : PEKERJAAN"), gaji: get("DATA KELUARGA 2 : GAJI PER BULAN"), tinggalBersama: get("DATA KELUARGA 2 : APAKAH TINGGAL BERSAMA") },
      { nama: get("DATA KELUARGA 3 : NAMA LENGKAP"), hubungan: get("DATA KELUARGA 3 : HUBUNGAN DENGAN ANDA"), usia: get("DATA KELUARGA 3 : USIA"), pekerjaan: get("DATA KELUARGA 3 : PEKERJAAN"), gaji: get("DATA KELUARGA 3 : GAJI PER BULAN"), tinggalBersama: get("DATA KELUARGA 3 : APAKAH TINGGAL BERSAMA") },
      { nama: get("DATA KELUARGA 4 : NAMA LENGKAP"), hubungan: get("DATA KELUARGA 4 : HUBUNGAN DENGAN ANDA"), usia: get("DATA KELUARGA 4 : USIA"), pekerjaan: get("DATA KELUARGA 4 : PEKERJAAN"), gaji: get("DATA KELUARGA 4 : GAJI PER BULAN"), tinggalBersama: get("DATA KELUARGA 4 : APAKAH TINGGAL BERSAMA") },
    ],
    sdNama: get("RIWAYAT PENDIDIKAN  SD: NAMA SEKOLAH"),
    sdMasuk: get("RIWAYAT PENDIDKAN SD : TANGGAL MASUK"),
    sdLulus: get("RIWAYAT PENDIDKAN SD : TANGGAL LULUS"),
    smpNama: get("RIWAYAT PENDIDIKAN  SMP: NAMA SEKOLAH"),
    smpMasuk: get("RIWAYAT PENDIDKAN SMP : TANGGAL MASUK"),
    smpLulus: get("RIWAYAT PENDIDKAN SMP : TANGGAL LULUS"),
    smaNama: get("RIWAYAT PENDIDIKAN  SMA/K: NAMA SEKOLAH"),
    smaMasuk: get("RIWAYAT PENDIDKAN SMA/K : TANGGAL MASUK"),
    smaLulus: get("RIWAYAT PENDIDKAN SMA/K : TANGGAL LULUS"),
    smaJurusan: get("RIWAYAT PENDIDKAN SMA/K : JURUSAN"),
    univNama: get("RIWAYAT PENDIDIKAN  UNIVERSITAS: NAMA SEKOLAH"),
    univMasuk: get("RIWAYAT PENDIDKAN UNIVERSITAS : TANGGAL MASUK"),
    univLulus: get("RIWAYAT PENDIDKAN UNIVERSITAS : TANGGAL LULUS"),
    univJurusan: get("RIWAYAT PENDIDKAN UNIVERSITAS : JURUSAN"),
    pekerjaan: [
      { perusahaan: get("RIWAYAT BEKERJA 1 : NAMA PERUSAHAAN"), masuk: get("RIWAYAT BEKERJA 1 : TANGGAL MASUK"), keluar: get("RIWAYAT BEKERJA 1 : TANGGAL KELUAR"), bidang: get("RIWAYAT BEKERJA 1 : BIDANG PEKERJAAN"), status: get("RIWAYAT BEKERJA 1 : STATUS PEKERJA"), uraian: get("RIWAYAT BEKERJA 1 : URAIAN PEKERJAAN") },
      { perusahaan: get("RIWAYAT BEKERJA 2 : NAMA PERUSAHAAN"), masuk: get("RIWAYAT BEKERJA 2 : TANGGAL MASUK"), keluar: get("RIWAYAT BEKERJA 2 : TANGGAL KELUAR"), bidang: get("RIWAYAT BEKERJA 2 : BIDANG PEKERJAAN"), status: get("RIWAYAT BEKERJA 2 : STATUS PEKERJA"), uraian: get("RIWAYAT BEKERJA 2 : URAIAN PEKERJAAN") },
      { perusahaan: get("RIWAYAT BEKERJA 3 : NAMA PERUSAHAAN"), masuk: get("RIWAYAT BEKERJA 3 : TANGGAL MASUK"), keluar: get("RIWAYAT BEKERJA 3 : TANGGAL KELUAR"), bidang: get("RIWAYAT BEKERJA 3 : BIDANG PEKERJAAN"), status: get("RIWAYAT BEKERJA 3 : STATUS PEKERJA"), uraian: get("RIWAYAT BEKERJA 3 : URAIAN PEKERJAAN") },
      { perusahaan: get("RIWAYAT BEKERJA 4 : NAMA PERUSAHAAN"), masuk: get("RIWAYAT BEKERJA 4 : TANGGAL MASUK"), keluar: get("RIWAYAT BEKERJA 4 : TANGGAL KELUAR"), bidang: get("RIWAYAT BEKERJA 4 : BIDANG PEKERJAAN"), status: get("RIWAYAT BEKERJA 4 : STATUS PEKERJA"), uraian: get("RIWAYAT BEKERJA 4 : URAIAN PEKERJAAN") },
    ],
    kelebihan: get("KELEBIHAN ANDA"),
    kekurangan: get("KEKURANGAN ANDA"),
    alasanKeJepang: get("ALASAN INGIN KE JEPANG"),
    alasanMelamarBidang: get("ALASAN INGIN MELAMAR KE BIDANG INI"),
    alasanKaigofukushishi: get("ALASAN INGIN MENJADI KAIGOFUKUSHISHI"),
    impianMasaDepan: get("IMPIAN DI MASA DEPAN"),
    lamaInginTinggal: get("LAMA INGIN TINGGAL DI JEPANG"),
    lamaBelajarBahasaJepang: get("LAMA BELAJAR BAHASA JEPANG"),
    nomorDarurat: get("NOMOR DARURAT : NO HP"),
    namaPemilikDarurat: get("NOMOR DARURAT : NAMA LENGKAP PEMILIK NOMOR HP"),
    hubunganDarurat: get("NOMOR DARURAT : HUBUNGAN DENGAN PELAMAR"),
    sertifikatBahasaJepang: get("SERTIFIKAT BAHASA JEPANG"),
    videoJFT: get("VIDEO SCREEN RECORDING JFT"),
    sertifikatSSW: get("SERTIFIKAT SSW"),
    videoSSW: get("VIDEO SCREEN RECORDING SSW"),
    cvRirekisho: get("CV/RIREKISHO"),
    sertifikatSenmonkyuu: get("SERTIFIKAT SENMONKYUU"),
    sertifikatSelesaiMagang: get("SERTIFIKAT SELESAI MAGANG"),
    importedAt: new Date().toISOString(),
    submittedAt: get("Timestamp") || new Date().toISOString(),
  };
}

export default function ImportPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const [status, setStatus] = useState("");
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState([]);
  const [fetching, setFetching] = useState(false);
  const [sheetUrl, setSheetUrl] = useState(
    `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`
  );
  const [customSheetId, setCustomSheetId] = useState(SPREADSHEET_ID);
  const [customSheetName, setCustomSheetName] = useState(SHEET_NAME);

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  // Fetch data langsung dari Google Sheets (public)
  const fetchFromSheets = async () => {
    setFetching(true);
    setStatus("");
    setPreview([]);

    try {
      // Gunakan Google Sheets API v4 (publik tanpa auth jika sheet di-share publik)
      const encodedSheet = encodeURIComponent(customSheetName);
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${customSheetId}/values/${encodedSheet}?key=${API_KEY}`;
      
      const res = await fetch(url);
      
      if (!res.ok) {
        const err = await res.json();
        if (res.status === 403) {
          setStatus("Error: Spreadsheet belum di-share sebagai public. Buka spreadsheet → Share → Anyone with the link → Viewer");
        } else if (res.status === 400) {
          setStatus("Error: Nama sheet salah atau Google Sheets API belum di-enable. Pastikan nama sheet benar.");
        } else {
          setStatus(`Error: ${err.error?.message || "Gagal fetch data"}`);
        }
        setFetching(false);
        return;
      }

      const data = await res.json();
      const rows = data.values || [];
      
      if (rows.length < 2) {
        setStatus("Sheet kosong atau hanya ada header");
        setFetching(false);
        return;
      }

      const headers = rows[0];
      const dataRows = rows.slice(1);
      const parsed = dataRows.map((row) => parseRow(headers, row)).filter(Boolean);
      
      setPreview(parsed);
      setStatus(`Berhasil fetch ${parsed.length} data dari Google Sheets`);
    } catch (err) {
      setStatus(`Error: ${err.message}. Pastikan spreadsheet sudah di-share sebagai public viewer.`);
    }
    setFetching(false);
  };

  // Fallback: upload CSV manual
  const handleFileUpload = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setStatus("");
    setPreview([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const lines = text.split("\n").map((l) => l.split("\t").length > 3 ? l.split("\t") : l.split(","));
      if (lines.length > 1) {
        const headers = lines[0];
        const parsed = lines.slice(1).map((row) => parseRow(headers, row)).filter(Boolean);
        setPreview(parsed);
        setStatus(`${parsed.length} data dari file CSV`);
      }
    };
    reader.readAsText(f, "UTF-8");
  };

  const handleImport = async () => {
    if (preview.length === 0) return;
    setImporting(true);
    setStatus("Mengimport data...");
    let success = 0;

    for (const candidate of preview) {
      try {
        const docId = (candidate.namaLengkap || "unknown")
          .replace(/[^a-zA-Z0-9]/g, "_")
          .toLowerCase()
          .substring(0, 30) + "_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
        
        await setDoc(doc(db, "candidates", docId), {
          ...candidate,
          userId: "imported",
          source: "spreadsheet_import",
        });
        success++;
        setStatus(`Mengimport... ${success}/${preview.length}`);
      } catch (err) {
        console.error("Import error:", err);
      }
    }

    setStatus(`Selesai! ${success} data berhasil diimport ke Firestore.`);
    setImporting(false);
  };

  return (
    <>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Import Data dari Google Sheets</h1>
        <p className="text-gray-500 text-sm mb-6">
          Tarik data langsung dari spreadsheet via API, atau upload CSV manual.
        </p>

        {/* Method 1: Direct API */}
        <div className="card mb-6">
          <h2 className="font-semibold text-gray-700 mb-3">Metode 1: Langsung dari Google Sheets (API)</h2>
          <p className="text-xs text-gray-500 mb-3">
            Pastikan spreadsheet sudah di-share: Anyone with the link → Viewer
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="form-label">Spreadsheet ID</label>
              <input
                className="input-field text-xs"
                value={customSheetId}
                onChange={(e) => setCustomSheetId(e.target.value)}
                placeholder="ID dari URL spreadsheet"
              />
            </div>
            <div>
              <label className="form-label">Nama Sheet</label>
              <input
                className="input-field"
                value={customSheetName}
                onChange={(e) => setCustomSheetName(e.target.value)}
                placeholder="Form Responses 3"
              />
            </div>
          </div>
          <button onClick={fetchFromSheets} className="btn-primary" disabled={fetching}>
            {fetching ? "Mengambil data..." : "Fetch Data dari Spreadsheet"}
          </button>
        </div>

        {/* Method 2: CSV Upload */}
        <div className="card mb-6">
          <h2 className="font-semibold text-gray-700 mb-3">Metode 2: Upload CSV Manual</h2>
          <p className="text-xs text-gray-500 mb-3">
            Download sheet sebagai CSV lalu upload di sini.
          </p>
          <input type="file" accept=".csv,.tsv,.txt" onChange={handleFileUpload} className="input-field" />
        </div>

        {/* Preview */}
        {preview.length > 0 && (
          <div className="card mb-6">
            <h2 className="font-semibold text-gray-700 mb-3">Preview Data ({preview.length} kandidat)</h2>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-gray-50 sticky top-0">
                    <th className="py-2 px-2 text-left">No</th>
                    <th className="py-2 px-2 text-left">Nama</th>
                    <th className="py-2 px-2 text-left">Kategori</th>
                    <th className="py-2 px-2 text-left">Bidang</th>
                    <th className="py-2 px-2 text-left">No HP</th>
                    <th className="py-2 px-2 text-left">Kode Job</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((p, idx) => (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="py-1 px-2">{idx + 1}</td>
                      <td className="py-1 px-2 font-medium">{p.namaLengkap}</td>
                      <td className="py-1 px-2">
                        <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs">{p.kategoriKandidat}</span>
                      </td>
                      <td className="py-1 px-2">{p.bidangKerja}</td>
                      <td className="py-1 px-2">{p.noHp}</td>
                      <td className="py-1 px-2">{p.kodeJob}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-gray-500">{preview.length} data siap diimport</span>
              <button onClick={handleImport} className="btn-primary" disabled={importing}>
                {importing ? "Mengimport..." : `Import ${preview.length} Data ke Firestore`}
              </button>
            </div>
          </div>
        )}

        {status && (
          <div className={`border px-4 py-3 rounded-lg text-sm ${status.includes("Error") ? "bg-red-50 border-red-200 text-red-700" : "bg-blue-50 border-blue-200 text-blue-700"}`}>
            {status}
          </div>
        )}
      </div>
    </>
  );
}
