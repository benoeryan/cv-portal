import { getBackupCandidates, getBackupJobs, getBackupUsers } from "./backupData";

export async function dbGetDocs(tableName) {
  if (tableName === "candidates") {
    const backup = getBackupCandidates();
    let localAdds = [];
    try {
      localAdds = JSON.parse(localStorage.getItem("cv_portal_local_candidates") || "[]");
    } catch (e) {}

    const map = new Map();
    // First load backup data
    backup.forEach(item => {
      if (item && item.id) {
        map.set(String(item.id), item);
      }
    });
    // Then override with localAdds (which contain the absolute latest user updates, status changes, and history)
    localAdds.forEach(item => {
      if (item && item.id) {
        const existing = map.get(String(item.id)) || {};
        map.set(String(item.id), { ...existing, ...item });
      }
    });
    return Array.from(map.values());
  }

  if (tableName === "jobs") return getBackupJobs();
  if (tableName === "users") return getBackupUsers();
  return [];
}

export async function dbGetDoc(tableName, id) {
  const all = await dbGetDocs(tableName);
  return all.find(x => String(x.id) === String(id)) || null;
}

export async function dbSetDoc(tableName, id, payload) {
  try {
    if (tableName === "candidates") {
      const localAdds = JSON.parse(localStorage.getItem("cv_portal_local_candidates") || "[]");
      const idx = localAdds.findIndex(x => String(x.id) === String(id));
      const newItem = { id: String(id), ...payload };
      if (idx >= 0) localAdds[idx] = newItem;
      else localAdds.unshift(newItem);
      localStorage.setItem("cv_portal_local_candidates", JSON.stringify(localAdds));
    }
  } catch (e) {}
  return true;
}

export async function dbAddDoc(tableName, payload) {
  const id = "id_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  await dbSetDoc(tableName, id, payload);
  return { id };
}

export async function dbUpdateDoc(tableName, id, payload) {
  const existing = await dbGetDoc(tableName, id) || {};
  const updated = { ...existing, ...payload };
  return await dbSetDoc(tableName, id, updated);
}

export async function dbDeleteDoc(tableName, id) {
  try {
    if (tableName === "candidates") {
      const localAdds = JSON.parse(localStorage.getItem("cv_portal_local_candidates") || "[]");
      const filtered = localAdds.filter(x => String(x.id) !== String(id));
      localStorage.setItem("cv_portal_local_candidates", JSON.stringify(filtered));
    }
  } catch (e) {}
  return true;
}
