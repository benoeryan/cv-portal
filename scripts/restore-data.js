import fs from "fs";
import path from "path";

/**
 * Script untuk meng-restore data Firestore dari firestore_backup.json ke project Firebase baru.
 * 
 * Cara Penggunaan:
 * 1. Buka file firebase-applet-config.json atau .env, ganti config dengan project Firebase baru Anda.
 * 2. Jalankan perintah: node scripts/restore-data.js
 */

async function restoreData() {
  const backupPath = path.resolve(process.cwd(), "firestore_backup.json");
  if (!fs.existsSync(backupPath)) {
    console.error("File firestore_backup.json tidak ditemukan!");
    return;
  }

  const backupData = JSON.parse(fs.readFileSync(backupPath, "utf-8"));
  console.log(`Memulai restore data: ${backupData.candidateCount} candidates dan ${backupData.userCount} users...`);

  let config = {};
  try {
    const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    }
  } catch (e) {
    console.warn("Gagal membaca firebase-applet-config.json, menggunakan environment default.");
  }

  const projectId = config.projectId || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "test-kesehatan-ijef-corp-7c278";
  console.log(`Target Project ID Firebase: ${projectId}`);

  // Restore Candidates
  let restoredCandidates = 0;
  for (const doc of backupData.candidates) {
    const docId = doc.id;
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/candidates/${encodeURIComponent(docId)}`;
    try {
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: doc.fields })
      });
      if (res.ok) restoredCandidates++;
    } catch (err) {
      console.error(`Gagal restore candidate ${docId}:`, err);
    }
  }

  // Restore Users
  let restoredUsers = 0;
  for (const doc of backupData.users) {
    const docId = doc.id;
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${encodeURIComponent(docId)}`;
    try {
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: doc.fields })
      });
      if (res.ok) restoredUsers++;
    } catch (err) {
      console.error(`Gagal restore user ${docId}:`, err);
    }
  }

  console.log(`Restore Selesai! Berhasil mengunggah ${restoredCandidates} kandidat dan ${restoredUsers} user ke Firebase Project: ${projectId}`);
}

restoreData();
