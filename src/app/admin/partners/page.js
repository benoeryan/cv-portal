"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import Navbar from "@/components/Navbar";

export default function AdminPartnersPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || userData?.role !== "admin")) {
      router.push("/");
      return;
    }
    if (user && userData?.role === "admin") {
      loadPartners();
    }
  }, [user, userData, authLoading]);

  const loadPartners = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "partners"), orderBy("name", "asc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setPartners(data);
    } catch (err) {
      console.error("Error loading partners:", err);
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingPartner) {
        await updateDoc(doc(db, "partners", editingPartner.id), {
          ...formData,
          updatedAt: new Date().toISOString(),
        });
      } else {
        await addDoc(collection(db, "partners"), {
          ...formData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      setShowModal(false);
      loadPartners();
    } catch (err) {
      alert("Error: " + err.message);
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Hapus mitra ini?")) return;
    try {
      await deleteDoc(doc(db, "partners", id));
      loadPartners();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Daftar Mitra Terdaftar</h1>
            <p className="text-gray-500 text-sm">Kelola daftar nama mitra untuk pilihan di form kandidat</p>
          </div>
          <button onClick={() => { setEditingPartner(null); setFormData({ name: "", description: "" }); setShowModal(true); }} className="btn-primary">
            + Tambah Mitra
          </button>
        </div>

        <div className="card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-3">Nama Mitra</th>
                <th className="text-left py-3 px-3">Keterangan</th>
                <th className="text-right py-3 px-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-3 font-medium text-gray-800 uppercase">{p.name}</td>
                  <td className="py-3 px-3 text-gray-500 text-xs">{p.description || "-"}</td>
                  <td className="py-3 px-3 text-right">
                    <button onClick={() => { setEditingPartner(p); setFormData({ name: p.name, description: p.description || "" }); setShowModal(true); }} className="text-blue-600 hover:text-blue-800 text-xs font-bold mr-3">Edit</button>
                    <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700 text-xs font-bold">Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">{editingPartner ? "Edit Mitra" : "Tambah Mitra Baru"}</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="form-label uppercase text-[10px] font-black tracking-widest">Nama Mitra</label>
                  <input className="input-field" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required placeholder="Contoh: LPK MITRA UTAMA" />
                </div>
                <div>
                  <label className="form-label uppercase text-[10px] font-black tracking-widest">Keterangan (Optional)</label>
                  <input className="input-field" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Catatan singkat..." />
                </div>
                <div className="flex justify-end space-x-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Batal</button>
                  <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
