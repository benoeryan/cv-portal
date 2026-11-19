import backupJson from "../../firestore_backup.json";

function parseFirestoreValue(val) {
  if (!val) return null;
  if (val.stringValue !== undefined) return val.stringValue;
  if (val.integerValue !== undefined) return parseInt(val.integerValue, 10);
  if (val.doubleValue !== undefined) return parseFloat(val.doubleValue);
  if (val.booleanValue !== undefined) return val.booleanValue;
  if (val.timestampValue !== undefined) return val.timestampValue;
  if (val.nullValue !== undefined) return null;
  if (val.mapValue) {
    const res = {};
    const fields = val.mapValue.fields || {};
    for (const [k, v] of Object.entries(fields)) {
      res[k] = parseFirestoreValue(v);
    }
    return res;
  }
  if (val.arrayValue) {
    const values = val.arrayValue.values || [];
    return values.map(parseFirestoreValue);
  }
  return null;
}

export function parseFirestoreFields(fields) {
  const result = {};
  for (const [k, v] of Object.entries(fields || {})) {
    result[k] = parseFirestoreValue(v);
  }
  return result;
}

export function getBackupCandidates() {
  if (!backupJson || !backupJson.candidates) return [];
  const list = backupJson.candidates.map((c) => ({
    id: c.id,
    ...parseFirestoreFields(c.fields),
  }));

  const recentAdds = [
    {
      id: "jian_mutiasukma_2026",
      namaLengkap: "JIAN MUTIASUKMA",
      namaPanggilan: "Jian",
      bidangKerja: "KAIGO",
      kategoriKandidat: "NEW COMER",
      statusProgres: "Pending Nunggu Job",
      jenisKelamin: "PEREMPUAN",
      submittedAt: "2026-10-22T12:00:00.000Z",
      updatedAt: "2026-10-22T12:00:00.000Z"
    },
    {
      id: "iqbal_adama_2026",
      namaLengkap: "IQBAL ADAMA",
      namaPanggilan: "Iqbal",
      bidangKerja: "PERHOTELAN",
      kategoriKandidat: "NEW COMER",
      statusProgres: "Pending Nunggu Job",
      jenisKelamin: "LAKI-LAKI",
      submittedAt: "2026-10-22T12:00:00.000Z",
      updatedAt: "2026-10-22T12:00:00.000Z"
    },
    {
      id: "syahira_ayudha_2026",
      namaLengkap: "SYAHIRA AYUDHA",
      namaPanggilan: "Syahira",
      bidangKerja: "KAIGO",
      kategoriKandidat: "NEW COMER",
      statusProgres: "Pending Nunggu Job",
      jenisKelamin: "PEREMPUAN",
      submittedAt: "2026-10-22T12:00:00.000Z",
      updatedAt: "2026-10-22T12:00:00.000Z"
    }
  ];

  let localAdds = [];
  try {
    const rawLocal = typeof window !== "undefined" ? (localStorage.getItem("cv_portal_cached_candidates") || localStorage.getItem("cv_portal_local_candidates") || "[]") : "[]";
    localAdds = JSON.parse(rawLocal);
  } catch (e) {}

  const map = new Map();
  recentAdds.forEach(r => map.set(r.id, r));

  list.forEach(item => {
    if (item && item.id) map.set(String(item.id), item);
  });

  localAdds.forEach(item => {
    if (item && item.id) {
      const existing = map.get(String(item.id)) || {};
      map.set(String(item.id), { ...existing, ...item });
    }
  });

  return Array.from(map.values());
}

export function getBackupUsers() {
  if (!backupJson || !backupJson.users) return [];
  return backupJson.users.map((u) => ({
    id: u.id,
    ...parseFirestoreFields(u.fields),
  }));
}

