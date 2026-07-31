# Walkthrough - Advanced Interactive Admin Dashboard

Dashboard admin telah dirombak total menjadi pusat kendali data kandidat yang interaktif, lengkap dengan visualisasi pipeline dan integrasi daftar data.

## Fitur Baru & Perubahan Utama

### 1. Visualisasi Pipeline Progres
- **Pipeline Bar**: Bar horizontal multi-warna yang menunjukkan distribusi persentase kandidat di setiap tahapan secara visual.
- **Legend Dinamis**: Rincian jumlah orang dan persentase untuk 9 status progres (termasuk "Belum Ada Status").
- **Interaktivitas**: Mengklik legenda pipeline akan menyaring daftar kandidat di bawah secara instan.

### 2. Filter Berantai (Cumulative Filtering)
- Admin sekarang bisa menyaring data secara **kombinasi**.
- *Contoh*: Anda bisa mengklik bidang **"KAIGO"** lalu mengklik status **"On Proses"**. Tabel di bawah akan otomatis menampilkan hanya kandidat KAIGO yang sedang On Proses.
- **Tombol Reset**: Tersedia tombol "Lihat Detail Semua Kandidat" dan "Hapus Semua Filter" untuk mengembalikan tampilan ke data awal.

### 3. Tabel Kandidat Terintegrasi
- Daftar kandidat sekarang muncul langsung di bagian bawah Dashboard.
- **Pencarian Cepat**: Field pencarian yang bisa mencari berdasarkan Nama, TSK, Perusahaan, atau bahkan isi **Keterangan Progres**.
- **Action Buttons**: Tombol "Edit Progres" dan "Lihat CV" tersedia langsung di baris tabel untuk akses cepat.

### 4. Status "Belum Ada Status"
- Menambahkan deteksi otomatis untuk kandidat baru yang belum memiliki status progres, sehingga tidak ada data yang terlewat (menghindari "Lainnya/NaN").

## Cara Menggunakan
1. **Analisis**: Lihat bar pipeline untuk memantau bottleneck (tahapan mana yang paling banyak kandidatnya).
2. **Filter**: Klik pada kartu status di atas atau item bidang/kategori untuk mempersempit pencarian.
3. **Edit**: Jika ingin memperbarui progres kandidat hasil filter, cukup klik tombol **"Edit Progres"** pada baris kandidat tersebut.

## Verifikasi Teknis
- State management menggunakan `useMemo` untuk efisiensi kalkulasi statistik saat filter berubah.
- Layout responsif yang menyesuaikan grid kartu dari 2 kolom (mobile) hingga 5 kolom (desktop).
- Perubahan telah di-commit dan di-push ke repository GitHub di branch `master`.
