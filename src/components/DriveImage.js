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

export function getCandidatePhotoUrl(c) {
  if (!c) return null;
  if (typeof c === 'string') {
    const trimmed = c.trim();
    if (!trimmed) return null;
    return trimmed;
  }
  if (Array.isArray(c)) {
    for (const item of c) {
      const u = getCandidatePhotoUrl(item);
      if (u) return u;
    }
    return null;
  }
  if (typeof c === 'object') {
    return (
      c.pasPhoto ||
      c.pasFoto ||
      c.foto ||
      c.photo ||
      c.urlFoto ||
      c.linkFoto ||
      c.pasPhoto3x4 ||
      c.foto3x4 ||
      c.cvRirekisho ||
      c.sertifikatBahasaJepang ||
      c.scanIjazah ||
      c.fotoKtp ||
      c.fotoKeluarga ||
      c.sertifikatSSW ||
      c.sertifikatSSW2 ||
      c.dokumenSimA ||
      c.url ||
      c.path ||
      c.downloadURL ||
      null
    );
  }
  return null;
}

export function getDriveFileId(url) {
  if (!url) return null;
  let targetUrl = url;
  if (typeof url === 'object') {
    targetUrl = getCandidatePhotoUrl(url) || url.url || url.path || "";
  }
  if (typeof targetUrl !== 'string') return null;
  const trimmed = targetUrl.trim();

  if (/^[a-zA-Z0-9_-]{25,}$/.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.includes('drive.google.com') || trimmed.includes('docs.google.com') || trimmed.includes('googleusercontent.com')) {
    const patterns = [
      /\/open\?id=([a-zA-Z0-9_-]+)/,
      /\/file\/d\/([a-zA-Z0-9_-]+)/,
      /\/d\/([a-zA-Z0-9_-]+)/,
      /[?&]id=([a-zA-Z0-9_-]+)/,
      /\/d\/([a-zA-Z0-9_-]+)=/,
    ];
    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
  }
  return null;
}

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
    targetUrl = getCandidatePhotoUrl(url) || url.url || url.path || url.firebaseUrl || url.downloadURL || "";
  }
  if (typeof targetUrl !== 'string') return null;
  const trimmed = targetUrl.trim();
  if (!trimmed || isAiPhotoUrl(trimmed)) return null;

  const driveId = getDriveFileId(trimmed);
  if (driveId) {
    return `https://lh3.googleusercontent.com/d/${driveId}=s${size}`;
  }

  return trimmed;
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
  const [retryStep, setRetryStep] = useState(0);

  const targetPhoto = (typeof url === 'object' && url !== null && !url.url)
    ? getCandidatePhotoUrl(url)
    : url;

  const rawUrl = targetPhoto || url;
  const driveId = getDriveFileId(rawUrl);

  let currentSrc = null;
  if (driveId) {
    if (retryStep === 0) currentSrc = `https://lh3.googleusercontent.com/d/${driveId}=s1000`;
    else if (retryStep === 1) currentSrc = `https://drive.google.com/thumbnail?id=${driveId}&sz=w1000`;
    else if (retryStep === 2) currentSrc = `https://drive.google.com/uc?export=view&id=${driveId}`;
    else if (retryStep === 3) currentSrc = `https://docs.google.com/uc?export=download&id=${driveId}`;
  } else {
    currentSrc = getDriveImageUrl(rawUrl, 1000);
  }

  const initials = getInitials(alt || (typeof url === 'object' ? url.namaLengkap : ""));

  const fallbackUI = (
    <div className={`${size} ${className} bg-purple-100 text-purple-700 font-black flex items-center justify-center text-xs shrink-0 rounded-xl uppercase border border-purple-200`}>
      {initials || "-"}
    </div>
  );

  if (!currentSrc || isAiPhotoUrl(currentSrc) || retryStep > 3) {
    return fallbackUI;
  }

  return (
    <img
      src={currentSrc}
      alt={safeText(alt, "Photo")}
      className={`${size} ${className} object-cover rounded-xl`}
      onError={() => {
        setRetryStep((prev) => prev + 1);
      }}
    />
  );
}

DriveImage.safeText = safeText;
DriveImage.getCandidatePhotoUrl = getCandidatePhotoUrl;
DriveImage.getDriveFileId = getDriveFileId;