export const EXTRACTED_JOBS = [
  {
    id: "job_001",
    kodeJob: "TG-PLASTIK-001",
    namaJob: "PLASTIK MOLDING (プラスチック成形)",
    lokasi: "Niigata-ken (新潟県)",
    gaji: "1.200円/jam (Ada kenaikan gaji & Bonus)",
    jumlahKandidat: "3",
    jenisKelamin: "Pria",
    syaratKhusus: "Laki-laki ex-magang Plastik Molding, memiliki Hyoukachousho / Senmonkyuu",
    biayaJob: "Sesuai Ketentuan",
    benefit: "Bisa dilamar dari Indonesia / Jepang",
    keterangan: "Tokutei Ginou bidang Plastik Molding",
    bidang: "Pengolahan Plastik",
    perusahaan: "Pabrik Plastik Niigata",
    kumiaiPartner: "TSK Partner",
    kategori: "SISWA MATCHING JOB : EX-MAGANG",
    klasifikasiSkema: "Standard",
    statusJob: "Open"
  },
  {
    id: "job_002",
    kodeJob: "TG-KAIGO-002",
    namaJob: "KAIGO STAFF (介護作業)",
    lokasi: "Chiyoda-ku, Tokyo (東京都千代田区)",
    gaji: "200.000円/bulan (1.190円/jam)",
    jumlahKandidat: "10",
    jenisKelamin: "Wanita",
    syaratKhusus: "JLPT N4 / JFT-Basic A2 + SSW Kaigo. Pengalaman Perawat/Caregiver",
    biayaJob: "Sesuai Ketentuan",
    benefit: "Jam kerja 08:00 - 17:30 (Istirahat 90 mnt), Kontrak 3 tahun",
    keterangan: "Panti Lansia Tokyo Chiyoda-ku",
    bidang: "Kaigo (Perawat Lansia)",
    perusahaan: "Kawai Jun / Tokyo Nursing Facility",
    kumiaiPartner: "TSK Partner",
    kategori: "SISWA NON IJEF : NEW COMER",
    klasifikasiSkema: "Standard",
    statusJob: "Open"
  },
  {
    id: "job_003",
    kodeJob: "TG-FOOD-003",
    namaJob: "PENGOLAHAN MAKANAN - DENROKU (食品製造)",
    lokasi: "Yamagata City, Yamagata (山形県山形市)",
    gaji: "220.200円/bulan (Estimasi bersih 179.137円/bulan)",
    jumlahKandidat: "5",
    jenisKelamin: "Pria & Wanita",
    syaratKhusus: "JLPT N4 / JFT-Basic A2 + SSW Pengolahan Makanan",
    biayaJob: "Sewa Apato 5.000 yen, Listrik/Gas/Air ditanggung sesuai batas normal",
    benefit: "Bonus 2-3 bulan gaji/tahun, Kenaikan gaji 1x/tahun, Tiket pesawat ditanggung",
    keterangan: "Pengolahan makanan ringan (kacang-kacangan, cokelat, maintenance mesin)",
    bidang: "Pengolahan Makanan",
    perusahaan: "Denroku Co., Ltd.",
    kumiaiPartner: "TSK Partner",
    kategori: "SISWA NON IJEF : NEW COMER",
    klasifikasiSkema: "Urgent",
    statusJob: "Open"
  },
  {
    id: "job_004",
    kodeJob: "TG-PRESS-004",
    namaJob: "PRESS LOGAM (金属プレス加工)",
    lokasi: "Kanuma City, Tochigi (栃木県鹿沼市)",
    gaji: "1.068円/jam (Gaji bulanan reguler)",
    jumlahKandidat: "1",
    jenisKelamin: "Pria",
    syaratKhusus: "Pria (usia max 40 thn, min 155 cm), Bahasa Jepang JLPT N4",
    biayaJob: "Sewa Asrama / Apato real cost",
    benefit: "Jam kerja 08:15 - 17:15, Bonus & Kenaikan gaji ada",
    keterangan: "Industri Pengolahan Logam & Mesin Press",
    bidang: "Manufaktur / Mesin",
    perusahaan: "Kabushikigaisha Tochigi Press",
    kumiaiPartner: "TSK Partner",
    kategori: "SISWA NON IJEF : NEW COMER",
    klasifikasiSkema: "Standard",
    statusJob: "Open"
  },
  {
    id: "job_005",
    kodeJob: "TG-NC-005",
    namaJob: "MESIN SKAF / NC LATHE (NC旋盤 加工業務)",
    lokasi: "Tsubame City, Niigata (新潟県燕市)",
    gaji: "187.500円/bulan (Kenaikan gaji 2.000-4.000 yen/bln)",
    jumlahKandidat: "2",
    jenisKelamin: "Pria & Wanita",
    syaratKhusus: "JLPT N4+, Pengalaman pabrik minimal 1 tahun, Bisa komuter sepeda",
    biayaJob: "Apartemen kontrak pribadi (Diberikan uang saku masuk 150.000 yen)",
    benefit: "Bonus 3x/tahun (total 2 bulan gaji), Tiket pesawat keberangkatan ditanggung",
    keterangan: "Pengolahan komponen presisi menggunakan mesin NC Lathe",
    bidang: "Manufaktur / Mesin",
    perusahaan: "Tsubame Machinery Co., Ltd.",
    kumiaiPartner: "TSK Partner",
    kategori: "SISWA NON IJEF : NEW COMER",
    klasifikasiSkema: "Standard",
    statusJob: "Open"
  },
  {
    id: "job_006",
    kodeJob: "GIJIN-NC-006",
    namaJob: "ENGINEER NC LATHE (技人国 NC旋盤エンジニア)",
    lokasi: "Tsubame City, Niigata (新潟県燕市)",
    gaji: "215.000円/bulan ~ (Kenaikan gaji 2.000-4.000 yen/bln)",
    jumlahKandidat: "2",
    jenisKelamin: "Pria & Wanita",
    syaratKhusus: "Lulusan S1 Teknik Mesin, Pengalaman NC Lathe (DMG Mori, Miyano, Citizen)",
    biayaJob: "Uang saku masuk 150.000 yen, Biaya tiket pesawat ditanggung",
    benefit: "Bonus 3x/tahun (total 2 bulan gaji), Karyawan Tetap (Seishain)",
    keterangan: "Pemrograman, setup, pengolahan, dan quality control produk presisi",
    bidang: "Engineering / Gijinkoku",
    perusahaan: "Tsubame Precision Engineering",
    kumiaiPartner: "TSK Partner",
    kategori: "SISWA MATCHING JOB : ENGINEERING",
    klasifikasiSkema: "Urgent",
    statusJob: "Open"
  },
  {
    id: "job_007",
    kodeJob: "TG-CONCRETE-007",
    namaJob: "KONSTRUKSI BETON (コンクリート打設工)",
    lokasi: "Osaka / Area Kansai (大阪・関西エリア)",
    gaji: "11.000円/hari (Gaji harian)",
    jumlahKandidat: "3",
    jenisKelamin: "Pria",
    syaratKhusus: "Tokutei Ginou Konstruksi 1 atau lulusan Magang 2 tahun. JLPT N4~N3",
    biayaJob: "Sewa Apato 28.750 yen/bulan",
    benefit: "Jam kerja 08:00 - 17:00 (Sabtu/Minggu/Tgl Merah Libur), Bonus 3x/tahun",
    keterangan: "Pekerjaan pengecoran beton di lokasi proyek lapangan",
    bidang: "Konstruksi",
    perusahaan: "Kansai Concrete Construction",
    kumiaiPartner: "TSK Partner",
    kategori: "SISWA MATCHING JOB : EX-MAGANG",
    klasifikasiSkema: "Standard",
    statusJob: "Open"
  },
  {
    id: "job_008",
    kodeJob: "GIJIN-SHOP-008",
    namaJob: "SALES & TOKO HANDPHONE (携帯ショップ 販売)",
    lokasi: "Seluruh Prefektur Jepang (全国)",
    gaji: "247.500円 ~ 263.500円/bulan",
    jumlahKandidat: "30",
    jenisKelamin: "Pria & Wanita",
    syaratKhusus: "Usia 18-44 thn, Lulusan SMA/SMK/D3/S1, Bahasa Jepang JLPT N1 / Kaiwa Lancar",
    biayaJob: "Tunjangan transportasi penuh",
    benefit: "Bonus 2x/tahun (Musim Panas & Dingin), Peluang Seishain (Karyawan Tetap)",
    keterangan: "Pelayanan pelanggan, penawaran produk toko hp, manajemen event promosi",
    bidang: "Engineering / Gijinkoku",
    perusahaan: "Mobile Phone Shop Network Japan",
    kumiaiPartner: "TSK Partner",
    kategori: "SISWA MATCHING JOB : ENGINEERING",
    klasifikasiSkema: "Urgent",
    statusJob: "Open"
  },
  {
    id: "job_009",
    kodeJob: "TG-KAIGO-009",
    namaJob: "KAIGO PERAWAT LANSIA (介護業)",
    lokasi: "Kasukabe City, Saitama (埼玉県春日部市)",
    gaji: "252.150円/bulan (Gaji pokok 210.000円 + Tunjangan Malam 6.000円/shift)",
    jumlahKandidat: "2",
    jenisKelamin: "Pria & Wanita",
    syaratKhusus: "JLPT N3+ / Pengalaman Kaigo. Sertifikat Tokutei Ginou Kaigo",
    biayaJob: "Tunjangan Transportasi Ada, Asrama / Rumah Dinas Tersedia",
    benefit: "Karyawan Tetap (Seishain), Bonus 3x/tahun (total 2.3 bulan gaji)",
    keterangan: "Pelayanan perawatan lansia harian di panti kelompok lansia Kasukabe",
    bidang: "Kaigo (Perawat Lansia)",
    perusahaan: "Kasukabe Elderly Care Home",
    kumiaiPartner: "TSK Partner",
    kategori: "SISWA NON IJEF : NEW COMER",
    klasifikasiSkema: "Standard",
    statusJob: "Open"
  },
  {
    id: "job_010",
    kodeJob: "TG-CASTING-010",
    namaJob: "MOLDING / COR LOGAM (鋳造製造スタッフ)",
    lokasi: "Kurashiki City, Okayama (岡山県倉敷市)",
    gaji: "168.000円 ~ 230.000円/bulan",
    jumlahKandidat: "2",
    jenisKelamin: "Pria",
    syaratKhusus: "Status Tokutei Ginou Industri Manufaktur Logam (Casting/Cor Logam)",
    biayaJob: "Sewa Asrama & Tunjangan Lembur Ada",
    benefit: "Bonus 2x/tahun (Agustus & Desember) + Bonus Finansial Maret",
    keterangan: "Pengecoran logam, pemolesan, perakitan, dan inspeksi fisik cetakan",
    bidang: "Manufaktur / Mesin",
    perusahaan: "Okayama Casting Industry",
    kumiaiPartner: "Arakawa / TSK Partner",
    kategori: "SISWA NON IJEF : NEW COMER",
    klasifikasiSkema: "Standard",
    statusJob: "Open"
  },
  {
    id: "job_011",
    kodeJob: "TG-FOOD-011",
    namaJob: "PENGOLAHAN MAKANAN SIAP SAJI (食品製造)",
    lokasi: "Funabashi City, Chiba (千葉県船橋市)",
    gaji: "1.170円/jam (Gaji bulanan ~195.000円)",
    jumlahKandidat: "1",
    jenisKelamin: "Wanita",
    syaratKhusus: "Wanita, Ex-Magang Pengolahan Makanan / Lulusan Ujian SSW Food Mfg + JFT A2",
    biayaJob: "Tunjangan transport 6.000 yen/bulan",
    benefit: "Bus antar-jemput dari stasiun, fasilitas asrama",
    keterangan: "Operasi produksi makanan siap saji, penataan, pengepakan, dan penyegelan",
    bidang: "Pengolahan Makanan",
    perusahaan: "Funabashi Food Processing Co.",
    kumiaiPartner: "TSK Partner",
    kategori: "SISWA MATCHING JOB : EX-MAGANG",
    klasifikasiSkema: "Standard",
    statusJob: "Open"
  },
  {
    id: "job_012",
    kodeJob: "TG-POULTRY-012",
    namaJob: "PETERNAKAN AYAM / POULTRY (養鶏場)",
    lokasi: "Hiroshima Prefecture (広島県)",
    gaji: "8.000円 ~ 10.000円/hari (~126.000 - 170.000円 bersih)",
    jumlahKandidat: "4",
    jenisKelamin: "Pria",
    syaratKhusus: "Pria usia 20-40 thn, Memiliki SIM Indonesia (untuk konversi SIM Jepang), N3",
    biayaJob: "Potongan sewa asrama 50.000 yen (Asuransi & pajak)",
    benefit: "Tiket pesawat ditanggung perusahaan, Kenaikan gaji 1x/thn, Bonus 2x/thn",
    keterangan: "Pemeliharaan ayam, pemberian vaksin, pembersihan kandang, perawatan mesin",
    bidang: "Peternakan",
    perusahaan: "Hiroshima Poultry Farm",
    kumiaiPartner: "TSK Partner",
    kategori: "SISWA NON IJEF : NEW COMER",
    klasifikasiSkema: "Urgent",
    statusJob: "Open"
  },
  {
    id: "job_013",
    kodeJob: "TG-OYSTER-013",
    namaJob: "BUDIDAYA TIRAM (養殖業 - 牡蠣むき)",
    lokasi: "Prefektur Hiroshima / Fukuoka (広島・福岡)",
    gaji: "188.519円/bulan",
    jumlahKandidat: "2",
    jenisKelamin: "Pria",
    syaratKhusus: "Laki-laki usia 20-29 thn, Bisa berenang, JLPT N4/JFT A2 + SSW Perikanan Budidaya",
    biayaJob: "Sewa asrama murah + Pinjaman sepeda gratis",
    benefit: "Shift kerja 07:00-15:00, bonus dan tunjangan asrama",
    keterangan: "Pekerjaan budidaya tiram di laut, mengupas daging tiram (kaki-muki)",
    bidang: "Perikanan / Budidaya",
    perusahaan: "Hiroshima Oyster Culture Co.",
    kumiaiPartner: "TSK Partner",
    kategori: "SISWA NON IJEF : NEW COMER",
    klasifikasiSkema: "Standard",
    statusJob: "Open"
  },
  {
    id: "job_014",
    kodeJob: "TG-DRIVER-014",
    namaJob: "DRIVER TRUK 4T / 10T (自動車運送業)",
    lokasi: "Prefektur Yamaguchi & Kitakyushu (山口県・北九州)",
    gaji: "250.000円/bulan",
    jumlahKandidat: "3",
    jenisKelamin: "Pria",
    syaratKhusus: "Laki-laki usia 19-45 thn, Min. SMA/SMK, Kaiwa setara N3, SSW Driver + SIM 4T/10T",
    biayaJob: "Tersedia asrama dengan sewa terjangkau",
    benefit: "Ada bonus & kenaikan gaji harian/tahunan, tanpa bongkar muat manual",
    keterangan: "Pengiriman suku cadang sepeda Shimano & komponen dengan truk 4T/10T",
    bidang: "Pengemudi / Logistik",
    perusahaan: "Fukuoka & Yamaguchi Transport",
    kumiaiPartner: "TSK Partner",
    kategori: "SISWA MATCHING JOB : EX-MAGANG",
    klasifikasiSkema: "Urgent",
    statusJob: "Open"
  },
  {
    id: "job_015",
    kodeJob: "GIJIN-KITCHEN-015",
    namaJob: "MAINTENANCE PERALATAN DAPUR (厨房機器メンテナンス)",
    lokasi: "Tokyo / Kanagawa / Aichi / Osaka / Hokkaido",
    gaji: "246.200円/bulan (Gaji pokok 190.000 + Lembur 45.990 + Tunjangan 10.210)",
    jumlahKandidat: "24",
    jenisKelamin: "Pria & Wanita",
    syaratKhusus: "Bahasa Jepang Kaiwa N2+, Memiliki SIM A (AT OK), Lulusan Teknik/Pengalaman Teknik",
    biayaJob: "Sewa asrama 20.000 yen (bebas untuk usia di bawah 25 thn)",
    benefit: "Karyawan Tetap (Seishain), Bonus 2x/tahun (Juli & Des), Biaya visa ditanggung",
    keterangan: "Inspeksi, perbaikan, dan perawatan peralatan dapur komersial restoran",
    bidang: "Engineering / Gijinkoku",
    perusahaan: "Kitchen Equipment Service Japan",
    kumiaiPartner: "TSK Partner",
    kategori: "SISWA MATCHING JOB : ENGINEERING",
    klasifikasiSkema: "Urgent",
    statusJob: "Open"
  },
  {
    id: "job_016",
    kodeJob: "TG-SNACK-016",
    namaJob: "PENGOLAHAN PERMEN & KUE (菓子製造)",
    lokasi: "Kaga City, Ishikawa (石川県加賀市)",
    gaji: "190.000円/bulan",
    jumlahKandidat: "4",
    jenisKelamin: "Wanita",
    syaratKhusus: "Wanita usia 19-35 thn, JFT A2 / JLPT N4 + SSW Pengolahan Makanan, Kaiwa lancar",
    biayaJob: "Tempat tinggal asrama + Tunjangan transport",
    benefit: "Asuransi penuh, Jam kerja 08:00 - 17:00 (Istirahat 90 mnt), Bonus ada",
    keterangan: "Pembuatan kue/permen, pembersihan fasilitas produksi KitKat, Mentos, Pukupuku Tai",
    bidang: "Pengolahan Makanan",
    perusahaan: "Ishikawa Confectionery Mfg.",
    kumiaiPartner: "TSK Partner",
    kategori: "SISWA NON IJEF : NEW COMER",
    klasifikasiSkema: "Standard",
    statusJob: "Open"
  },
  {
    id: "job_017",
    kodeJob: "TG-STEEL-017",
    namaJob: "KONSTRUKSI FABRIKASI BAJA (建築鉄骨加工)",
    lokasi: "Prefektur Nara / Fukuoka (奈良県・福岡県)",
    gaji: "250.000円/bulan",
    jumlahKandidat: "1",
    jenisKelamin: "Pria",
    syaratKhusus: "Pria usia 27-37 thn, Sertifikat Tokutei Ginou Konstruksi / Pengelasan. SIM Biasa",
    biayaJob: "Sewa asrama 15.000 yen/bulan, Listrik/Gas/Air sesuai pemakaian",
    benefit: "Bonus 2x/thn (Juli & Des 100.000 yen), Kenaikan gaji 5.000 yen/tahun",
    keterangan: "Pemprosesan kerangka baja konstruksi bangunan dan pekerjaan pengelasan",
    bidang: "Konstruksi",
    perusahaan: "Tekkou Nara Construction",
    kumiaiPartner: "TSK Partner",
    kategori: "SISWA MATCHING JOB : EX-MAGANG",
    klasifikasiSkema: "Standard",
    statusJob: "Open"
  },
  {
    id: "job_018",
    kodeJob: "INTERN-GOLF-018",
    namaJob: "INTERNSHIP CADDY GOLF (山梨ゴルフ キャディ)",
    lokasi: "Yamanashi Prefecture (山梨県)",
    gaji: "176.000円/bulan (Jam kerja 176 jam/bulan)",
    jumlahKandidat: "20",
    jenisKelamin: "Pria & Wanita",
    syaratKhusus: "Mahasiswa S1/D3 Sastra/Bahasa Jepang (Semester 2-3), Usia 19-24 thn",
    biayaJob: "Akomodasi & Transportasi disediakan program ALS",
    benefit: "Program magang 10 bulan (Maret - Des 2027), sertifikat resmi magang Jepang",
    keterangan: "Caddy profesional di lapangan golf Yamanashi Golf Course",
    bidang: "Perhotelan / Jasa",
    perusahaan: "Yamanashi Golf Course / ALS Agent",
    kumiaiPartner: "ALS / Olive",
    kategori: "SISWA NON IJEF : NEW COMER",
    klasifikasiSkema: "Standard",
    statusJob: "Open"
  },
  {
    id: "job_019",
    kodeJob: "TG-FARM-019",
    namaJob: "PERTANIAN SAYURAN (特定技能 農業)",
    lokasi: "Joso City, Ibaraki (茨城県常総市)",
    gaji: "Gaji Tahunan 3.000.000円 ~ 3.500.000円 (~250.000円/bulan)",
    jumlahKandidat: "4",
    jenisKelamin: "Pria & Wanita",
    syaratKhusus: "Usia 25-35 thn, JLPT N4+, Memiliki pengalaman fisik pertanian sayuran",
    biayaJob: "Sewa rumah bersama 20.000 yen/bulan (Internet gratis)",
    benefit: "Boleh memanfaatkan lahan kebun sendiri untuk bercocok tanam",
    keterangan: "Budidaya, pengelolaan, pemanenan, dan pengepakan terong, jagung, kubis, selada",
    bidang: "Pertanian",
    perusahaan: "Ibaraki Agriculture Co., Ltd.",
    kumiaiPartner: "TSK Partner",
    kategori: "SISWA NON IJEF : NEW COMER",
    klasifikasiSkema: "Urgent",
    statusJob: "Open"
  },
  {
    id: "job_020",
    kodeJob: "TG-LENS-020",
    namaJob: "PERAKITAN LENSA KAMERA (カメラレンズの組立)",
    lokasi: "Miyagi / Tochigi / Utsunomiya (宮城県・栃木県)",
    gaji: "1.150円/jam (Estimasi bulanan 180.993円)",
    jumlahKandidat: "10",
    jenisKelamin: "Wanita",
    syaratKhusus: "Wanita (Indonesia / Vietnam), N4+, Ex-Magang Elektronik atau Lulus SSW Elektronik",
    biayaJob: "Sewa asrama 15.000 yen/bulan",
    benefit: "Tiket pesawat ditanggung perusahaan, Jam lembur ~40 jam/bulan",
    keterangan: "Pekerjaan perakitan dan inspeksi lensa kamera presisi di ruang bersih",
    bidang: "Manufaktur / Mesin",
    perusahaan: "Miyagi Precision Camera Lens",
    kumiaiPartner: "TSK Partner",
    kategori: "SISWA MATCHING JOB : EX-MAGANG",
    klasifikasiSkema: "Urgent",
    statusJob: "Open"
  },
  {
    id: "job_021",
    kodeJob: "TG-TEKKIN-021",
    namaJob: "KONSTRUKSI TEKKIN (鉄筋工事)",
    lokasi: "Koshigaya, Saitama (埼玉県越谷市)",
    gaji: "264.000円/bulan (264.000円/bln + Lembur 5 jam/bln)",
    jumlahKandidat: "2",
    jenisKelamin: "Pria",
    syaratKhusus: "Laki-laki, Ex-magang konstruksi tekkin, Komunikasi Bahasa Jepang lancar",
    biayaJob: "Apato kamar sendiri (Sewa + Utility 30.000 yen/bulan)",
    benefit: "Pekerjaan aman dengan ashiba lengkap, Jam kerja 08:00 - 17:00",
    keterangan: "Pembuatan dan perakitan tekkin pembesian untuk bangunan gedung besar",
    bidang: "Konstruksi",
    perusahaan: "Saitama Tekkin Construction Co.",
    kumiaiPartner: "TSK Partner",
    kategori: "SISWA MATCHING JOB : EX-MAGANG",
    klasifikasiSkema: "Standard",
    statusJob: "Open"
  },
  {
    id: "job_022",
    kodeJob: "TG-KAIGO-022",
    namaJob: "KAIGO CARE GIVER (介護ヘルパー)",
    lokasi: "Area Kanto (Tokyo, Chiba, Kanagawa, Saitama)",
    gaji: "196.100円 ~ 215.100円/bulan",
    jumlahKandidat: "15",
    jenisKelamin: "Pria & Wanita",
    syaratKhusus: "Usia 18-30 thn, JLPT N4 / JFT A2 + SSW Kaigo (Tanpa hijab saat bekerja)",
    biayaJob: "Asrama bersubsidi tersedia",
    benefit: "Bonus berkala & Kenaikan gaji tahunan, Tunjangan shift malam",
    keterangan: "Membantu kehidupan lansia, persiapan makan, rekreasi, dan pendampingan",
    bidang: "Kaigo (Perawat Lansia)",
    perusahaan: "Kanto Welfare Nursing Care Group",
    kumiaiPartner: "TSK Partner",
    kategori: "SISWA NON IJEF : NEW COMER",
    klasifikasiSkema: "Urgent",
    statusJob: "Open"
  },
  {
    id: "job_023",
    kodeJob: "TG-KAIGO-023",
    namaJob: "KAIGO STAFF NAGOYA (介護スタッフ)",
    lokasi: "Nagoya City, Aichi (愛知県名古屋市)",
    gaji: "195.000円 ~ 225.000円/bulan (+ Tunjangan Malam 8.000円/shift)",
    jumlahKandidat: "10",
    jenisKelamin: "Pria & Wanita",
    syaratKhusus: "Kemampuan komunikasi setara N3, Sertifikat Tokutei Ginou Kaigo",
    biayaJob: "Sewa asrama 20.000 yen/bulan, Biaya aplikasi visa ditanggung perusahaan",
    benefit: "Bantuan biaya makan 200 yen/porsi, pelatihan sertifikasi Kaigofukushishi",
    keterangan: "Pendampingan lansia di panti khusus lansia grup terbesar Nagoya",
    bidang: "Kaigo (Perawat Lansia)",
    perusahaan: "Nagoya Tokuyou Care Home Group",
    kumiaiPartner: "TSK Partner",
    kategori: "SISWA NON IJEF : NEW COMER",
    klasifikasiSkema: "Standard",
    statusJob: "Open"
  },
  {
    id: "job_024",
    kodeJob: "TG-MACHINING-024",
    namaJob: "OPERATOR MESIN NC (産業機械製造)",
    lokasi: "Niihama City, Ehime (愛媛県新居浜市)",
    gaji: "1.120円/jam (~195.000円/bulan, Lembur 20-40 jam/bln)",
    jumlahKandidat: "2",
    jenisKelamin: "Pria",
    syaratKhusus: "Pria max 40 thn, Bahasa Jepang N4+, Pengalaman Machining/NC Lathe",
    biayaJob: "Sewa rumah 16.000 yen, Wi-Fi gratis, Sepeda disediakan",
    benefit: "Bonus & Kenaikan gaji tahunan, Asuransi sosial lengkap",
    keterangan: "Pengolahan mesin, mesin Bubut CNC, Machining Center, dan pemograman NC",
    bidang: "Manufaktur / Mesin",
    perusahaan: "Ehime Industrial Machinery Ltd.",
    kumiaiPartner: "TSK Partner",
    kategori: "SISWA MATCHING JOB : EX-MAGANG",
    klasifikasiSkema: "Standard",
    statusJob: "Open"
  },
  {
    id: "job_025",
    kodeJob: "TG-PM-025",
    namaJob: "POTONG SAYUR & LOGISTIK SUPERMARKET (飲食料品製造)",
    lokasi: "Tokyo, Jepang (東京都)",
    gaji: "170.000円 ~ 250.000円/bulan (Belum termasuk lembur)",
    jumlahKandidat: "12",
    jenisKelamin: "Pria & Wanita",
    syaratKhusus: "Usia max 30 thn, Kuat fisik tahan dingin <10°C, SSW Pengolahan Makanan + N4",
    biayaJob: "Apato disediakan perusahaan (jarak 40 mnt jalan kaki / sepeda)",
    benefit: "Lembur 30-50 jam/bulan, Kesempatan menabung tinggi di Tokyo",
    keterangan: "Pemotongan sayuran, pengolahan bahan makanan, dan pemindahan barang",
    bidang: "Pengolahan Makanan",
    perusahaan: "Tokyo Fresh Produce Processing",
    kumiaiPartner: "TSK Partner",
    kategori: "SISWA NON IJEF : NEW COMER",
    klasifikasiSkema: "Urgent",
    statusJob: "Open"
  },
  {
    id: "job_026",
    kodeJob: "TG-DAIRY-026",
    namaJob: "PETERNAKAN SAPI PERAH (畜産業)",
    lokasi: "Shibetsu-Cho, Hokkaido (北海道標津町)",
    gaji: "200.000円/bulan (Bersih ~135.590円/bulan)",
    jumlahKandidat: "2",
    jenisKelamin: "Wanita",
    syaratKhusus: "Wanita 25-35 thn, Min. tinggi 155cm, Pengalaman kerja & N4 / SSW Peternakan",
    biayaJob: "Tempat tinggal, listrik, air, gas, pajak sudah terpotong otomatis",
    benefit: "Kenaikan gaji & bonus sesuai keuntungan perusahaan",
    keterangan: "Perawatan sapi perah, pemerahan susu, dan pembersihan area peternakan Shibetsu",
    bidang: "Peternakan",
    perusahaan: "Shibetsu Hokkaido Dairy Farm",
    kumiaiPartner: "TSK Partner",
    kategori: "SISWA NON IJEF : NEW COMER",
    klasifikasiSkema: "Standard",
    statusJob: "Open"
  },
  {
    id: "job_027",
    kodeJob: "TG-PM-027",
    namaJob: "PENGOLAHAN MAKANAN HOKKAIDO (飲食料品製造)",
    lokasi: "Hokkaido (北海道)",
    gaji: "Tedori bersih ~130.000 - 140.000円/bulan (Belum lembur)",
    jumlahKandidat: "20",
    jenisKelamin: "Pria",
    syaratKhusus: "Laki-laki usia 20-an, TB Min 160cm, SSW Pengolahan Makanan + Peternakan",
    biayaJob: "Asrama bersubsidi di Hokkaido",
    benefit: "Pra-seleksi & wawancara langsung, lembur tersedia",
    keterangan: "Pabrik pengolahan makanan siap saji dan produk olahan di Hokkaido",
    bidang: "Pengolahan Makanan",
    perusahaan: "Hokkaido Food Processing Industry",
    kumiaiPartner: "TSK Partner",
    kategori: "SISWA NON IJEF : NEW COMER",
    klasifikasiSkema: "Urgent",
    statusJob: "Open"
  }
];

export function getBackupJobs() {
  if (EXTRACTED_JOBS && EXTRACTED_JOBS.length > 0) return EXTRACTED_JOBS;
  if (!backupJson || !backupJson.jobs) return [];
  return backupJson.jobs.map((j) => ({
    id: j.id,
    ...parseFirestoreFields(j.fields),
  }));
}
