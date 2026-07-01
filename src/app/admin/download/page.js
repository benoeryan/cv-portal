"use client";
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { QRCodeSVG } from "qrcode.react";

const APP_URL = "https://cv-portal-six.vercel.app";

const platforms = [
  {
    id: "android",
    name: "Android",
    icon: "📱",
    steps: [
      "Buka Chrome di perangkat Android",
      "Kunjungi URL: " + APP_URL,
      'Tap menu (...) di pojok kanan atas',
      'Pilih "Add to Home screen"',
      'Tap "Add"',
    ],
  },
  {
    id: "ios",
    name: "iOS",
    icon: "🍎",
    steps: [
      "Buka Safari di iPhone/iPad",
      "Kunjungi URL: " + APP_URL,
      "Tap tombol Share (ikon kotak dengan panah ke atas)",
      'Scroll ke bawah, pilih "Add to Home Screen"',
      'Tap "Add"',
    ],
  },
  {
    id: "windows",
    name: "Windows",
    icon: "💻",
    steps: [
      "Buka Chrome atau Edge",
      "Kunjungi URL: " + APP_URL,
      'Klik icon install di address bar (atau Menu > Install CV Portal)',
      'Klik "Install"',
    ],
  },
  {
    id: "macos",
    name: "macOS",
    icon: "🖥️",
    steps: [
      "Buka Chrome",
      "Kunjungi URL: " + APP_URL,
      'Klik menu > "Install CV Portal..."',
      'Klik "Install"',
    ],
  },
];

export default function DownloadPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("android");
  const [copied, setCopied] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installable, setInstallable] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setInstallable(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(APP_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = APP_URL;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareWhatsApp = () => {
    const message = `Download aplikasi CV Portal IJEF di sini: ${APP_URL}`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setInstallable(false);
        setDeferredPrompt(null);
      }
    }
  };

  const activePlatform = platforms.find((p) => p.id === activeTab);

  return (
    <>
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">
            Download Aplikasi CV Portal
          </h1>
          <p className="text-gray-500 mt-2">
            Install aplikasi ini di perangkat Anda untuk akses lebih cepat
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Left Column - QR Code */}
          <div className="card p-6 flex flex-col items-center justify-center">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              Scan QR Code
            </h2>
            <div className="bg-white p-4 rounded-xl shadow-md inline-block">
              <QRCodeSVG value={APP_URL} size={200} />
            </div>
            <p className="mt-4 text-sm text-gray-500 font-mono break-all text-center">
              {APP_URL}
            </p>
          </div>

          {/* Right Column - Install Instructions */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              Cara Install
            </h2>

            {/* Platform Tabs */}
            <div className="flex flex-wrap gap-2 mb-4">
              {platforms.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => setActiveTab(platform.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === platform.id
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {platform.icon} {platform.name}
                </button>
              ))}
            </div>

            {/* Steps */}
            {activePlatform && (
              <ol className="space-y-3">
                {activePlatform.steps.map((step, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="text-sm text-gray-700">{step}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        {/* Share Buttons */}
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            Bagikan Link
          </h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleCopyLink}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              {copied ? "Tersalin!" : "Copy Link"}
            </button>
            <button
              onClick={handleShareWhatsApp}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              Share via WhatsApp
            </button>
          </div>
        </div>

        {/* Install App Button */}
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            Install Langsung
          </h2>
          {installable ? (
            <button
              onClick={handleInstall}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-md"
            >
              Install App
            </button>
          ) : (
            <p className="text-sm text-gray-500">
              Gunakan instruksi di atas untuk menginstall
            </p>
          )}
        </div>

        {/* Cara Install Info Card */}
        <div className="card p-6 bg-blue-50 border border-blue-200">
          <div className="flex items-start gap-3">
            <span className="text-2xl">ℹ️</span>
            <div>
              <h3 className="font-semibold text-blue-800 mb-1">Tentang PWA</h3>
              <p className="text-sm text-blue-700">
                Aplikasi muncul di home screen / desktop seperti app native. Bisa dibuka tanpa browser. Akses lebih cepat dan mendukung notifikasi.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
