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
      if (userData?.role === "admin" || userData?.role === "viewer" || userData?.role === "approval") {
        router.push("/admin/candidates");
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="card max-w-md w-full mx-4 text-center">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">CV Portal IJEF</h1>
          <p className="text-gray-500">Portal Pendaftaran Kandidat Kerja Jepang</p>
        </div>

        <div className="space-y-3">
          <Link href="/auth/login" className="btn-primary block w-full text-center">
            Masuk
          </Link>
          <Link href="/auth/register" className="btn-secondary block w-full text-center">
            Daftar Akun Baru
          </Link>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-400">
            Sistem CV Matching Job - International Japan Employment Foundation
          </p>
        </div>
      </div>
    </div>
  );
}
