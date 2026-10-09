"use client";

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

// Convert Google Drive sharing link to direct image URL
export function getDriveImageUrl(url, size = 400) {
  if (!url || isAiPhotoUrl(url)) return null;
  // Extract file ID from various Google Drive URL formats
  const patterns = [
    /\/open\?id=([a-zA-Z0-9_-]+)/,
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return `https://lh3.googleusercontent.com/d/${match[1]}=s${size}`;
    }
  }
  return url;
}

function getInitials(name) {
  if (!name || typeof name !== "string") return "";
  const cleaned = name.replace(/[^a-zA-Z\s]/g, "").trim();
  if (!cleaned) return "";
  const parts = cleaned.split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function DriveImage({ url, alt = "Photo", size = "w-12 h-12", className = "" }) {
  const imgUrl = getDriveImageUrl(url, 1000); // Use high quality by default for cards
  const initials = getInitials(alt);

  const fallbackUI = (
    <div className={`${size} ${className} bg-purple-100 text-purple-700 font-black flex items-center justify-center text-xs shrink-0 rounded-xl uppercase border border-purple-200`}>
      {initials || "-"}
    </div>
  );

  if (!imgUrl || isAiPhotoUrl(imgUrl)) {
    return fallbackUI;
  }

  return (
    <img
      src={imgUrl}
      alt={alt}
      className={`${size} ${className} object-cover rounded-xl`}
      onError={(e) => {
        e.target.style.display = "none";
        if (e.target.parentNode) {
          const container = document.createElement("div");
          container.className = `${size} ${className} bg-purple-100 text-purple-700 font-black flex items-center justify-center text-xs shrink-0 rounded-xl uppercase border border-purple-200`;
          container.innerText = initials || "-";
          e.target.parentNode.appendChild(container);
        }
      }}
    />
  );
}
