import backupJson from "../../firestore_backup.json";

function parseFirestoreValue(val) {
  if (!val) return null;
  if (val.stringValue !== undefined) return val.stringValue;
  if (val.integerValue !== undefined) return parseInt(val.integerValue, 10);
  if (val.doubleValue !== undefined) return parseFloat(val.doubleValue);
  if (val.booleanValue !== undefined) return val.booleanValue;
  if (val.timestampValue !== undefined) return val.timestampValue;
  if (val.nullValue !== undefined) return null;
  if (val.mapValue) {
    const res = {};
    const fields = val.mapValue.fields || {};
    for (const [k, v] of Object.entries(fields)) {
      res[k] = parseFirestoreValue(v);
    }
    return res;
  }
  if (val.arrayValue) {
    const values = val.arrayValue.values || [];
    return values.map(parseFirestoreValue);
  }
  return null;
}

export function parseFirestoreFields(fields) {
  const result = {};
  for (const [k, v] of Object.entries(fields || {})) {
    result[k] = parseFirestoreValue(v);
  }
  return result;
}

export function getBackupCandidates() {
  if (!backupJson || !backupJson.candidates) return [];
  const list = backupJson.candidates.map((c) => ({
    id: c.id,
    ...parseFirestoreFields(c.fields),
  }));

  const recentAdds = [
    {
      id: "jian_mutiasukma_2026",
      namaLengkap: "JIAN MUTIASUKMA",
      namaPanggilan: "Jian",
      bidangKerja: "KAIGO",
      kategoriKandidat: "NEW COMER",
      statusProgres: "Pending Nunggu Job",
      jenisKelamin: "PEREMPUAN",
      submittedAt: "2026-10-22T12:00:00.000Z",
      updatedAt: "2026-10-22T12:00:00.000Z"
    },
    {
      id: "iqbal_adama_2026",
      namaLengkap: "IQBAL ADAMA",
      namaPanggilan: "Iqbal",
      bidangKerja: "PERHOTELAN",
      kategoriKandidat: "NEW COMER",
      statusProgres: "Pending Nunggu Job",
      jenisKelamin: "LAKI-LAKI",
      submittedAt: "2026-10-22T12:00:00.000Z",
      updatedAt: "2026-10-22T12:00:00.000Z"
    },
    {
      id: "syahira_ayudha_2026",
      namaLengkap: "SYAHIRA AYUDHA",
      namaPanggilan: "Syahira",
      bidangKerja: "KAIGO",
      kategoriKandidat: "NEW COMER",
      statusProgres: "Pending Nunggu Job",
      jenisKelamin: "PEREMPUAN",
      submittedAt: "2026-10-22T12:00:00.000Z",
      updatedAt: "2026-10-22T12:00:00.000Z"
    }
  ];

  let localAdds = [];
  try {
    const rawLocal = typeof window !== "undefined" ? (localStorage.getItem("cv_portal_cached_candidates") || localStorage.getItem("cv_portal_local_candidates") || "[]") : "[]";
    localAdds = JSON.parse(rawLocal);
  } catch (e) {}

  const map = new Map();
  recentAdds.forEach(r => map.set(r.id, r));

  list.forEach(item => {
    if (item && item.id) map.set(String(item.id), item);
  });

  localAdds.forEach(item => {
    if (item && item.id) {
      const existing = map.get(String(item.id)) || {};
      map.set(String(item.id), { ...existing, ...item });
    }
  });

  return Array.from(map.values());
}

export function getBackupUsers() {
  if (!backupJson || !backupJson.users) return [];
  return backupJson.users.map((u) => ({
    id: u.id,
    ...parseFirestoreFields(u.fields),
  }));
}

export function getBackupJobs() {
  if (!backupJson || !backupJson.jobs) return [];
  return backupJson.jobs.map((j) => ({
    id: j.id,
    ...parseFirestoreFields(j.fields),
  }));
}
