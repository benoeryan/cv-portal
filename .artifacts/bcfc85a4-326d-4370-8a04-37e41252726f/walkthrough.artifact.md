# Walkthrough - Interactive Admin Dashboard

Dashboard admin sekarang sepenuhnya interaktif. Setiap elemen statistik dapat diklik untuk melihat detail kandidat yang sesuai.

## Perubahan Utama

### 1. Dashboard Interaktif
- **Kartu Total & Status**: Setiap kartu status (On Proses, Pending, dll) sekarang bisa diklik.
- **Daftar Bidang & Kategori**: Setiap baris pada tabel bidang kerja dan kategori kandidat sekarang menjadi link aktif.
- **Efek Visual**: Menambahkan efek hover (bayangan dan perubahan warna) untuk memberi petunjuk bahwa elemen tersebut bisa diklik.

### 2. Otomatisasi Filter pada Halaman Kandidat
- **Query Param Handling**: Halaman "Data Kandidat" sekarang dapat membaca parameter dari URL (misal: `?status=Cancel`).
- **Auto-Filter**: Saat admin mengklik dari dashboard, halaman daftar kandidat akan otomatis memfilter data berdasarkan kategori, bidang, atau status yang dipilih.
- **Suspense Implementation**: Menambahkan `Suspense` wrapper untuk menangani pembacaan parameter URL secara aman di Next.js.

## Cara Menggunakan
1. Buka **Dashboard**.
2. Klik pada angka atau kartu status (misal: klik angka di bawah "On Proses").
3. Anda akan diarahkan ke halaman **Data Kandidat** dengan filter "On Proses" sudah aktif secara otomatis.

## Verifikasi
- Perubahan sudah di-commit dan di-push ke branch `master`.
- Menangani encoding URL (spasi dan karakter khusus) untuk parameter filter.
