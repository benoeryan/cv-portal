"use client";
import { useState } from "react";

// Convert Google Drive sharing link to direct image URL without breaking Firebase Storage or direct URLs
export function getDriveImageUrl(url, size = 1000) {
  if (!url) return null;
  if (Array.isArray(url)) {
    for (const u of url) {
      const res = getDriveImageUrl(u, size);
      if (res) return res;
    }
    return null;
  }
  let targetUrl = url;
  if (typeof url === 'object') {
    targetUrl = url.url || url.pasPhoto || url.sertifikatBahasaJepang || url.fotoKtp || url.foto || url.path || url.firebaseUrl || url.downloadURL || "";
  }
  if (typeof targetUrl !== 'string') return null;

  // Only convert Google Drive URLs
  if (targetUrl.includes('drive.google.com') || targetUrl.includes('docs.google.com')) {
    const patterns = [
      /\/file\/d\/([a-zA-Z0-9_-]+)/,
      /\/open\?id=([a-zA-Z0-9_-]+)/,
      /[?&]id=([a-zA-Z0-9_-]+)/,
    ];
    for (const pattern of patterns) {
      const match = targetUrl.match(pattern);
      if (match) {
        return `https://lh3.googleusercontent.com/d/${match[1]}=s${size}`;
      }
    }
  }

  return targetUrl;
}

export function getInitials(name) {
  if (!name) return "CV";
  let str = name;
  if (typeof name === 'object') {
    str = name.namaLengkap || name.nama || name.name || "";
  }
  if (typeof str !== 'string') str = String(str);
  const parts = str.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "CV";
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
}

export function safeText(val, fallback = "-") {
  if (!val) return fallback;
  if (typeof val === "string") return val;
  if (typeof val === "object") {
    return val.namaLengkap || val.nama || val.name || val.text || JSON.stringify(val);
  }
  return String(val);
}

export default function DriveImage({ url, alt = "Photo", size = "w-12 h-12", className = "" }) {
  const [hasError, setHasError] = useState(false);
  const imgUrl = getDriveImageUrl(url, 1000);
  const initials = getInitials(alt);

  if (!imgUrl || hasError) {
    return (
      <div className={`${size} ${className} bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-black text-xs shadow-inner select-none`}>
        <span className="tracking-wider">{initials}</span>
      </div>
    );
  }

  return (
    <img
      src={imgUrl}
      alt={safeText(alt, "Photo")}
      className={`${size} ${className} object-cover`}
      onError={() => setHasError(true)}
    />
  );
}
