import { supabase } from "./supabase";
import { getBackupCandidates, getBackupJobs, getBackupUsers } from "./backupData";

// Generic Supabase JSONB CRUD helper
export async function dbGetDocs(tableName) {
  try {
    const { data, error } = await supabase.from(tableName).select("*");
    if (error || !data || data.length === 0) {
      if (tableName === "candidates") return getBackupCandidates();
      if (tableName === "jobs") return getBackupJobs();
      if (tableName === "users") return getBackupUsers();
      return [];
    }
    return data.map(item => ({
      id: item.id,
      ...(typeof item.data === "object" && item.data !== null ? item.data : {}),
    }));
  } catch (err) {
    console.error(`Error fetching ${tableName}:`, err);
    if (tableName === "candidates") return getBackupCandidates();
    if (tableName === "jobs") return getBackupJobs();
    if (tableName === "users") return getBackupUsers();
    return [];
  }
}

export async function dbGetDoc(tableName, id) {
  try {
    const { data, error } = await supabase.from(tableName).select("*").eq("id", id).maybeSingle();
    if (error || !data) {
      const all = tableName === "candidates" ? getBackupCandidates() : tableName === "jobs" ? getBackupJobs() : getBackupUsers();
      return all.find(x => x.id === id) || null;
    }
    return {
      id: data.id,
      ...(typeof data.data === "object" && data.data !== null ? data.data : {}),
    };
  } catch (err) {
    console.error(`Error fetching doc ${id} from ${tableName}:`, err);
    const all = tableName === "candidates" ? getBackupCandidates() : tableName === "jobs" ? getBackupJobs() : getBackupUsers();
    return all.find(x => x.id === id) || null;
  }
}

export async function dbSetDoc(tableName, id, payload) {
  try {
    const record = {
      id: String(id),
      data: payload,
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase.from(tableName).upsert(record);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error(`Error saving doc ${id} to ${tableName}:`, err);
    throw err;
  }
}

export async function dbAddDoc(tableName, payload) {
  try {
    const id = "id_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    await dbSetDoc(tableName, id, payload);
    return { id };
  } catch (err) {
    console.error(`Error adding doc to ${tableName}:`, err);
    throw err;
  }
}

export async function dbUpdateDoc(tableName, id, payload) {
  try {
    const existing = await dbGetDoc(tableName, id) || {};
    const updated = { ...existing, ...payload };
    return await dbSetDoc(tableName, id, updated);
  } catch (err) {
    console.error(`Error updating doc ${id} in ${tableName}:`, err);
    throw err;
  }
}

export async function dbDeleteDoc(tableName, id) {
  try {
    const { error } = await supabase.from(tableName).delete().eq("id", id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error(`Error deleting doc ${id} from ${tableName}:`, err);
    throw err;
  }
}
