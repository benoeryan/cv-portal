# Perubahan Manajemen Akun dan Portal Login

Tujuannya adalah untuk meningkatkan fitur manajemen akun di halaman pengaturan dan memperkaya opsi login bagi pengguna.

## User Review Required

> [!IMPORTANT]
> - Perubahan pada `src/lib/firebase.js` dan `src/context/AuthContext.js` akan mempengaruhi seluruh sistem autentikasi.
> - Penambahan "Login dengan Google" memerlukan konfigurasi di Firebase Console (mengaktifkan Google Provider). Pastikan domain aplikasi sudah terdaftar di Authorized Domains di Firebase.

## Proposed Changes

### [Authentication & Firebase]

#### [MODIFY] [firebase.js](file:///C:/Users/Lenovo/StudioProjects/cv-portal/src/lib/firebase.js)
- Import and export `GoogleAuthProvider` from `firebase/auth`.

#### [MODIFY] [AuthContext.js](file:///C:/Users/Lenovo/StudioProjects/cv-portal/src/context/AuthContext.js)
- Import `GoogleAuthProvider` and `signInWithPopup`.
- Implement `loginWithGoogle` function.
- In `loginWithGoogle`, if it's a new user, create a Firestore document in the `users` collection with a default role (e.g., `candidate`).

### [Login Page]

#### [MODIFY] [page.js (Login)](file:///C:/Users/Lenovo/StudioProjects/cv-portal/src/app/auth/login/page.js)
- Add `showPassword` state.
- Update the password input field to toggle between `type="password"` and `type="text"`.
- Add a toggle button (icon) inside or next to the password field.
- Add a "Login with Google" button with appropriate styling.

### [Settings & Account Management]

#### [MODIFY] [page.js (Settings)](file:///C:/Users/Lenovo/StudioProjects/cv-portal/src/app/admin/settings/page.js)
- Add state for editing account (`editingAccount`, `editAccountData`).
- Add "Edit Akun" button in the Action column of the user table.
- Create a modal for editing Name and Email.
- Implement `handleUpdateAccount` to update Firestore data.
- Note: Changing email in Firestore won't change it in Firebase Auth automatically without re-authentication and specific Auth API calls, but for now, we will focus on the Firestore profile.

## Verification Plan

### Automated Tests
- Not applicable (no existing test suite found).

### Manual Verification
1. **Login Page:**
   - Verify the password toggle button works.
   - Verify "Login with Google" triggers the popup and successfully logs in (assuming configured in Firebase).
2. **Settings Page:**
   - Click "Edit Akun" for a user.
   - Change Name/Email and save.
   - Verify the changes are reflected in the table and Firestore.
   - Verify changing roles still works.
