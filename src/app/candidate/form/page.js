"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import Navbar from "@/components/Navbar";
import UploadField from "@/components/UploadField";

const KATEGORI_OPTIONS = ["NEW COMER", "EX-MAGANG/EX-TRAINEER", "ENGINEERING/GIJINKOKU"];
const BIDANG_OPTIONS_NEW_COMER = ["KAIGO", "PM", "PERTANIAN", "PETERNAKAN", "KONSTRUKSI DOBOKU", "LAINNYA"];
const BIDANG_OPTIONS_EX_MAGANG = ["TG JAHIT/GARMEN", "Housei", "KAIGO", "PM", "PERTANIAN", "PETERNAKAN", "KONSTRUKSI DOBOKU", "KIKAI KAKOU", "LAINNYA"];
const BIDANG_OPTIONS_ENGINEERING = ["ENGINEERING", "KIKAI KAKOU", "LAINNYA"];
const BIDANG_OPTIONS = ["KAIGO", "PM", "PERTANIAN", "PETERNAKAN", "KONSTRUKSI DOBOKU", "TG JAHIT/GARMEN", "ENGINEERING", "Housei", "KIKAI KAKOU", "LAINNYA"];
const JENIS_KELAMIN_OPTIONS = ["LAKI-LAKI", "PEREMPUAN"];
const AGAMA_OPTIONS = ["ISLAM", "KRISTEN", "KATOLIK", "HINDU", "BUDHA", "KONGHUCU"];
const GOLDAR_OPTIONS = ["A", "B", "AB", "O", "TIDAK TAHU"];
const STATUS_NIKAH_OPTIONS = ["BELUM MENIKAH", "SUDAH MENIKAH", "CERAI"];
const YA_TIDAK = ["YA", "TIDAK"];
const DOMINAN_TANGAN_OPTIONS = ["KANAN", "KIRI"];
const HUBUNGAN_KELUARGA = ["AYAH", "IBU", "KAKAK LAKI-LAKI", "KAKAK PEREMPUAN", "ADIK LAKI-LAKI", "ADIK PEREMPUAN", "SUAMI", "ISTRI", "ANAK LAKI-LAKI", "ANAK PEREMPUAN", "KAKEK", "NENEK", "PAMAN", "BIBI"];
const STATUS_PEKERJA_OPTIONS = ["Pegawai Tetap", "Pegawai Kontrak", "Magang/Internship", "Ginou jisshuusei", "Membantu Orang Tua", "Usaha Pribadi"];
const DOC_ACCEPT = "image/*,application/pdf,.doc,.docx,.xls,.xlsx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function FormSection({ title, children }) {
  return (
    <div className="card mb-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function InputField({ label, name, value, onChange, type = "text", required = false, placeholder = "", fullWidth = false, options = null }) {
  const wrapperClass = fullWidth ? "md:col-span-2" : "";
  
  if (options) {
    return (
      <div className={wrapperClass}>
        <label className="form-label">{label}{required && <span className="text-red-500">*</span>}</label>
        <select name={name} value={value || ""} onChange={onChange} className="input-field" required={required}>
          <option value="">-- Pilih --</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    );
  }

  if (type === "textarea") {
    return (
      <div className={wrapperClass}>
        <label className="form-label">{label}{required && <span className="text-red-500">*</span>}</label>
        <textarea name={name} value={value || ""} onChange={onChange} className="input-field min-h-[80px]" required={required} placeholder={placeholder} />
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      <label className="form-label">{label}{required && <span className="text-red-500">*</span>}</label>
      <input type={type} name={name} value={value || ""} onChange={onChange} className="input-field" required={required} placeholder={placeholder} />
    </div>
  );
}

export default function CandidateFormPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formData, setFormData] = useState({
    // Data Pribadi
    kodeReferensi: "",
    kodeJob: "",
    kategoriKandidat: "",
    namaLengkap: "",
    namaPanggilan: "",
    bidangKerja: "",
    bidangKerjaLainnya: "",
    noHp: "",
    email: "",
    tanggalLahir: "",
    tempatLahir: "",
    alamatLengkap: "",
    jenisKelamin: "",
    agama: "",
    golonganDarah: "",
    tinggiBadan: "",
    beratBadan: "",
    dominanTangan: "",
    butaWarna: "TIDAK",
    merokok: "TIDAK",
    jumlahRokok: "",
    minumAlkohol: "TIDAK",
    tato: "TIDAK",
    penyakitBerat: "TIDAK",
    namaPenyakit: "",
    alergi: "TIDAK",
    namaAlergi: "",
    hobi: "",
    statusPernikahan: "",
    memilikiSim: "TIDAK",
    simA: "TIDAK",
    nomorSimA: "",
    dokumenSimA: "",
    simB: "TIDAK",
    nomorSimB: "",
    dokumenSimB: "",
    simC: "TIDAK",
    nomorSimC: "",
    dokumenSimC: "",
    // Paspor
    pernahKeJepang: "TIDAK",
    dariKapan: "",
    keperluanApa: "",
    memilikiPaspor: "TIDAK",
    nomorPaspor: "",
    masaBerlakuPaspor: "",
    // Keluarga (max 4 entries for simplicity)
    keluarga: [
      { nama: "", hubungan: "", usia: "", pekerjaan: "", gaji: "", tinggalBersama: "" },
      { nama: "", hubungan: "", usia: "", pekerjaan: "", gaji: "", tinggalBersama: "" },
      { nama: "", hubungan: "", usia: "", pekerjaan: "", gaji: "", tinggalBersama: "" },
      { nama: "", hubungan: "", usia: "", pekerjaan: "", gaji: "", tinggalBersama: "" },
    ],
    // Pendidikan
    sdNama: "", sdMasuk: "", sdLulus: "",
    smpNama: "", smpMasuk: "", smpLulus: "",
    smaNama: "", smaMasuk: "", smaLulus: "", smaJurusan: "",
    univNama: "", univMasuk: "", univLulus: "", univJurusan: "",
    // Riwayat Kerja (max 4)
    pekerjaan: [
      { perusahaan: "", masuk: "", keluar: "", bidang: "", status: "", uraian: "" },
      { perusahaan: "", masuk: "", keluar: "", bidang: "", status: "", uraian: "" },
      { perusahaan: "", masuk: "", keluar: "", bidang: "", status: "", uraian: "" },
      { perusahaan: "", masuk: "", keluar: "", bidang: "", status: "", uraian: "" },
    ],
    // Motivasi
    kelebihan: "",
    kekurangan: "",
    alasanKeJepang: "",
    alasanMelamarBidang: "",
    alasanKaigofukushishi: "",
    impianMasaDepan: "",
    lamaInginTinggal: "",
    lamaBelajarBahasaJepang: "",
    // Kontak Darurat
    nomorDarurat: "",
    namaPemilikDarurat: "",
    hubunganDarurat: "",
    // Khusus Ex-Magang
    sertifikatSenmonkyuu: "",
    sertifikatSelesaiMagang: "",
    deskripsiMagang: "",
    // Khusus Engineering
    jurusanUniv: "",
    scanIjazah: "",
    transkripNilai: "",
    riwayatRelevan: "",
    // Sertifikat Umum
    pasPhoto: "",
    sertifikatBahasaJepang: "",
    videoJFT: "",
    sertifikatSSW: "",
    videoSSW: "",
    cvRirekisho: "",
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
      return;
    }
    if (user) {
      loadExistingData();
    }
  }, [user, authLoading]);

  const loadExistingData = async () => {
    try {
      const docRef = doc(db, "candidates", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setFormData((prev) => ({ ...prev, ...data }));
      }
    } catch (err) {
      console.error("Error loading data:", err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      // When kategori changes, reset bidangKerja and bidangKerjaLainnya
      if (name === "kategoriKandidat") {
        updated.bidangKerja = "";
        updated.bidangKerjaLainnya = "";
      }
      // When bidangKerja changes away from LAINNYA, clear bidangKerjaLainnya
      if (name === "bidangKerja" && value !== "LAINNYA") {
        updated.bidangKerjaLainnya = "";
      }
      // When memilikiSim changes away from YA, clear SIM-related fields
      if (name === "memilikiSim" && value !== "YA") {
        updated.simA = "TIDAK";
        updated.nomorSimA = "";
        updated.dokumenSimA = "";
        updated.simB = "TIDAK";
        updated.nomorSimB = "";
        updated.dokumenSimB = "";
        updated.simC = "TIDAK";
        updated.nomorSimC = "";
        updated.dokumenSimC = "";
      }
      // When individual SIM type changes to TIDAK, clear its fields
      if (name === "simA" && value !== "YA") {
        updated.nomorSimA = "";
        updated.dokumenSimA = "";
      }
      if (name === "simB" && value !== "YA") {
        updated.nomorSimB = "";
        updated.dokumenSimB = "";
      }
      if (name === "simC" && value !== "YA") {
        updated.nomorSimC = "";
        updated.dokumenSimC = "";
      }
      return updated;
    });
  };

  const handleKeluargaChange = (index, field, value) => {
    setFormData((prev) => {
      const keluarga = [...prev.keluarga];
      keluarga[index] = { ...keluarga[index], [field]: value };
      return { ...prev, keluarga };
    });
  };

  const handlePekerjaanChange = (index, field, value) => {
    setFormData((prev) => {
      const pekerjaan = [...prev.pekerjaan];
      pekerjaan[index] = { ...pekerjaan[index], [field]: value };
      return { ...prev, pekerjaan };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSaved(false);
    try {
      const dataToSave = { ...formData };
      // If bidangKerja is "LAINNYA", replace it with the manually entered value
      if (dataToSave.bidangKerja === "LAINNYA" && dataToSave.bidangKerjaLainnya) {
        dataToSave.bidangKerja = dataToSave.bidangKerjaLainnya;
      }
      await setDoc(doc(db, "candidates", user.uid), {
        ...dataToSave,
        userId: user.uid,
        updatedAt: new Date().toISOString(),
        submittedAt: new Date().toISOString(),
      });
      setSaved(true);
      // Redirect to status page after successful save
      setTimeout(() => {
        router.push("/candidate/status");
      }, 1500);
    } catch (err) {
      alert("Gagal menyimpan: " + err.message);
    }
    setLoading(false);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Form Data Kandidat</h1>
          <p className="text-gray-500 text-sm">Isi data lengkap Anda untuk pembuatan CV</p>
        </div>

        {saved && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
            Data berhasil disimpan!
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* DATA PRIBADI */}
          <FormSection title="Data Pribadi">
            <InputField label="Kode Referensi" name="kodeReferensi" value={formData.kodeReferensi} onChange={handleChange} placeholder="Contoh: Jimusho" />
            <InputField label="Kode Job" name="kodeJob" value={formData.kodeJob} onChange={handleChange} placeholder="Contoh: IJEF076" />
            <InputField label="Kategori Kandidat" name="kategoriKandidat" value={formData.kategoriKandidat} onChange={handleChange} options={KATEGORI_OPTIONS} required />
            <InputField label="Bidang Kerja" name="bidangKerja" value={formData.bidangKerja} onChange={handleChange} options={
              formData.kategoriKandidat === "NEW COMER" ? BIDANG_OPTIONS_NEW_COMER :
              formData.kategoriKandidat === "EX-MAGANG/EX-TRAINEER" ? BIDANG_OPTIONS_EX_MAGANG :
              formData.kategoriKandidat === "ENGINEERING/GIJINKOKU" ? BIDANG_OPTIONS_ENGINEERING :
              BIDANG_OPTIONS
            } required />
            {formData.bidangKerja === "LAINNYA" && (
              <InputField label="Bidang Kerja (Manual)" name="bidangKerjaLainnya" value={formData.bidangKerjaLainnya} onChange={handleChange} required placeholder="Masukkan bidang kerja" />
            )}
            <InputField label="Nama Lengkap" name="namaLengkap" value={formData.namaLengkap} onChange={handleChange} required />
            <InputField label="Nama Panggilan" name="namaPanggilan" value={formData.namaPanggilan} onChange={handleChange} required />
            <InputField label="No. HP Aktif" name="noHp" value={formData.noHp} onChange={handleChange} required placeholder="+628xxxxxxxxxx" />
            <InputField label="Alamat Email" name="email" value={formData.email} onChange={handleChange} type="email" required />
            <InputField label="Tanggal Lahir" name="tanggalLahir" value={formData.tanggalLahir} onChange={handleChange} type="date" required />
            <InputField label="Tempat Lahir" name="tempatLahir" value={formData.tempatLahir} onChange={handleChange} required />
            <InputField label="Alamat Lengkap" name="alamatLengkap" value={formData.alamatLengkap} onChange={handleChange} type="textarea" required fullWidth />
            <InputField label="Jenis Kelamin" name="jenisKelamin" value={formData.jenisKelamin} onChange={handleChange} options={JENIS_KELAMIN_OPTIONS} required />
            <InputField label="Agama" name="agama" value={formData.agama} onChange={handleChange} options={AGAMA_OPTIONS} required />
            <InputField label="Golongan Darah" name="golonganDarah" value={formData.golonganDarah} onChange={handleChange} options={GOLDAR_OPTIONS} />
            <InputField label="Tinggi Badan (CM)" name="tinggiBadan" value={formData.tinggiBadan} onChange={handleChange} type="number" required />
            <InputField label="Berat Badan (KG)" name="beratBadan" value={formData.beratBadan} onChange={handleChange} type="number" required />
            <InputField label="Dominan Tangan" name="dominanTangan" value={formData.dominanTangan} onChange={handleChange} options={DOMINAN_TANGAN_OPTIONS} />
            <InputField label="Buta Warna" name="butaWarna" value={formData.butaWarna} onChange={handleChange} options={YA_TIDAK} />
            <InputField label="Merokok" name="merokok" value={formData.merokok} onChange={handleChange} options={YA_TIDAK} />
            {formData.merokok === "YA" && (
              <InputField label="Jumlah Rokok/Hari" name="jumlahRokok" value={formData.jumlahRokok} onChange={handleChange} />
            )}
            <InputField label="Minum Alkohol" name="minumAlkohol" value={formData.minumAlkohol} onChange={handleChange} options={YA_TIDAK} />
            <InputField label="Memiliki Tato" name="tato" value={formData.tato} onChange={handleChange} options={YA_TIDAK} />
            <InputField label="Penyakit Berat" name="penyakitBerat" value={formData.penyakitBerat} onChange={handleChange} options={YA_TIDAK} />
            {formData.penyakitBerat === "YA" && (
              <InputField label="Nama Penyakit" name="namaPenyakit" value={formData.namaPenyakit} onChange={handleChange} />
            )}
            <InputField label="Alergi" name="alergi" value={formData.alergi} onChange={handleChange} options={YA_TIDAK} />
            {formData.alergi === "YA" && (
              <InputField label="Nama Alergi" name="namaAlergi" value={formData.namaAlergi} onChange={handleChange} />
            )}
            <InputField label="Hobi" name="hobi" value={formData.hobi} onChange={handleChange} />
            <InputField label="Status Pernikahan" name="statusPernikahan" value={formData.statusPernikahan} onChange={handleChange} options={STATUS_NIKAH_OPTIONS} required />
            <InputField label="Memiliki SIM?" name="memilikiSim" value={formData.memilikiSim} onChange={handleChange} options={YA_TIDAK} />
            {formData.memilikiSim === "YA" && (
              <>
                <div className="md:col-span-2 space-y-4">
                  {/* SIM A */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <InputField label="SIM A" name="simA" value={formData.simA} onChange={handleChange} options={YA_TIDAK} />
                      {formData.simA === "YA" && (
                        <>
                          <InputField label="Nomor SIM A" name="nomorSimA" value={formData.nomorSimA} onChange={handleChange} required placeholder="Masukkan nomor SIM A" />
                          <UploadField label="Upload SIM A" name="dokumenSimA" value={formData.dokumenSimA} onChange={handleChange} accept={DOC_ACCEPT} userId={user?.uid} />
                        </>
                      )}
                    </div>
                  </div>
                  {/* SIM B */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <InputField label="SIM B" name="simB" value={formData.simB} onChange={handleChange} options={YA_TIDAK} />
                      {formData.simB === "YA" && (
                        <>
                          <InputField label="Nomor SIM B" name="nomorSimB" value={formData.nomorSimB} onChange={handleChange} required placeholder="Masukkan nomor SIM B" />
                          <UploadField label="Upload SIM B" name="dokumenSimB" value={formData.dokumenSimB} onChange={handleChange} accept={DOC_ACCEPT} userId={user?.uid} />
                        </>
                      )}
                    </div>
                  </div>
                  {/* SIM C */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <InputField label="SIM C" name="simC" value={formData.simC} onChange={handleChange} options={YA_TIDAK} />
                      {formData.simC === "YA" && (
                        <>
                          <InputField label="Nomor SIM C" name="nomorSimC" value={formData.nomorSimC} onChange={handleChange} required placeholder="Masukkan nomor SIM C" />
                          <UploadField label="Upload SIM C" name="dokumenSimC" value={formData.dokumenSimC} onChange={handleChange} accept={DOC_ACCEPT} userId={user?.uid} />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </FormSection>

          {/* PASPOR & JEPANG */}
          <FormSection title="Paspor & Pengalaman Jepang">
            <InputField label="Pernah ke Jepang?" name="pernahKeJepang" value={formData.pernahKeJepang} onChange={handleChange} options={YA_TIDAK} />
            {formData.pernahKeJepang === "YA" && (
              <>
                <InputField label="Dari Kapan?" name="dariKapan" value={formData.dariKapan} onChange={handleChange} />
                <InputField label="Atas Keperluan Apa?" name="keperluanApa" value={formData.keperluanApa} onChange={handleChange} />
              </>
            )}
            <InputField label="Memiliki Paspor?" name="memilikiPaspor" value={formData.memilikiPaspor} onChange={handleChange} options={["YA", "TIDAK"]} />
            {formData.memilikiPaspor === "YA" && (
              <>
                <InputField label="Nomor Paspor" name="nomorPaspor" value={formData.nomorPaspor} onChange={handleChange} />
                <InputField label="Masa Berlaku Paspor" name="masaBerlakuPaspor" value={formData.masaBerlakuPaspor} onChange={handleChange} type="date" />
              </>
            )}
          </FormSection>

          {/* KHUSUS EX-MAGANG: Sertifikat Tambahan */}
          {formData.kategoriKandidat === "EX-MAGANG/EX-TRAINEER" && (
            <FormSection title="Dokumen Khusus Ex-Magang/Ex-Traineer">
              <UploadField label="Sertifikat Senmonkyuu/Hyoukachosho" name="sertifikatSenmonkyuu" value={formData.sertifikatSenmonkyuu} onChange={handleChange} accept={DOC_ACCEPT} userId={user?.uid} fullWidth />
              <UploadField label="Sertifikat Selesai Magang/JITCO" name="sertifikatSelesaiMagang" value={formData.sertifikatSelesaiMagang} onChange={handleChange} accept={DOC_ACCEPT} userId={user?.uid} fullWidth />
              <InputField label="Deskripsi Pekerjaan Magang/TG" name="deskripsiMagang" value={formData.deskripsiMagang} onChange={handleChange} type="textarea" fullWidth />
            </FormSection>
          )}

          {/* KHUSUS ENGINEERING: Ijazah & Transkrip */}
          {formData.kategoriKandidat === "ENGINEERING/GIJINKOKU" && (
            <FormSection title="Dokumen Khusus Engineering/Gijinkoku">
              <InputField label="Jurusan D3/S1" name="jurusanUniv" value={formData.jurusanUniv} onChange={handleChange} required />
              <UploadField label="Scan Ijazah" name="scanIjazah" value={formData.scanIjazah} onChange={handleChange} accept={DOC_ACCEPT} userId={user?.uid} fullWidth />
              <UploadField label="Transkrip Nilai D3/S1" name="transkripNilai" value={formData.transkripNilai} onChange={handleChange} accept={DOC_ACCEPT} userId={user?.uid} fullWidth />
              <InputField label="Riwayat Pekerjaan yang Relevan" name="riwayatRelevan" value={formData.riwayatRelevan} onChange={handleChange} type="textarea" fullWidth />
            </FormSection>
          )}

          {/* DATA KELUARGA */}
          <div className="card mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Data Keluarga</h2>
            {formData.keluarga.map((k, idx) => (
              <div key={idx} className="mb-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-600 mb-3">Keluarga {idx + 1}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="form-label">Nama Lengkap</label>
                    <input className="input-field" value={k.nama} onChange={(e) => handleKeluargaChange(idx, "nama", e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label">Hubungan</label>
                    <select className="input-field" value={k.hubungan} onChange={(e) => handleKeluargaChange(idx, "hubungan", e.target.value)}>
                      <option value="">-- Pilih --</option>
                      {HUBUNGAN_KELUARGA.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Usia</label>
                    <input type="number" className="input-field" value={k.usia} onChange={(e) => handleKeluargaChange(idx, "usia", e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label">Pekerjaan</label>
                    <input className="input-field" value={k.pekerjaan} onChange={(e) => handleKeluargaChange(idx, "pekerjaan", e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label">Gaji/Bulan</label>
                    <input className="input-field" value={k.gaji} onChange={(e) => handleKeluargaChange(idx, "gaji", e.target.value)} placeholder="Rp" />
                  </div>
                  <div>
                    <label className="form-label">Tinggal Bersama?</label>
                    <select className="input-field" value={k.tinggalBersama} onChange={(e) => handleKeluargaChange(idx, "tinggalBersama", e.target.value)}>
                      <option value="">-- Pilih --</option>
                      <option value="TINGGAL BERSAMA">Tinggal Bersama</option>
                      <option value="TINGGAL TERPISAH">Tinggal Terpisah</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* PENDIDIKAN */}
          <FormSection title="Riwayat Pendidikan">
            <InputField label="SD - Nama Sekolah" name="sdNama" value={formData.sdNama} onChange={handleChange} />
            <InputField label="SD - Tahun Masuk" name="sdMasuk" value={formData.sdMasuk} onChange={handleChange} type="date" />
            <InputField label="SD - Tahun Lulus" name="sdLulus" value={formData.sdLulus} onChange={handleChange} type="date" />
            <div></div>
            <InputField label="SMP - Nama Sekolah" name="smpNama" value={formData.smpNama} onChange={handleChange} />
            <InputField label="SMP - Tahun Masuk" name="smpMasuk" value={formData.smpMasuk} onChange={handleChange} type="date" />
            <InputField label="SMP - Tahun Lulus" name="smpLulus" value={formData.smpLulus} onChange={handleChange} type="date" />
            <div></div>
            <InputField label="SMA/K - Nama Sekolah" name="smaNama" value={formData.smaNama} onChange={handleChange} />
            <InputField label="SMA/K - Tahun Masuk" name="smaMasuk" value={formData.smaMasuk} onChange={handleChange} type="date" />
            <InputField label="SMA/K - Tahun Lulus" name="smaLulus" value={formData.smaLulus} onChange={handleChange} type="date" />
            <InputField label="SMA/K - Jurusan" name="smaJurusan" value={formData.smaJurusan} onChange={handleChange} />
            <InputField label="Universitas - Nama" name="univNama" value={formData.univNama} onChange={handleChange} />
            <InputField label="Universitas - Tahun Masuk" name="univMasuk" value={formData.univMasuk} onChange={handleChange} type="date" />
            <InputField label="Universitas - Tahun Lulus" name="univLulus" value={formData.univLulus} onChange={handleChange} type="date" />
            <InputField label="Universitas - Jurusan" name="univJurusan" value={formData.univJurusan} onChange={handleChange} />
          </FormSection>

          {/* RIWAYAT KERJA */}
          <div className="card mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Riwayat Pekerjaan</h2>
            {formData.pekerjaan.map((p, idx) => (
              <div key={idx} className="mb-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-600 mb-3">Pekerjaan {idx + 1}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Nama Perusahaan</label>
                    <input className="input-field" value={p.perusahaan} onChange={(e) => handlePekerjaanChange(idx, "perusahaan", e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label">Bidang Pekerjaan</label>
                    <input className="input-field" value={p.bidang} onChange={(e) => handlePekerjaanChange(idx, "bidang", e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label">Tanggal Masuk</label>
                    <input type="date" className="input-field" value={p.masuk} onChange={(e) => handlePekerjaanChange(idx, "masuk", e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label">Tanggal Keluar</label>
                    <input type="date" className="input-field" value={p.keluar} onChange={(e) => handlePekerjaanChange(idx, "keluar", e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label">Status Pekerja</label>
                    <select className="input-field" value={p.status} onChange={(e) => handlePekerjaanChange(idx, "status", e.target.value)}>
                      <option value="">-- Pilih --</option>
                      {STATUS_PEKERJA_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="form-label">Uraian Pekerjaan</label>
                    <textarea className="input-field min-h-[60px]" value={p.uraian} onChange={(e) => handlePekerjaanChange(idx, "uraian", e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* MOTIVASI */}
          <FormSection title="Motivasi & Kelebihan/Kekurangan">
            <InputField label="Kelebihan Anda" name="kelebihan" value={formData.kelebihan} onChange={handleChange} type="textarea" fullWidth required />
            <InputField label="Kekurangan Anda" name="kekurangan" value={formData.kekurangan} onChange={handleChange} type="textarea" fullWidth required />
            <InputField label="Alasan Ingin ke Jepang" name="alasanKeJepang" value={formData.alasanKeJepang} onChange={handleChange} type="textarea" fullWidth required />
            <InputField label="Alasan Melamar di Bidang Ini" name="alasanMelamarBidang" value={formData.alasanMelamarBidang} onChange={handleChange} type="textarea" fullWidth />
            {formData.kategoriKandidat !== "ENGINEERING/GIJINKOKU" && (
              <InputField label="Alasan Ingin Menjadi Kaigofukushishi (Khusus Kaigo)" name="alasanKaigofukushishi" value={formData.alasanKaigofukushishi} onChange={handleChange} type="textarea" fullWidth />
            )}
            <InputField label="Impian di Masa Depan" name="impianMasaDepan" value={formData.impianMasaDepan} onChange={handleChange} type="textarea" fullWidth />
            <InputField label="Lama Ingin Tinggal di Jepang" name="lamaInginTinggal" value={formData.lamaInginTinggal} onChange={handleChange} />
            <InputField label="Lama Belajar Bahasa Jepang" name="lamaBelajarBahasaJepang" value={formData.lamaBelajarBahasaJepang} onChange={handleChange} />
          </FormSection>

          {/* KONTAK DARURAT */}
          <FormSection title="Kontak Darurat">
            <InputField label="No HP Darurat" name="nomorDarurat" value={formData.nomorDarurat} onChange={handleChange} required />
            <InputField label="Nama Pemilik No Darurat" name="namaPemilikDarurat" value={formData.namaPemilikDarurat} onChange={handleChange} required />
            <InputField label="Hubungan dengan Pelamar" name="hubunganDarurat" value={formData.hubunganDarurat} onChange={handleChange} required />
          </FormSection>

          {/* DOKUMEN / SERTIFIKAT */}
          <FormSection title="Upload Dokumen">
            <UploadField label="Pas Photo 3x4" name="pasPhoto" value={formData.pasPhoto} onChange={handleChange} accept="image/*" userId={user?.uid} fullWidth />
            <UploadField label="Sertifikat Bahasa Jepang JFT/JLPT" name="sertifikatBahasaJepang" value={formData.sertifikatBahasaJepang} onChange={handleChange} accept={DOC_ACCEPT} userId={user?.uid} fullWidth />
            <UploadField label="Video Screen Recording JFT" name="videoJFT" value={formData.videoJFT} onChange={handleChange} accept="video/*" userId={user?.uid} fullWidth />
            <UploadField label="Sertifikat SSW" name="sertifikatSSW" value={formData.sertifikatSSW} onChange={handleChange} accept={DOC_ACCEPT} userId={user?.uid} fullWidth />
            <UploadField label="Video Screen Recording SSW" name="videoSSW" value={formData.videoSSW} onChange={handleChange} accept="video/*" userId={user?.uid} fullWidth />
            <UploadField label="CV/Rirekisho" name="cvRirekisho" value={formData.cvRirekisho} onChange={handleChange} accept={DOC_ACCEPT} userId={user?.uid} fullWidth />
          </FormSection>

          <div className="flex justify-end space-x-3 mb-12">
            <button type="submit" className="btn-primary px-8" disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan Data"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
