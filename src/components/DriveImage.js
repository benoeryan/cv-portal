"use client";
import { useState } from "react";

export function isAiPhotoUrl(url) {
  if (!url || typeof url !== "string") return false;
  const aiDomains = [
    "unsplash.com",
    "pravatar.cc",
    "randomuser.me",
    "xsgames.co",
    "thispersondoesnotexist.com",
    "multiavatar.com",
    "robohash.org",
    "via.placeholder.com",
    "placeholder.com",
    "dummyimage.com",
    "i.pravatar.cc"
  ];
  const lower = url.toLowerCase();
  return aiDomains.some((domain) => lower.includes(domain));
}

// Convert Google Drive sharing link to direct image URL without breaking Firebase Storage or direct URLs
export function getDriveImageUrl(url, size = 1000) {
  if (!url || isAiPhotoUrl(url)) return null;
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
      /\/open\?id=([a-zA-Z0-9_-]+)/,
      /\/file\/d\/([a-zA-Z0-9_-]+)/,
      /\/d\/([a-zA-Z0-9_-]+)/,
      /id=([a-zA-Z0-9_-]+)/,
      /drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/,
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
  if (!name) return "";
  let str = name;
  if (typeof name === 'object') {
    str = name.namaLengkap || name.nama || name.name || "";
  }
  if (typeof str !== 'string') str = String(str);
  const cleaned = str.replace(/[^a-zA-Z\s]/g, "").trim();
  if (!cleaned) return "";
  const parts = cleaned.split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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

  const fallbackUI = (
    <div className={`${size} ${className} bg-purple-100 text-purple-700 font-black flex items-center justify-center text-xs shrink-0 rounded-xl uppercase border border-purple-200`}>
      {initials || "-"}
    </div>
  );

  if (!imgUrl || isAiPhotoUrl(imgUrl) || hasError) {
    return fallbackUI;
  }

  return (
    <img
      src={imgUrl}
      alt={safeText(alt, "Photo")}
      className={`${size} ${className} object-cover rounded-xl`}
      onError={() => setHasError(true)}
    />
  );
}
