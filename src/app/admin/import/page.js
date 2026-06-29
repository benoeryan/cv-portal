"use client";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, doc, setDoc } from "firebase/firestore";
import Navbar from "@/components/Navbar";

// Mapping kolom spreadsheet Form Responses 3 ke field Firestore
function parseCSVRow(headers, values) {
  const get = (keyword) => {
    const idx = headers.findIndex((h) => h && h.toLowerCase().includes(keyword.toLowerCase()));
    return idx >= 0 ? (values[idx] || "").trim() : "";
  };

  const getExact = (keyword) => {
    const idx = headers.findIndex((h) => h && h === keyword);
    return idx >= 0 ? (values[idx] || "").trim() : "";
  };

  const kategori = get("KATEGORI KANDIDAT");
  
  const data = {
    // Meta
    kodeReferensi: get("Kode Referensi"),
    kodeJob: get("Kode Job"),
    kategoriKandidat: kategori,
    domisili: get("DOMISILI"),

    // Data Pribadi
    namaLengkap: get("NAMA LENGKAP") || get("NAMA LENGKAP 2") || get("NAMA LENGKAP 3"),
    namaPanggilan: get("NAMA PANGGILAN") || get("NAMA PANGGILAN 2") || get("NAMA PANGGILAN 3"),
    bidangKerja: get("BIDANG KERJA YANG DIPILIH") || get("BIDANG KERJA YANG DIPILIH 2") || get("BIDANG KERJA YANG DIPILIH 3"),
    noHp: get("NO. HP AKTIF") || get("NO. HP AKTIF 2") || get("NO. HP AKTIF 3"),
    email: get("ALAMAT EMAIL") || get("ALAMAT EMAIL 2") || get("ALAMAT EMAIL 3"),
    tanggalLahir: get("TANGGA LAHIR") || get("TANGGA LAHIR 2") || get("TANGGA LAHIR 3"),
    tempatLahir: get("TEMPAT LAHIR") || get("TEMPAT LAHIR 2") || get("TEMPAT LAHIR 3"),
    alamatLengkap: get("ALAMAT LENGKAP") || get("ALAMAT LENGKAP 2") || get("ALAMAT LENGKAP 3"),
    jenisKelamin: get("JENIS KELAMIN") || get("JENIS KELAMIN 2") || get("JENIS KELAMIN 3"),
    agama: get("AGAMA") || get("AGAMA 2") || get("AGAMA 3"),
    golonganDarah: get("GOLONGAN DARAH") || get("GOLONGAN DARAH 2") || get("GOLONGAN DARAH 3"),
    tinggiBadan: get("TINGGI BADAN") || get("TINGGI BADAN (CM) 2") || get("TINGGI BADAN (CM) 3"),
    beratBadan: get("BERAT BADAN") || get("BERAT BADAN (KG) 2") || get("BERAT BADAN (KG) 3"),
    dominanTangan: get("DOMINAN TANGAN"),
    butaWarna: get("BUTA WARNA"),
    merokok: get("APAKAH ANDA MEROKOK"),
    minumAlkohol: get("APAKAH ANDA MINUM ALKOHOL"),
    tato: get("APAKAH MEMILIKI TATO"),
    penyakitBerat: get("APAKAH MEMILIKI PENYAKIT BERAT"),
    alergi: get("APAKAH MEMILIKI ALERGI"),
    hobi: get("HOBI"),
    statusPernikahan: get("STATUS PERNIKAHAN"),

    // Paspor
    pernahKeJepang: get("APAKAH PERNAH KE JEPANG"),
    memilikiPaspor: get("APAKAH MEMILIKI PASPOR"),
    nomorPaspor: get("NOMOR PASPOR"),
    masaBerlakuPaspor: get("MASA BERLAKU PASPOR"),
    memilikiSim: get("APAKAH MEMILIKI SIM"),

    // Keluarga
    keluarga: [
      {
        nama: get("DATA KELUARGA 1 : NAMA LENGKAP"),
        hubungan: get("DATA KELUARGA 1 : HUBUNGAN DENGAN ANDA"),
        usia: get("DATA KELUARGA 1 : USIA"),
        pekerjaan: get("DATA KELUARGA 1 : PEKERJAAN"),
        gaji: get("DATA KELUARGA 1 : GAJI PER BULAN"),
        tinggalBersama: get("DATA KELUARGA 1 : APAKAH TINGGAL BERSAMA"),
      },
      {
        nama: get("DATA KELUARGA 2 : NAMA LENGKAP"),
        hubungan: get("DATA KELUARGA 2 : HUBUNGAN DENGAN ANDA"),
        usia: get("DATA KELUARGA 2 : USIA"),
        pekerjaan: get("DATA KELUARGA 2 : PEKERJAAN"),
        gaji: get("DATA KELUARGA 2 : GAJI PER BULAN"),
        tinggalBersama: get("DATA KELUARGA 2 : APAKAH TINGGAL BERSAMA"),
      },
      {
        nama: get("DATA KELUARGA 3 : NAMA LENGKAP"),
        hubungan: get("DATA KELUARGA 3 : HUBUNGAN DENGAN ANDA"),
        usia: get("DATA KELUARGA 3 : USIA"),
        pekerjaan: get("DATA KELUARGA 3 : PEKERJAAN"),
        gaji: get("DATA KELUARGA 3 : GAJI PER BULAN"),
        tinggalBersama: get("DATA KELUARGA 3 : APAKAH TINGGAL BERSAMA"),
      },
      {
        nama: get("DATA KELUARGA 4 : NAMA LENGKAP"),
        hubungan: get("DATA KELUARGA 4 : HUBUNGAN DENGAN ANDA"),
        usia: get("DATA KELUARGA 4 : USIA"),
        pekerjaan: get("DATA KELUARGA 4 : PEKERJAAN"),
        gaji: get("DATA KELUARGA 4 : GAJI PER BULAN"),
        tinggalBersama: get("DATA KELUARGA 4 : APAKAH TINGGAL BERSAMA"),
      },
    ],

    // Pendidikan
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

    // Pekerjaan
    pekerjaan: [
      {
        perusahaan: get("RIWAYAT BEKERJA 1 : NAMA PERUSAHAAN"),
        masuk: get("RIWAYAT BEKERJA 1 : TANGGAL MASUK"),
        keluar: get("RIWAYAT BEKERJA 1 : TANGGAL KELUAR"),
        bidang: get("RIWAYAT BEKERJA 1 : BIDANG PEKERJAAN"),
        status: get("RIWAYAT BEKERJA 1 : STATUS PEKERJA"),
        uraian: get("RIWAYAT BEKERJA 1 : URAIAN PEKERJAAN"),
      },
      {
        perusahaan: get("RIWAYAT BEKERJA 2 : NAMA PERUSAHAAN"),
        masuk: get("RIWAYAT BEKERJA 2 : TANGGAL MASUK"),
        keluar: get("RIWAYAT BEKERJA 2 : TANGGAL KELUAR"),
        bidang: get("RIWAYAT BEKERJA 2 : BIDANG PEKERJAAN"),
        status: get("RIWAYAT BEKERJA 2 : STATUS PEKERJA"),
        uraian: get("RIWAYAT BEKERJA 2 : URAIAN PEKERJAAN"),
      },
      {
        perusahaan: get("RIWAYAT BEKERJA 3 : NAMA PERUSAHAAN"),
        masuk: get("RIWAYAT BEKERJA 3 : TANGGAL MASUK"),
        keluar: get("RIWAYAT BEKERJA 3 : TANGGAL KELUAR"),
        bidang: get("RIWAYAT BEKERJA 3 : BIDANG PEKERJAAN"),
        status: get("RIWAYAT BEKERJA 3 : STATUS PEKERJA"),
        uraian: get("RIWAYAT BEKERJA 3 : URAIAN PEKERJAAN"),
      },
      {
        perusahaan: get("RIWAYAT BEKERJA 4 : NAMA PERUSAHAAN"),
        masuk: get("RIWAYAT BEKERJA 4 : TANGGAL MASUK"),
        keluar: get("RIWAYAT BEKERJA 4 : TANGGAL KELUAR"),
        bidang: get("RIWAYAT BEKERJA 4 : BIDANG PEKERJAAN"),
        status: get("RIWAYAT BEKERJA 4 : STATUS PEKERJA"),
        uraian: get("RIWAYAT BEKERJA 4 : URAIAN PEKERJAAN"),
      },
    ],

    // Motivasi
    kelebihan: get("KELEBIHAN ANDA"),
    kekurangan: get("KEKURANGAN ANDA"),
    alasanKeJepang: get("ALASAN INGIN KE JEPANG"),
    alasanMelamarBidang: get("ALASAN INGIN MELAMAR KE BIDANG INI"),
    alasanKaigofukushishi: get("ALASAN INGIN MENJADI KAIGOFUKUSHISHI"),
    impianMasaDepan: get("IMPIAN DI MASA DEPAN"),
    lamaInginTinggal: get("LAMA INGIN TINGGAL DI JEPANG"),
    lamaBelajarBahasaJepang: get("LAMA BELAJAR BAHASA JEPANG"),

    // Kontak Darurat
    nomorDarurat: get("NOMOR DARURAT : NO HP"),
    namaPemilikDarurat: get("NOMOR DARURAT : NAMA LENGKAP PEMILIK NOMOR HP"),
    hubunganDarurat: get("NOMOR DARURAT : HUBUNGAN DENGAN PELAMAR"),

    // Sertifikat links
    sertifikatBahasaJepang: get("SERTIFIKAT BAHASA JEPANG"),
    videoJFT: get("VIDEO SCREEN RECORDING JFT"),
    sertifikatSSW: get("SERTIFIKAT SSW"),
    videoSSW: get("VIDEO SCREEN RECORDING SSW"),
    cvRirekisho: get("CV/RIREKISHO"),

    // Khusus Ex-Magang
    sertifikatSenmonkyuu: get("SERTIFIKAT SENMONKYUU"),
    sertifikatSelesaiMagang: get("SERTIFIKAT SELESAI MAGANG"),

    // Timestamps
    importedAt: new Date().toISOString(),
    submittedAt: get("Timestamp") || new Date().toISOString(),
  };

  return data;
}

