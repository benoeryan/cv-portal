# Perbaikan Tombol Refresh Data di Dashboard

Pengguna melaporkan bahwa tombol "Refresh Data" pada dashboard tidak berjalan (tidak memberikan respon atau tidak memperbarui data secara terlihat).

## Proposed Changes

### [MODIFY] [page.js](file:///C:/Users/Lenovo/StudioProjects/cv-portal/src/app/admin/page.js)

1. Menambahkan state `refreshing` untuk melacak status pembaruan data.
2. Memperbarui fungsi `loadCandidates` agar mengatur state `refreshing` menjadi true di awal dan false setelah selesai (menggunakan `finally`).
3. Memperbarui UI tombol "Refresh Data" untuk menampilkan indikator loading saat proses refresh sedang berlangsung.
4. Menambahkan pesan feedback singkat saat refresh berhasil.

## Verification Plan

### Manual Verification
1. Buka halaman Admin Dashboard.
2. Klik tombol "Refresh Data".
3. Pastikan tombol berubah menjadi "Memperbarui..." atau menampilkan ikon loading.
4. Pastikan data statistik diperbarui jika ada perubahan di Firestore.
5. Pastikan muncul indikasi visual bahwa refresh telah selesai.
