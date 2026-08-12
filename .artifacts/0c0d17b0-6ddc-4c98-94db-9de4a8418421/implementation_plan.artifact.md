# Tambah Kolom Sertifikat SSW 2 dan Validasi Riwayat Pendidikan

Rencana ini akan menambahkan kolom upload opsional untuk "Sertifikat SSW 2" dan "Video SSW 2", serta mewajibkan pengisian bagian "Riwayat Pendidikan" pada form kandidat.

## Proposed Changes

### [Form Kandidat]

#### [MODIFY] [page.js](file:///C:/Users/Lenovo/StudioProjects/cv-portal/src/app/candidate/form/page.js)
- Menambahkan `sertifikatSSW2` dan `videoSSW2` ke dalam state `formData`.
- Menambahkan field upload untuk "Sertifikat SSW 2" dan "Video SSW 2" di bagian "Upload Dokumen".
- Menambahkan atribut `required` pada field Nama Sekolah, Tahun Masuk, dan Tahun Lulus untuk tingkat SD, SMP, dan SMA/K di bagian "Riwayat Pendidikan".

### [Admin Edit]

#### [MODIFY] [page.js](file:///C:/Users/Lenovo/StudioProjects/cv-portal/src/app/admin/edit/%5Bid%5D/page.js)
- Menambahkan field input untuk "Sertifikat SSW 2 (URL)" dan "Video SSW 2 (URL)" pada bagian "Link Dokumen" agar admin dapat melihat dan mengedit link tersebut.

## Verification Plan

### Manual Verification
- Buka form kandidat, pastikan terdapat kolom upload baru untuk SSW 2.
- Coba submit form tanpa mengisi riwayat pendidikan (SD/SMP/SMA), pastikan browser memunculkan peringatan wajib isi dan tidak bisa submit.
- Buka halaman edit admin untuk salah satu kandidat, pastikan kolom SSW 2 muncul di bagian Link Dokumen.
