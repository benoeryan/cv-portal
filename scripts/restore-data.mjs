import fs from "fs";
import path from "path";
import { EXTRACTED_JOBS } from "../src/lib/backupData.js";

/**
 * Script untuk meng-restore data Firestore ke project Firebase simantap-ijef.
 */

async function restoreData() {
  const backupPath = path.resolve(process.cwd(), "firestore_backup.json");
  if (!fs.existsSync(backupPath)) {
    console.error("File firestore_backup.json tidak ditemukan!");
    return;
  }

  const backupData = JSON.parse(fs.readFileSync(backupPath, "utf-8"));
  const projectId = "simantap-ijef";
  console.log(`Memulai restore data ke target Project ID Firebase: ${projectId}...`);

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
      if (res.ok) {
        restoredCandidates++;
      }
    } catch (err) {}
  }
  console.log(`Berhasil restore ${restoredCandidates} kandidat.`);

  // Restore 102 Jobs
  let restoredJobs = 0;
  for (const job of EXTRACTED_JOBS) {
    const docId = job.id || job.kodeJob;
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/jobs/${encodeURIComponent(docId)}`;
    const fields = {};
    for (const [k, v] of Object.entries(job)) {
      if (k !== "id") {
        fields[k] = { stringValue: String(v || "") };
      }
    }
    try {
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields })
      });
      if (res.ok) {
        restoredJobs++;
      }
    } catch (err) {}
  }
  console.log(`Berhasil restore ${restoredJobs} lowongan kerja resmi.`);

  // Restore Users
  let restoredUsers = 0;
  if (backupData.users) {
    for (const doc of backupData.users) {
      const docId = doc.id;
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${encodeURIComponent(docId)}`;
      try {
        const res = await fetch(url, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fields: doc.fields })
        });
        if (res.ok) {
          restoredUsers++;
        }
      } catch (err) {}
    }
  }
  console.log(`Berhasil restore ${restoredUsers} user.`);
  console.log(`Restore Selesai untuk project ${projectId}!`);
}

restoreData();
