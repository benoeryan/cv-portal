import { db } from "@/lib/firebase";
import { doc, setDoc, getDocs, collection } from "firebase/firestore";
import { EXTRACTED_JOBS, getBackupCandidates, getBackupUsers } from "@/lib/backupData";

export async function autoPopulateFirestore() {
  try {
    const jobSnap = await getDocs(collection(db, "jobs")).catch(() => null);
    if (!jobSnap || jobSnap.empty) {
      for (const j of EXTRACTED_JOBS) {
        const docId = String(j.id || j.kodeJob);
        const { id, ...data } = j;
        await setDoc(doc(db, "jobs", docId), {
          ...data,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }).catch(() => {});
      }
    }

    const candidateSnap = await getDocs(collection(db, "candidates")).catch(() => null);
    if (!candidateSnap || candidateSnap.empty) {
      const candidates = getBackupCandidates();
      for (const c of candidates) {
        const docId = String(c.id);
        const { id, ...data } = c;
        await setDoc(doc(db, "candidates", docId), {
          ...data,
          submittedAt: c.submittedAt || new Date().toISOString(),
          updatedAt: c.updatedAt || new Date().toISOString()
        }).catch(() => {});
      }
    }

    const userSnap = await getDocs(collection(db, "users")).catch(() => null);
    if (!userSnap || userSnap.empty) {
      const users = getBackupUsers();
      for (const u of users) {
        const docId = String(u.id);
        const { id, ...data } = u;
        await setDoc(doc(db, "users", docId), data).catch(() => {});
      }
    }
  } catch (err) {
    console.warn("Auto populate error:", err);
  }
}
