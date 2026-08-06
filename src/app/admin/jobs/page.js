"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import Navbar from "@/components/Navbar";

export default function JobManagementPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [formData, setFormData] = useState({
    namaJob: "",
    perusahaan: "",
    lokasi: "",
    bidang: "",
    kategori: "",
  });
  const [submitting, setCreating] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || userData?.role !== "admin")) {
      router.push("/");
      return;
    }
    if (user && userData?.role === "admin") {
      loadJobs();
    }
  }, [user, userData, authLoading]);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "jobs"), orderBy("namaJob", "asc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setJobs(data);
    } catch (err) {
      console.error("Error loading jobs:", err);
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      if (editingJob) {
        await updateDoc(doc(db, "jobs", editingJob.id), {
          ...formData,
          updatedAt: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, "jobs"), {
          ...formData,
          createdAt: new Date().toISOString()
        });
      }
      setShowModal(false);
      setEditingJob(null);
      setFormData({ namaJob: "", perusahaan: "", lokasi: "", bidang: "", kategori: "" });
      loadJobs();
    } catch (err) {
      alert("Gagal menyimpan data: " + err.message);
    }
    setCreating(false);
  };

  const handleEdit = (job) => {
    setEditingJob(job);
    setFormData({
      namaJob: job.namaJob || "",
      perusahaan: job.perusahaan || "",
      lokasi: job.lokasi || "",
      bidang: job.bidang || "",
      kategori: job.kategori || "",
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Hapus job ini?")) return;
    try {
      await deleteDoc(doc(db, "jobs", id));
      loadJobs();
    } catch (err) {
      alert("Gagal menghapus: " + err.message);
    }
  };

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <>
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Manajemen Job</h1>
            <p className="text-gray-500 text-sm">Kelola daftar lowongan pekerjaan untuk progres kandidat</p>
          </div>
          <button
            onClick={() => { setEditingJob(null); setFormData({ namaJob: "", perusahaan: "", lokasi: "", bidang: "", kategori: "" }); setShowModal(true); }}
            className="btn-primary"
          >
            + Tambah Job Baru
          </button>
        </div>

        <div className="card overflow-hidden !p-0">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="py-3 px-4 font-bold text-gray-600">Nama Job</th>
                <th className="py-3 px-4 font-bold text-gray-600">Perusahaan</th>
                <th className="py-3 px-4 font-bold text-gray-600">Lokasi</th>
                <th className="py-3 px-4 font-bold text-gray-600">Sektor</th>
                <th className="py-3 px-4 font-bold text-gray-600 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 px-4 font-medium text-gray-800">{j.namaJob}</td>
                  <td className="py-4 px-4 text-gray-600">{j.perusahaan}</td>
                  <td className="py-4 px-4 text-gray-600">{j.lokasi}</td>
                  <td className="py-4 px-4">
                    <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold">{j.bidang}</span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex justify-center gap-3">
                      <button onClick={() => handleEdit(j)} className="text-indigo-600 hover:text-indigo-800 font-bold text-xs uppercase">Edit</button>
                      <button onClick={() => handleDelete(j.id)} className="text-red-500 hover:text-red-700 font-bold text-xs uppercase">Hapus</button>
                    </div>
                  </td>
                </tr>
              ))}
              {jobs.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-20 text-center text-gray-400">Belum ada daftar job. Klik "Tambah Job Baru" untuk memulai.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">{editingJob ? "Edit Job" : "Tambah Job Baru"}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="form-label">Nama Lowongan / Job</label>
                <input className="input-field" value={formData.namaJob} onChange={(e) => setFormData({...formData, namaJob: e.target.value})} required placeholder="Contoh: Peternakan Sapi Tokyo" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Perusahaan</label>
                  <input className="input-field" value={formData.perusahaan} onChange={(e) => setFormData({...formData, perusahaan: e.target.value})} required placeholder="Nama Perusahaan" />
                </div>
                <div>
                  <label className="form-label">Lokasi (Jepang)</label>
                  <input className="input-field" value={formData.lokasi} onChange={(e) => setFormData({...formData, lokasi: e.target.value})} required placeholder="Contoh: Chiba, Tokyo" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Sektor / Bidang</label>
                  <input className="input-field" value={formData.bidang} onChange={(e) => setFormData({...formData, bidang: e.target.value})} placeholder="Contoh: KAIGO, PM" />
                </div>
                <div>
                  <label className="form-label">Kategori</label>
                  <input className="input-field" value={formData.kategori} onChange={(e) => setFormData({...formData, kategori: e.target.value})} placeholder="NEW COMER, dll" />
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Batal</button>
                <button type="submit" className="btn-primary px-8" disabled={submitting}>
                  {submitting ? "Menyimpan..." : "Simpan Data Job"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