function parseCSV(text) {
  const lines = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "\n" && !inQuotes) {
      lines.push(current);
      current = "";
    } else if (char === "\r" && !inQuotes) {
      // skip
    } else {
      current += char;
    }
  }
  if (current) lines.push(current);

  return lines.map((line) => {
    const cells = [];
    let cell = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQ = !inQ;
        }
      } else if (ch === "\t" && !inQ) {
        cells.push(cell);
        cell = "";
      } else if (ch === "," && !inQ) {
        cells.push(cell);
        cell = "";
      } else {
        cell += ch;
      }
    }
    cells.push(cell);
    return cells;
  });
}

export default function ImportPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState([]);

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    setFile(f);
    setStatus("");
    setPreview([]);

    if (f) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target.result;
        const rows = parseCSV(text);
        if (rows.length > 1) {
          const headers = rows[0];
          const dataRows = rows.slice(1).filter((r) => r.some((cell) => cell.trim()));
          const parsed = dataRows.map((row) => parseCSVRow(headers, row));
          setPreview(parsed.filter((p) => p.namaLengkap));
        }
      };
      reader.readAsText(f, "UTF-8");
    }
  };

  const handleImport = async () => {
    if (preview.length === 0) {
      setStatus("Tidak ada data untuk diimport");
      return;
    }

    setImporting(true);
    setStatus("Mengimport data...");
    let success = 0;
    let failed = 0;

    for (const candidate of preview) {
      try {
        const docId = candidate.namaLengkap.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase() + "_" + Date.now().toString(36);
        await setDoc(doc(db, "candidates", docId), {
          ...candidate,
          userId: "imported",
          source: "spreadsheet_import",
        });
        success++;
        setStatus(`Mengimport... ${success}/${preview.length}`);
      } catch (err) {
        failed++;
        console.error("Import error:", err);
      }
    }

    setStatus(`Selesai! ${success} berhasil, ${failed} gagal.`);
    setImporting(false);
  };

  return (
    <>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Import Data Kandidat</h1>
        <p className="text-gray-500 text-sm mb-6">
          Upload file CSV/TSV dari Google Spreadsheet (Form Responses 3) untuk mengimport data ke sistem.
        </p>

        <div className="card mb-6">
          <h2 className="font-semibold text-gray-700 mb-3">Cara Export dari Google Sheets:</h2>
          <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
            <li>Buka Spreadsheet → pilih sheet "Form Responses 3"</li>
            <li>Klik File → Download → Comma Separated Values (.csv)</li>
            <li>Upload file CSV tersebut di bawah</li>
          </ol>
        </div>

        <div className="card mb-6">
          <label className="form-label">Pilih File CSV</label>
          <input
            type="file"
            accept=".csv,.tsv,.txt"
            onChange={handleFileChange}
            className="input-field"
          />
        </div>

        {preview.length > 0 && (
          <div className="card mb-6">
            <h2 className="font-semibold text-gray-700 mb-3">Preview Data ({preview.length} kandidat)</h2>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-gray-50">
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
                      <td className="py-1 px-2">{p.kategoriKandidat}</td>
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
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
            {status}
          </div>
        )}
      </div>
    </>
  );
}
