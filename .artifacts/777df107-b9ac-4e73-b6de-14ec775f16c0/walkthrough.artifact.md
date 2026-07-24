# Walkthrough - Perubahan Manajemen Akun dan Portal Login

Saya telah menyelesaikan implementasi untuk fitur manajemen akun dan portal login. Berikut adalah ringkasan perubahannya:

## Perubahan yang Dilakukan

### 1. Portal Login
- **Tampilkan/Sembunyikan Password**: Menambahkan ikon mata di field password yang memungkinkan pengguna melihat password yang sedang diketik.
- **Login dengan Google**: Menambahkan tombol "Masuk dengan Google" yang terintegrasi dengan Firebase Authentication. Pengguna baru yang login dengan Google akan otomatis terdaftar dengan role default `candidate`.

### 2. Manajemen Akun (Settings)
- **Tombol Edit Akun**: Menambahkan opsi "Edit Akun" di tabel manajemen akun untuk mengubah Nama Lengkap dan Email.
- **Modal Edit Profil**: Membuat antarmuka modal baru untuk melakukan pembaruan profil pengguna di Firestore secara langsung.
- **Ubah Role**: Memindahkan tombol "Ubah Role" agar tetap tersedia bersama tombol "Edit Akun".

## File yang Dimodifikasi
- [firebase.js](file:///C:/Users/Lenovo/StudioProjects/cv-portal/src/lib/firebase.js): Menambahkan export `googleProvider`.
- [AuthContext.js](file:///C:/Users/Lenovo/StudioProjects/cv-portal/src/context/AuthContext.js): Menambahkan fungsi `loginWithGoogle`.
- [login/page.js](file:///C:/Users/Lenovo/StudioProjects/cv-portal/src/app/auth/login/page.js): Menambahkan UI toggle password dan tombol Google.
- [settings/page.js](file:///C:/Users/Lenovo/StudioProjects/cv-portal/src/app/admin/settings/page.js): Menambahkan logika dan UI untuk edit profil akun.

## Verifikasi
- Struktur kode telah diperbarui sesuai dengan pola yang ada di proyek.
- Komponen UI menggunakan Tailwind CSS untuk konsistensi desain dengan halaman lainnya.

> [!TIP]
> Jangan lupa untuk memastikan **Google Sign-in** sudah diaktifkan di Firebase Console proyek Anda agar fitur login Google dapat berfungsi sepenuhnya di lingkungan produksi.
