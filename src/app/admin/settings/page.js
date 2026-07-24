"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import Navbar from "@/components/Navbar";

const ROLES = [
  { value: "admin", label: "Admin", color: "bg-red-100 text-red-700" },
  { value: "viewer", label: "Viewer", color: "bg-blue-100 text-blue-700" },
  { value: "approval", label: "Approval", color: "bg-yellow-100 text-yellow-700" },
  { value: "candidate", label: "Candidate", color: "bg-green-100 text-green-700" },
];

export default function SettingsPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("users");

  // New user form
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ fullName: "", email: "", password: "", role: "viewer" });
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");

  // Edit user
  const [editingAccount, setEditingAccount] = useState(null);
  const [editAccountData, setEditAccountData] = useState({ fullName: "", email: "" });

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

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        newUser.email,
        newUser.password
      );
      await setDoc(doc(db, "users", userCredential.user.uid), {
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role,
        createdAt: new Date().toISOString(),
        createdBy: user.uid,
      });

      setMessage(`Akun "${newUser.fullName}" berhasil dibuat dengan role ${newUser.role}`);
      setNewUser({ fullName: "", email: "", password: "", role: "viewer" });
      setShowAddUser(false);
      loadUsers();
    } catch (err) {
      setMessage(
        err.code === "auth/email-already-in-use"
          ? "Email sudah terdaftar"
          : `Error: ${err.message}`
      );
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
                <input type="password" className="input-field" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required minLength={6} />
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
                  className="input-field"
                  value={editAccountData.email}
                  onChange={(e) => setEditAccountData({ ...editAccountData, email: e.target.value })}
                  required
                />
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
            <h3 className="text-lg font-bold text-red-600 mb-2">Hapus Akun</h3>
            <p className="text-sm text-gray-600 mb-4">
              Anda yakin ingin menghapus akun <strong>{deleteTarget.fullName}</strong> ({deleteTarget.email})?
            </p>
            <p className="text-sm text-gray-500 mb-3">Ketik <strong className="text-red-600">HAPUS</strong> untuk konfirmasi:</p>
            <input className="input-field mb-4" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="Ketik HAPUS" />
            <div className="flex space-x-3 justify-end">
              <button onClick={() => { setDeleteTarget(null); setDeleteConfirm(""); }} className="btn-secondary">Batal</button>
              <button onClick={handleDeleteUser} disabled={deleteConfirm !== "HAPUS"} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
