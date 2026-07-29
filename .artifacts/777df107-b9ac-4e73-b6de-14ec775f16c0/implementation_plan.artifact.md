# Pelaksanaan Update Data Firestore dari Backup

Tujuan tugas ini adalah untuk mengunggah atau memperbarui data di Firestore menggunakan file `firestore_backup.json` yang tersedia.

## Analisis
- File backup: `firestore_backup.json` di root project.
- Script pemulihan: `scripts/restore-data.js` sudah tersedia.
- Project ID: `test-kesehatan-ijef-corp-7c278` (diambil dari `src/lib/firebase.js`).

## Rencana Perubahan

### Script Pemulihan
- Script `scripts/restore-data.js` saat ini menggunakan REST API Firestore dengan metode `PATCH`.
- **Masalah Potensial**: REST API Firestore memerlukan autentikasi jika aturan keamanan (security rules) tidak mengizinkan akses publik. Jika script dijalankan tanpa token akses, kemungkinan besar akan gagal kecuali jika Firestore diatur dalam mode publik (sangat tidak disarankan tetapi mungkin untuk testing).
- **Rencana**: Mencoba menjalankan script dan melihat hasilnya. Jika gagal karena masalah autentikasi, saya akan menyarankan penggunaan Firebase Admin SDK jika memungkinkan, atau meminta akses yang diperlukan.

## Langkah Eksekusi
1. Ganti ekstensi `scripts/restore-data.js` menjadi `scripts/restore-data.mjs` agar mendukung sintaks `import` di Node.js.
2. Jalankan `node scripts/restore-data.mjs` untuk memulai proses pembaruan data.
3. Pantau output log untuk memastikan data `candidates` dan `users` berhasil diunggah.
4. Laporkan hasil (jumlah data yang berhasil dan gagal).

## Verifikasi Plan
- Memeriksa log output dari script `restore-data.js`.
- Jika berhasil, data di Firebase harusnya sudah sesuai dengan isi `firestore_backup.json`.
