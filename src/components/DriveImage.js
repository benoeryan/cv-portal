"use client";

// Convert Google Drive sharing link to direct image URL
export function getDriveImageUrl(url, size = 400) {
  if (!url) return null;
  // Extract file ID from various Google Drive URL formats
  const patterns = [
    /\/open\?id=([a-zA-Z0-9_-]+)/,
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return `https://lh3.googleusercontent.com/d/${match[1]}=s${size}`;
    }
  }
  return url;
}

export default function DriveImage({ url, alt = "Photo", size = "w-12 h-12", className = "" }) {
  const imgUrl = getDriveImageUrl(url, 1000); // Use high quality by default for cards
  
  if (!imgUrl) {
    return (
      <div className={`${size} ${className} bg-gray-200 flex items-center justify-center text-gray-400 text-xs`}>
        No Photo
      </div>
    );
  }

  return (
    <img
      src={imgUrl}
      alt={alt}
      className={`${size} ${className} object-cover`}
      onError={(e) => {
        e.target.style.display = "none";
        const placeholder = document.createElement('div');
        placeholder.className = `${size} ${className} bg-gray-200 flex items-center justify-center text-gray-400 text-xs`;
        placeholder.innerText = 'Error';
        e.target.parentNode.appendChild(placeholder);
      }}
    />
  );
}
