"use client";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const { user, userData, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  if (!user) return null;

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 items-center">
          <div className="flex items-center space-x-6">
            <Link href="/" className="text-lg font-bold text-blue-600">
              CV Portal
            </Link>
            {userData?.role === "admin" && (
              <>
                <Link href="/admin/candidates" className="text-sm text-gray-600 hover:text-blue-600">
                  Data Kandidat
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
                <Link href="/candidate/form" className="text-sm text-gray-600 hover:text-blue-600">
                  Isi Form
                </Link>
                <Link href="/candidate/cv" className="text-sm text-gray-600 hover:text-blue-600">
                  Lihat CV
                </Link>
              </>
            )}
            {(userData?.role === "viewer" || userData?.role === "approval") && (
              <>
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
  );
}
