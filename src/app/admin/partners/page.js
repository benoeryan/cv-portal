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
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    address: "",
    contactPerson: "",
    phone: "",
    email: ""
  });
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

  const openModal = (partner = null) => {
    setEditingPartner(partner);
    if (partner) {
      setFormData({
        name: partner.name || "",
        description: partner.description || "",
        address: partner.address || "",
        contactPerson: partner.contactPerson || "",
        phone: partner.phone || "",
        email: partner.email || ""
      });
    } else {
      setFormData({ name: "", description: "", address: "", contactPerson: "", phone: "", email: "" });
    }
    setShowModal(true);
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
          <button onClick={() => openModal()} className="btn-primary">
            + Tambah Mitra
          </button>
        </div>

        <div className="card !p-0 overflow-hidden border border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-900 text-white uppercase tracking-widest text-[10px]">
                <th className="text-left py-4 px-4">Nama Mitra</th>
                <th className="text-left py-4 px-4">Kontak / Person</th>
                <th className="text-left py-4 px-4">Alamat / Lokasi</th>
                <th className="text-right py-4 px-4">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-4">
                    <p className="font-black text-slate-800 uppercase text-xs">{p.name}</p>
                    <p className="text-[10px] text-gray-400 font-bold">{p.email || p.description}</p>
                  </td>
                  <td className="py-4 px-4">
                    <p className="text-xs font-bold text-indigo-600 uppercase">{p.contactPerson || "-"}</p>
                    <p className="text-[10px] text-gray-400">{p.phone || "-"}</p>
                  </td>
                  <td className="py-4 px-4">
                    <p className="text-[10px] text-slate-500 line-clamp-1">{p.address || "-"}</p>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <button onClick={() => openModal(p)} className="text-blue-600 hover:text-blue-800 text-xs font-bold mr-4 uppercase tracking-tighter">Edit</button>
                    <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700 text-xs font-bold uppercase tracking-tighter">Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[2rem] shadow-2xl max-w-lg w-full p-8 overflow-hidden">
              <h3 className="text-xl font-black text-gray-800 mb-6 uppercase tracking-tight">{editingPartner ? "Update Profil Mitra" : "Daftarkan Mitra Baru"}</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="md:col-span-2">
                      <label className="form-label uppercase text-[10px] font-black tracking-widest text-slate-400">Nama Lengkap Mitra / Perusahaan</label>
                      <input className="input-field bg-slate-50 border-none font-bold uppercase" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required placeholder="LPK MITRA UTAMA" />
                   </div>
                   <div>
                      <label className="form-label uppercase text-[10px] font-black tracking-widest text-slate-400">Email Mitra</label>
                      <input type="email" className="input-field bg-slate-50 border-none font-bold" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="mitra@email.com" />
                   </div>
                   <div>
                      <label className="form-label uppercase text-[10px] font-black tracking-widest text-slate-400">Nomor Telepon / WA</label>
                      <input className="input-field bg-slate-50 border-none font-bold" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="+62..." />
                   </div>
                   <div className="md:col-span-2">
                      <label className="form-label uppercase text-[10px] font-black tracking-widest text-slate-400">Contact Person</label>
                      <input className="input-field bg-slate-50 border-none font-bold" value={formData.contactPerson} onChange={(e) => setFormData({...formData, contactPerson: e.target.value})} placeholder="Nama penanggung jawab" />
                   </div>
                   <div className="md:col-span-2">
                      <label className="form-label uppercase text-[10px] font-black tracking-widest text-slate-400">Alamat Lengkap Kantor</label>
                      <textarea className="input-field bg-slate-50 border-none font-bold text-xs" rows="3" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} placeholder="Jalan..., Kota..." />
                   </div>
                   <div className="md:col-span-2">
                      <label className="form-label uppercase text-[10px] font-black tracking-widest text-slate-400">Keterangan / Deskripsi</label>
                      <input className="input-field bg-slate-50 border-none font-bold text-xs" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Bidang mitra atau info lainnya..." />
                   </div>
                </div>
                <div className="flex justify-end space-x-3 pt-6">
                  <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 font-bold text-slate-400 uppercase text-xs tracking-widest">Batal</button>
                  <button type="submit" className="bg-slate-900 text-white px-8 py-2.5 rounded-xl font-black uppercase text-xs tracking-widest shadow-xl shadow-slate-200" disabled={saving}>{saving ? "Processing..." : "Simpan Data"}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
