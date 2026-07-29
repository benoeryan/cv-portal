# Walkthrough - Updated Status Progress Flow & Dashboard

Sistem manajemen status kandidat telah diperbarui dengan alur kerja yang lebih detail, penambahan kolom keterangan, serta pembaruan visual pada dashboard.

## Perubahan Utama

### 1. Alur Status Baru
Status progres kandidat kini mengikuti alur yang lebih spesifik:
- `Nihongo check`
- `Belum Lolos Nihongo check`
- `Pending Nunggu Job`
- `Penjadwalan Interview`
- `On Proses`
- `Tidak Lolos Interview`
- `Status On Job (Selesai)`
- `Cancel`

### 2. Kolom Keterangan Progres
- Menambahkan field **"Keterangan Progres"** pada halaman Edit Kandidat (Tab Status Progres).
- Field ini memungkinkan admin menulis catatan detail mengenai setiap tahapan yang sedang dijalani kandidat.

### 3. Dashboard Statistik Terintegrasi
- Dashboard telah diperbarui untuk menampilkan **8 status baru** secara lengkap.
- Grid kartu statistik disesuaikan agar tetap terlihat rapi pada layar desktop maupun mobile.
- Memberikan skema warna unik untuk setiap status agar mudah dibedakan secara visual.

## Cara Menggunakan
1. Buka halaman **Dashboard** untuk melihat sebaran kandidat berdasarkan status baru.
2. Klik pada salah satu kartu status untuk melihat daftar kandidat terkait.
3. Untuk memperbarui status, buka halaman **Edit Kandidat** > klik tab **Status Progres**.
4. Pilih status baru dan isi kolom **Keterangan Progres** di bagian bawah, lalu klik **Simpan**.

## Verifikasi
- Status baru telah ditambahkan ke dropdown filter dan form edit.
- Dashboard menghitung data secara akurat dari Firestore.
- Perubahan telah di-push ke branch `master`.
