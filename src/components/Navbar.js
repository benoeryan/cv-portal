"use client";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const { user, userData, candidateData, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const showJobList = userData?.role === "admin" || (
    userData?.role === "candidate" &&
    (candidateData?.kategoriKandidat?.includes("NEW COMER") || candidateData?.kategoriKandidat?.includes("MATCHING JOB"))
  );

  if (!user) return null;

  return (
    <>
      <nav className="bg-white shadow-sm border-b border-gray-200 no-print fixed top-0 left-0 right-0 z-50">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 items-center">
            <div className="flex items-center space-x-6">
              <Link href="/" className="text-lg font-bold text-blue-600">
                CV Portal
              </Link>
              {userData?.role === "admin" && (
                <>
                  <Link href="/admin" className="text-sm text-gray-600 hover:text-blue-600">
                    Dashboard
                  </Link>
                  <Link href="/admin/candidates" className="text-sm text-gray-600 hover:text-blue-600">
                    Data Kandidat
                  </Link>
                  <Link href="/admin/partners" className="text-sm text-gray-600 hover:text-blue-600">
                    Daftar Mitra
                  </Link>
                  <Link href="/admin/requests" className="text-sm text-gray-600 hover:text-blue-600">
                    Request Mitra
                  </Link>
                  <Link href="/admin/jobs" className="text-sm text-gray-600 hover:text-blue-600">
                    Manajemen Job
                  </Link>
                  <Link href="/admin/import" className="text-sm text-gray-600 hover:text-blue-600">
                    Import Data
                  </Link>
                  <Link href="/admin/settings" className="text-sm text-gray-600 hover:text-blue-600">
                    Settings
                  </Link>
                  <Link href="/admin/download" className="text-sm text-gray-600 hover:text-blue-600">
                    Download App
                  </Link>
                </>
              )}
              {userData?.role === "candidate" && (
                <>
                  <Link href="/candidate/status" className="text-sm text-gray-600 hover:text-blue-600">
                    Status Pendaftaran
                  </Link>
                  {showJobList && (
                    <Link href="/jobs" className="text-sm text-gray-600 hover:text-blue-600 font-bold">
                      Daftar Job
                    </Link>
                  )}
                  <Link href="/candidate/form" className="text-sm text-gray-600 hover:text-blue-600">
                    Isi Form
                  </Link>
                  <Link href="/candidate/cv" className="text-sm text-gray-600 hover:text-blue-600">
                    Lihat CV
                  </Link>
                </>
              )}
              {(userData?.role === "partner" || userData?.role === "admin") && (
                <>
                  <Link href="/partner" className="text-sm text-gray-600 hover:text-blue-600">
                    Portal Mitra
                  </Link>
                </>
              )}
              {userData?.role === "partner" && (
                <>
                  <Link href="/partner/jobs" className="text-sm text-gray-600 hover:text-blue-600">
                    Daftar Job
                  </Link>
                  <Link href="/partner/candidates" className="text-sm text-gray-600 hover:text-blue-600">
                    Cari Siswa
                  </Link>
                </>
              )}
              {(userData?.role === "viewer" || userData?.role === "approval") && (
                <>
                  <Link href="/admin" className="text-sm text-gray-600 hover:text-blue-600">
                    Dashboard
                  </Link>
                  <Link href="/admin/candidates" className="text-sm text-gray-600 hover:text-blue-600">
                    Data Kandidat
                  </Link>
                </>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">{userData?.fullName || user.email}</span>
              <button onClick={handleLogout} className="text-sm text-red-500 hover:text-red-700">
                Keluar
              </button>
            </div>
          </div>
        </div>
      </nav>
      {/* Spacer to push content down since the nav is fixed */}
      <div className="h-14 no-print"></div>
    </>
  );
}
