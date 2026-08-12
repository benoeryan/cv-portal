"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { db, auth, firebaseConfig } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
} from "firebase/firestore";
import { createUserWithEmailAndPassword, getAuth, signOut, setPersistence, inMemoryPersistence } from "firebase/auth";
import { initializeApp, deleteApp } from "firebase/app";
import Navbar from "@/components/Navbar";

const ROLES = [
  { value: "admin", label: "Admin", color: "bg-red-100 text-red-700" },
  { value: "partner", label: "Partner/Mitra", color: "bg-purple-100 text-purple-700" },
  { value: "viewer", label: "Viewer", color: "bg-blue-100 text-blue-700" },
  { value: "approval", label: "Approval", color: "bg-yellow-100 text-yellow-700" },
  { value: "candidate", label: "Candidate", color: "bg-green-100 text-green-700" },
];

export default function SettingsPage() {
  const { user, userData, loading: authLoading, resetPassword } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("users");

  // New user form
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ fullName: "", email: "", password: "", role: "viewer" });
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");

  // Edit user
  const [editingAccount, setEditingAccount] = useState(null);
  const [editAccountData, setEditAccountData] = useState({ fullName: "", email: "" });
  const [resetingPassword, setResetingPassword] = useState(false);

  // Edit role
  const [editingUser, setEditingUser] = useState(null);
  const [editRole, setEditRole] = useState("");

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  useEffect(() => {
    if (!authLoading && (!user || userData?.role !== "admin")) {
      router.push("/");
      return;
    }
    if (user && userData?.role === "admin") {
      loadUsers();
    }
  }, [user, userData, authLoading]);

  const loadUsers = async () => {
    try {
      const snapshot = await getDocs(collection(db, "users"));
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""));
      setUsers(data);
    } catch (err) {
      console.error("Error loading users:", err);
    }
    setLoading(false);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreating(true);
    setMessage("");
    console.log("Starting user creation process...");

    let tempApp;
    try {
      // 1. Create a secondary Firebase instance with NO persistence
      // This is crucial to prevent the browser from signing out the current admin
      const tempAppName = `temp-app-${Date.now()}`;
      tempApp = initializeApp(firebaseConfig, tempAppName);
      const tempAuth = getAuth(tempApp);

      // Force in-memory persistence for the temporary instance
      await setPersistence(tempAuth, inMemoryPersistence);
      console.log("Temporary Firebase instance initialized with in-memory persistence.");

      // 2. Create the user using the temporary auth instance
      const userCredential = await createUserWithEmailAndPassword(
        tempAuth,
        newUser.email,
        newUser.password
      );
      console.log("User created in Firebase Auth:", userCredential.user.uid);

      // 3. Create the Firestore profile using the primary DB instance
      // Note: We use the primary 'db' because 'tempApp' doesn't have Firestore initialized
      await setDoc(doc(db, "users", userCredential.user.uid), {
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role,
        createdAt: new Date().toISOString(),
        createdBy: user.uid,
      });
      console.log("User profile created in Firestore.");

      // 4. Sign out from the temporary session and clean up
      await signOut(tempAuth);
      await deleteApp(tempApp);
      console.log("Temporary session cleaned up.");

      setMessage(`Akun "${newUser.fullName}" berhasil dibuat dengan role ${newUser.role}`);
      setNewUser({ fullName: "", email: "", password: "", role: "viewer" });
      setShowAddUser(false);
      loadUsers();
    } catch (err) {
      console.error("User creation failed:", err);
      // Cleanup on error
      if (tempApp) {
        try { await deleteApp(tempApp); } catch (e) { console.error("Cleanup failed:", e); }
      }

      let errorMsg = err.message;
      if (err.code === "auth/email-already-in-use") {
        errorMsg = "Email ini sudah terdaftar di sistem keamanan (Auth), namun profil databasenya mungkin belum ada. Mintalah pengguna tersebut untuk Login langsung agar sistem melakukan perbaikan otomatis.";
      } else if (err.code === "auth/weak-password") {
        errorMsg = "Password minimal 6 karakter";
      }

      setMessage(`Error: ${errorMsg}`);
      alert(errorMsg);
    }
    setCreating(false);
  };

  const handleUpdateAccount = async (e) => {
    e.preventDefault();
    if (!editingAccount) return;
    try {
      await updateDoc(doc(db, "users", editingAccount.id), {
        fullName: editAccountData.fullName,
        email: editAccountData.email,
      });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingAccount.id
            ? { ...u, fullName: editAccountData.fullName, email: editAccountData.email }
            : u
        )
      );
      setEditingAccount(null);
      setMessage(`Profil ${editAccountData.fullName} berhasil diperbarui`);
    } catch (err) {
      setMessage("Error: " + err.message);
    }
  };

  const handleUpdateRole = async () => {
    if (!editingUser || !editRole) return;
    try {
      await updateDoc(doc(db, "users", editingUser.id), { role: editRole });
      setUsers((prev) =>
        prev.map((u) => (u.id === editingUser.id ? { ...u, role: editRole } : u))
      );
      setEditingUser(null);
      setEditRole("");
      setMessage(`Role ${editingUser.fullName} berhasil diubah ke ${editRole}`);
    } catch (err) {
      setMessage("Error: " + err.message);
    }
  };

  const handleDeleteUser = async () => {
    if (deleteConfirm !== "HAPUS" || !deleteTarget) return;
    try {
      await deleteDoc(doc(db, "users", deleteTarget.id));
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setDeleteTarget(null);
      setDeleteConfirm("");
      setMessage(`Akun "${deleteTarget.fullName}" berhasil dihapus dari database`);
    } catch (err) {
      setMessage("Error: " + err.message);
    }
  };

  const handleSendResetEmail = async (email) => {
    if (!window.confirm(`Kirim email reset password ke ${email}?`)) return;
    setResetingPassword(true);
    try {
      await resetPassword(email);
      setMessage(`Email pemulihan password telah dikirim ke ${email}`);
    } catch (err) {
      setMessage("Error: " + err.message);
    }
    setResetingPassword(false);
  };

  const getRoleInfo = (role) => ROLES.find((r) => r.value === role) || ROLES[3];

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
            <p className="text-gray-500 text-sm">Kelola akun pengguna dan pengaturan sistem</p>
          </div>
        </div>

        {message && (
          <div className={`border px-4 py-3 rounded-lg mb-4 text-sm ${message.includes("Error") ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"}`}>
            {message}
            <button onClick={() => setMessage("")} className="float-right text-gray-400 hover:text-gray-600">x</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex space-x-1 mb-6 border-b border-gray-200">
          <button onClick={() => setActiveTab("users")} className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === "users" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"}`}>
            Manajemen Akun
          </button>
          <button onClick={() => setActiveTab("roles")} className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === "roles" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"}`}>
            Info Role
          </button>
          <button onClick={() => setActiveTab("system")} className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === "system" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"}`}>
            Sistem
          </button>
        </div>

        {/* TAB: User Management */}
        {activeTab === "users" && (
          <>
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-gray-500">{users.length} akun terdaftar</span>
              <button onClick={() => setShowAddUser(true)} className="btn-primary">
                + Tambah Akun Baru
              </button>
            </div>

            {/* User List */}
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-3 font-medium text-gray-600">Nama</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-600">Email</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-600">Role</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-600">Dibuat</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-600">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const roleInfo = getRoleInfo(u.role);
                    return (
                      <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-3 font-medium text-gray-800">{u.fullName || "-"}</td>
                        <td className="py-3 px-3 text-gray-600 text-xs">{u.email}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${roleInfo.color}`}>
                            {roleInfo.label}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-gray-400 text-xs">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString("id") : "-"}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setEditingAccount(u);
                                setEditAccountData({ fullName: u.fullName || "", email: u.email || "" });
                              }}
                              className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                            >
                              Edit Akun
                            </button>
                            <button
                              onClick={() => { setEditingUser(u); setEditRole(u.role); }}
                              className="text-amber-600 hover:text-amber-800 text-xs font-medium"
                            >
                              Ubah Role
                            </button>
                            {u.id !== user.uid && (
                              <button
                                onClick={() => setDeleteTarget(u)}
                                className="text-red-500 hover:text-red-700 text-xs font-medium"
                              >
                                Hapus
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* TAB: Role Info */}
        {activeTab === "roles" && (
          <div className="card">
            <h3 className="font-semibold text-gray-700 mb-4">Deskripsi Role</h3>
            <div className="space-y-4">
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <h4 className="font-medium text-red-700 mb-1">Admin</h4>
                <p className="text-sm text-red-600">Akses penuh: kelola kandidat, import data, edit/hapus data, kelola akun, generate CV, approve kandidat.</p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <h4 className="font-medium text-yellow-700 mb-1">Approval</h4>
                <p className="text-sm text-yellow-600">Bisa melihat data kandidat, menyetujui/menolak kandidat untuk matching job, generate CV. Tidak bisa menghapus atau import data.</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-700 mb-1">Viewer</h4>
                <p className="text-sm text-blue-600">Hanya bisa melihat data kandidat dan CV. Tidak bisa edit, hapus, atau approve.</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h4 className="font-medium text-purple-700 mb-1">Partner/Mitra</h4>
                <p className="text-sm text-purple-600">Akses khusus untuk mitra perusahaan. Bisa melihat daftar lowongan (Job) dan mencari siswa yang tersedia untuk disalurkan.</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-700 mb-1">Candidate</h4>
                <p className="text-sm text-green-600">Akun untuk kandidat/casis yang mengisi form data. Hanya bisa akses form sendiri dan lihat CV sendiri.</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB: System */}
        {activeTab === "system" && (
          <div className="space-y-4">
            <div className="card">
              <h3 className="font-semibold text-gray-700 mb-3">Informasi Sistem</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">Firebase Project:</span></div>
                <div className="font-medium">test-kesehatan-ijef-corp-7c278</div>
                <div><span className="text-gray-500">Total Kandidat:</span></div>
                <div className="font-medium">{users.filter((u) => u.role === "candidate").length}</div>
                <div><span className="text-gray-500">Total Admin:</span></div>
                <div className="font-medium">{users.filter((u) => u.role === "admin").length}</div>
                <div><span className="text-gray-500">Spreadsheet ID:</span></div>
                <div className="font-medium text-xs break-all">1ZBpJyZasfXfWGZY1F88wddtIEQpzCkF1tRbDJoappqY</div>
              </div>
            </div>
            <div className="card">
              <h3 className="font-semibold text-gray-700 mb-3">API Status</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Google Sheets API</span><span className="text-green-600">Enabled</span></div>
                <div className="flex justify-between"><span>Cloud Translation API</span><span className="text-yellow-600">Check GCP</span></div>
                <div className="flex justify-between"><span>Firebase Auth</span><span className="text-green-600">Enabled</span></div>
                <div className="flex justify-between"><span>Firestore</span><span className="text-green-600">Active</span></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Add New User */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Tambah Akun Baru</h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="form-label">Nama Lengkap</label>
                <input className="input-field" value={newUser.fullName} onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })} required />
              </div>
              <div>
                <label className="form-label">Email</label>
                <input type="email" className="input-field" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} required />
              </div>
              <div>
                <label className="form-label">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="input-field pr-10"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="form-label">Role</label>
                <select className="input-field" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                  <option value="admin">Admin</option>
                  <option value="approval">Approval</option>
                  <option value="viewer">Viewer</option>
                  <option value="candidate">Candidate</option>
                </select>
              </div>
              <div className="flex space-x-3 justify-end pt-2">
                <button type="button" onClick={() => setShowAddUser(false)} className="btn-secondary">Batal</button>
                <button type="submit" className="btn-primary" disabled={creating}>
                  {creating ? "Membuat..." : "Buat Akun"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Account */}
      {editingAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Edit Profil Pengguna</h3>
            <form onSubmit={handleUpdateAccount} className="space-y-4">
              <div>
                <label className="form-label">Nama Lengkap</label>
                <input
                  className="input-field"
                  value={editAccountData.fullName}
                  onChange={(e) => setEditAccountData({ ...editAccountData, fullName: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="input-field bg-gray-50"
                  value={editAccountData.email}
                  onChange={(e) => setEditAccountData({ ...editAccountData, email: e.target.value })}
                  required
                />
              </div>
              <div className="pt-2">
                <label className="form-label">Keamanan</label>
                <button
                  type="button"
                  onClick={() => handleSendResetEmail(editingAccount.email)}
                  className="w-full bg-amber-50 text-amber-700 py-2 rounded-lg border border-amber-200 text-sm font-medium hover:bg-amber-100 transition-colors flex items-center justify-center gap-2"
                  disabled={resetingPassword}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {resetingPassword ? "Mengirim..." : "Kirim Email Reset Password"}
                </button>
                <p className="text-[10px] text-gray-400 mt-1 italic text-center">
                  Link untuk membuat password baru akan dikirim langsung ke email pengguna.
                </p>
              </div>
              <div className="flex space-x-3 justify-end pt-2">
                <button type="button" onClick={() => setEditingAccount(null)} className="btn-secondary">Batal</button>
                <button type="submit" className="btn-primary">Simpan Perubahan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Role */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Ubah Role</h3>
            <p className="text-sm text-gray-500 mb-4">Akun: {editingUser.fullName} ({editingUser.email})</p>
            <div className="mb-4">
              <label className="form-label">Role Baru</label>
              <select className="input-field" value={editRole} onChange={(e) => setEditRole(e.target.value)}>
                <option value="admin">Admin</option>
                <option value="approval">Approval</option>
                <option value="viewer">Viewer</option>
                <option value="candidate">Candidate</option>
              </select>
            </div>
            <div className="flex space-x-3 justify-end">
              <button onClick={() => setEditingUser(null)} className="btn-secondary">Batal</button>
              <button onClick={handleUpdateRole} className="btn-primary">Simpan</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Delete User Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-red-600 mb-2">Hapus Profil Akun</h3>
            <p className="text-sm text-gray-600 mb-2">
              Anda akan menghapus data profil <strong>{deleteTarget.fullName}</strong> ({deleteTarget.email}) dari database.
            </p>
            <div className="bg-red-50 p-3 rounded-lg border border-red-100 mb-4">
              <p className="text-[10px] text-red-700 leading-relaxed font-medium">
                <strong>PENTING:</strong> Sistem ini hanya menghapus data profil (Firestore). Username & Password tetap tersimpan di sistem keamanan (Auth). Jika Anda ingin mendaftarkan ulang email ini sebagai "Akun Baru", Anda harus menghapusnya secara permanen terlebih dahulu melalui panel <strong>Firebase Console &gt; Authentication</strong>.
              </p>
            </div>
            <p className="text-sm text-gray-500 mb-3">Ketik <strong className="text-red-600">HAPUS</strong> untuk konfirmasi:</p>
            <input className="input-field mb-4" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="Ketik HAPUS" />
            <div className="flex space-x-3 justify-end">
              <button onClick={() => { setDeleteTarget(null); setDeleteConfirm(""); }} className="btn-secondary text-sm">Batal</button>
              <button onClick={handleDeleteUser} disabled={deleteConfirm !== "HAPUS"} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm">
                Hapus Profil
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
