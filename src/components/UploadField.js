"use client";
import { useState, useRef, useEffect } from "react";
import { storage } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

export default function UploadField({ label, name, value, onChange, accept, userId, fullWidth = false }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef(null);
  const uploadTaskRef = useRef(null);

  const wrapperClass = fullWidth ? "md:col-span-2" : "";

  const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

  // Cancel upload on unmount
  useEffect(() => {
    return () => {
      if (uploadTaskRef.current) {
        uploadTaskRef.current.cancel();
      }
    };
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setError("File terlalu besar. Maksimal 500MB.");
      return;
    }

    setError("");
    setFileName(file.name);
    uploadFile(file);
  };

  const uploadFile = (file) => {
    // Cancel any in-progress upload before starting a new one
    if (uploadTaskRef.current) {
      uploadTaskRef.current.cancel();
    }

    const storagePath = `candidates/${userId}/${name}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file);
    uploadTaskRef.current = uploadTask;

    setUploading(true);
    setProgress(0);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        setProgress(pct);
      },
      (err) => {
        uploadTaskRef.current = null;
        setUploading(false);
        if (err.code === "storage/canceled") {
          return; // Silently ignore cancellation
        }
        setError("Upload gagal: " + err.message);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          uploadTaskRef.current = null;
          setUploading(false);
          setProgress(100);
          onChange({ target: { name, value: downloadURL } });
        } catch (err) {
          uploadTaskRef.current = null;
          setUploading(false);
          setError("Gagal mendapatkan URL: " + err.message);
        }
      }
    );
  };

  const handleManualUrl = (e) => {
    onChange({ target: { name, value: e.target.value } });
  };

  const isImage = accept && accept.includes("image/");
  const isValueImage = value && (value.match(/\.(jpg|jpeg|png|gif|webp)/i) || (isImage && value.startsWith("http")));

  return (
    <div className={wrapperClass}>
      <label className="form-label">{label}</label>

      {/* Upload Button */}
      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="btn-primary text-sm px-4 py-2"
          disabled={uploading || !userId}
        >
          {uploading ? "Mengupload..." : "Upload File"}
        </button>
        {fileName && !uploading && (
          <span className="text-xs text-gray-500 truncate max-w-[200px]">{fileName}</span>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Progress Bar */}
      {uploading && (
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
          <p className="text-xs text-gray-500 mt-1">{progress}% terupload</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className="text-xs text-red-500 mb-2">{error}</p>
      )}

      {/* Manual URL Input */}
      <input
        type="text"
        name={name}
        value={value || ""}
        onChange={handleManualUrl}
        className="input-field"
        placeholder="Atau paste URL Google Drive di sini..."
      />

      {/* Preview */}
      {value && (
        <div className="mt-2">
          {isValueImage && !value.includes("drive.google.com") ? (
            <img
              src={value}
              alt={label}
              className="h-20 w-20 object-cover rounded border border-gray-200"
            />
          ) : (
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline break-all"
            >
              {fileName || value}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
