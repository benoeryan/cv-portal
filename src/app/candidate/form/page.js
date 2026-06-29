"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import Navbar from "@/components/Navbar";

const KATEGORI_OPTIONS = ["NEW COMER", "EX-MAGANG/EX-TRAINEER", "ENGINEERING/GIJINKOKU"];
const BIDANG_OPTIONS_NEW_COMER = ["KAIGO", "PM", "PERTANIAN", "PETERNAKAN", "KONSTRUKSI DOBOKU"];
const BIDANG_OPTIONS_EX_MAGANG = ["TG JAHIT/GARMEN", "Housei", "KAIGO", "PM", "PERTANIAN", "PETERNAKAN", "KONSTRUKSI DOBOKU", "KIKAI KAKOU"];
const BIDANG_OPTIONS_ENGINEERING = ["ENGINEERING", "KIKAI KAKOU"];
const BIDANG_OPTIONS = ["KAIGO", "PM", "PERTANIAN", "PETERNAKAN", "KONSTRUKSI DOBOKU", "TG JAHIT/GARMEN", "ENGINEERING", "Housei", "KIKAI KAKOU"];
const JENIS_KELAMIN_OPTIONS = ["LAKI-LAKI", "PEREMPUAN"];
const AGAMA_OPTIONS = ["ISLAM", "KRISTEN", "KATOLIK", "HINDU", "BUDHA", "KONGHUCU"];
const GOLDAR_OPTIONS = ["A", "B", "AB", "O", "TIDAK TAHU"];
const STATUS_NIKAH_OPTIONS = ["BELUM MENIKAH", "SUDAH MENIKAH", "CERAI"];
const YA_TIDAK = ["YA", "TIDAK"];
const DOMINAN_TANGAN_OPTIONS = ["KANAN", "KIRI"];
const HUBUNGAN_KELUARGA = ["AYAH", "IBU", "KAKAK LAKI-LAKI", "KAKAK PEREMPUAN", "ADIK LAKI-LAKI", "ADIK PEREMPUAN", "SUAMI", "ISTRI", "ANAK LAKI-LAKI", "ANAK PEREMPUAN", "KAKEK", "NENEK", "PAMAN", "BIBI"];
const STATUS_PEKERJA_OPTIONS = ["Pegawai Tetap", "Pegawai Kontrak", "Magang/Internship", "Ginou jisshuusei", "Membantu Orang Tua", "Usaha Pribadi"];

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
    // Paspor
    pernahKeJepang: "TIDAK",
    dariKapan: "",
    keperluanApa: "",
    memilikiPaspor: "TIDAK",
    nomorPaspor: "",
    masaBerlakuPaspor: "",
    memilikiSim: "TIDAK PUNYA",
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
    setFormData((prev) => ({ ...prev, [name]: value }));
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
      await setDoc(doc(db, "candidates", user.uid), {
        ...formData,
        userId: user.uid,
        updatedAt: new Date().toISOString(),
        submittedAt: new Date().toISOString(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
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
            <InputField label="Memiliki SIM?" name="memilikiSim" value={formData.memilikiSim} onChange={handleChange} options={["TIDAK PUNYA", "SIM A", "SIM B", "SIM C"]} />
          </FormSection>

          {/* KHUSUS EX-MAGANG: Sertifikat Tambahan */}
          {formData.kategoriKandidat === "EX-MAGANG/EX-TRAINEER" && (
            <FormSection title="Dokumen Khusus Ex-Magang/Ex-Traineer">
              <InputField label="Sertifikat Senmonkyuu/Hyoukachosho (URL)" name="sertifikatSenmonkyuu" value={formData.sertifikatSenmonkyuu} onChange={handleChange} fullWidth placeholder="Link Google Drive" />
              <InputField label="Sertifikat Selesai Magang/JITCO (URL)" name="sertifikatSelesaiMagang" value={formData.sertifikatSelesaiMagang} onChange={handleChange} fullWidth placeholder="Link Google Drive" />
              <InputField label="Deskripsi Pekerjaan Magang/TG" name="deskripsiMagang" value={formData.deskripsiMagang} onChange={handleChange} type="textarea" fullWidth />
            </FormSection>
          )}

          {/* KHUSUS ENGINEERING: Ijazah & Transkrip */}
          {formData.kategoriKandidat === "ENGINEERING/GIJINKOKU" && (
            <FormSection title="Dokumen Khusus Engineering/Gijinkoku">
              <InputField label="Jurusan D3/S1" name="jurusanUniv" value={formData.jurusanUniv} onChange={handleChange} required />
              <InputField label="Scan Ijazah (URL)" name="scanIjazah" value={formData.scanIjazah} onChange={handleChange} placeholder="Link Google Drive" />
              <InputField label="Transkrip Nilai D3/S1 (URL)" name="transkripNilai" value={formData.transkripNilai} onChange={handleChange} placeholder="Link Google Drive" />
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
            <InputField label="Alasan Ingin Menjadi Kaigofukushishi (Khusus Kaigo)" name="alasanKaigofukushishi" value={formData.alasanKaigofukushishi} onChange={handleChange} type="textarea" fullWidth />
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
          <FormSection title="Upload Dokumen (Link Google Drive)">
            <InputField label="Sertifikat Bahasa Jepang JFT/JLPT (URL)" name="sertifikatBahasaJepang" value={formData.sertifikatBahasaJepang} onChange={handleChange} fullWidth placeholder="https://drive.google.com/..." />
            <InputField label="Video Screen Recording JFT (URL)" name="videoJFT" value={formData.videoJFT} onChange={handleChange} fullWidth placeholder="https://drive.google.com/..." />
            <InputField label="Sertifikat SSW (URL)" name="sertifikatSSW" value={formData.sertifikatSSW} onChange={handleChange} fullWidth placeholder="https://drive.google.com/..." />
            <InputField label="Video Screen Recording SSW (URL)" name="videoSSW" value={formData.videoSSW} onChange={handleChange} fullWidth placeholder="https://drive.google.com/..." />
            <InputField label="CV/Rirekisho (URL)" name="cvRirekisho" value={formData.cvRirekisho} onChange={handleChange} fullWidth placeholder="https://drive.google.com/..." />
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
