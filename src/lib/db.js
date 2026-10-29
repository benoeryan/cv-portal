import { supabase } from "./supabase";
import { getBackupCandidates, getBackupJobs, getBackupUsers } from "./backupData";

export async function dbGetDocs(tableName) {
  let supabaseRecords = [];
  try {
    const { data, error } = await supabase.from(tableName).select("*");
    if (!error && data && data.length > 0) {
      supabaseRecords = data.map(item => ({
        id: item.id,
        ...(typeof item.data === "object" && item.data !== null ? item.data : {}),
      }));
    }
  } catch (err) {
    console.warn(`Supabase fetch warning for ${tableName}:`, err);
  }

  if (tableName === "candidates") {
    const backup = getBackupCandidates();
    let localAdds = [];
    try {
      localAdds = JSON.parse(localStorage.getItem("cv_portal_local_candidates") || "[]");
    } catch (e) {}

    // Combine Supabase records + local adds + backup data (no duplicates by ID)
    const map = new Map();
    [...supabaseRecords, ...localAdds, ...backup].forEach(item => {
      if (item && item.id && !map.has(String(item.id))) {
        map.set(String(item.id), item);
      }
    });
    const combined = Array.from(map.values());
    if (combined.length > 0) return combined;
    return backup;
  }

  if (tableName === "jobs") {
    const backupJobs = getBackupJobs();
    const map = new Map();
    [...supabaseRecords, ...backupJobs].forEach(item => {
      if (item && item.id && !map.has(String(item.id))) {
        map.set(String(item.id), item);
      }
    });
    return Array.from(map.values());
  }

  if (tableName === "users") {
    const backupUsers = getBackupUsers();
    const map = new Map();
    [...supabaseRecords, ...backupUsers].forEach(item => {
      if (item && item.id && !map.has(String(item.id))) {
        map.set(String(item.id), item);
      }
    });
    return Array.from(map.values());
  }

  return supabaseRecords;
}

export async function dbGetDoc(tableName, id) {
  const all = await dbGetDocs(tableName);
  return all.find(x => String(x.id) === String(id)) || null;
}

export async function dbSetDoc(tableName, id, payload) {
  try {
    const record = {
      id: String(id),
      data: payload,
      updated_at: new Date().toISOString()
    };
    await supabase.from(tableName).upsert(record);
  } catch (err) {
    console.error("Supabase upsert error:", err);
  }

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
    await supabase.from(tableName).delete().eq("id", String(id));
  } catch (err) {}

  try {
    if (tableName === "candidates") {
      const localAdds = JSON.parse(localStorage.getItem("cv_portal_local_candidates") || "[]");
      const filtered = localAdds.filter(x => String(x.id) !== String(id));
      localStorage.setItem("cv_portal_local_candidates", JSON.stringify(filtered));
    }
  } catch (e) {}
  return true;
}
