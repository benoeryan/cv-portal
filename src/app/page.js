"use client";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

export default function HomePage() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      if (!userData) return; // Wait for profile load or auto-repair

      if (userData.role === "admin" || userData.role === "viewer" || userData.role === "approval") {
        router.push("/admin");
      } else if (userData.role === "partner") {
        router.push("/partner");
      } else {
        router.push("/candidate/status");
      }
    }
  }, [user, userData, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-100 px-4 py-12">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2 uppercase">PORTAL IJEF</h1>
          <p className="text-slate-500 font-medium italic">sistem pendaftaran & matching job kerja v3.0</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* OPTION 1: KANDIDAT */}
          <div className="card hover:shadow-xl transition-all border-t-4 border-blue-600 flex flex-col h-full">
            <div className="mb-6 flex-grow">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Portal Siswa</h2>
              <p className="text-slate-500 text-sm">Untuk calon kandidat/siswa yang ingin mendaftar dan mengisi CV data diri.</p>
            </div>
            <div className="space-y-2">
              <Link href="/auth/login" className="btn-primary block w-full text-center py-2.5 text-sm">
                Masuk Siswa
              </Link>
              <Link href="/auth/register" className="btn-secondary block w-full text-center py-2.5 text-sm border-blue-200 text-blue-700">
                Daftar Baru
              </Link>
            </div>
          </div>

          {/* OPTION 2: MITRA */}
          <div className="card hover:shadow-xl transition-all border-t-4 border-purple-600 flex flex-col h-full">
            <div className="mb-6 flex-grow">
              <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Portal Mitra</h2>
              <p className="text-slate-500 text-sm">Khusus untuk mitra perusahaan/TSK untuk mencari siswa & melihat daftar job.</p>
            </div>
            <div className="space-y-2">
              <Link href="/auth/login" className="btn-primary block w-full text-center py-2.5 text-sm bg-purple-600 hover:bg-purple-700">
                Masuk Mitra
              </Link>
              <Link href="/auth/register-partner" className="btn-secondary block w-full text-center py-2.5 text-sm border-purple-200 text-purple-700">
                Registrasi Mitra
              </Link>
            </div>
          </div>

          {/* OPTION 3: ADMIN */}
          <div className="card hover:shadow-xl transition-all border-t-4 border-slate-800 flex flex-col h-full">
            <div className="mb-6 flex-grow">
              <div className="w-12 h-12 bg-slate-100 text-slate-800 rounded-2xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Admin & Staff</h2>
              <p className="text-slate-500 text-sm">Akses internal untuk admin, viewer, dan approval dalam manajemen data.</p>
            </div>
            <div className="mt-auto">
              <Link href="/auth/login" className="btn-primary block w-full text-center py-2.5 text-sm bg-slate-800 hover:bg-slate-900">
                Masuk Staff
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-200 text-center">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
            International Japan Employment Foundation (IJEF) &copy; 2026
          </p>
        </div>
      </div>
    </div>
  );
}
