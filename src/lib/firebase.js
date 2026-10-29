import { dbGetDocs, dbGetDoc, dbSetDoc, dbAddDoc, dbUpdateDoc, dbDeleteDoc } from "./db";
import { supabase } from "./supabase";

export class DocumentSnapshot {
  constructor(id, data) {
    this._id = id;
    this._data = data;
  }
  exists() {
    return this._data !== null && this._data !== undefined;
  }
  data() {
    return this._data;
  }
  get id() {
    return this._id;
  }
}

export class QuerySnapshot {
  constructor(docs) {
    this.docs = docs;
    this.size = docs.length;
    this.empty = docs.length === 0;
  }
  forEach(callback) {
    this.docs.forEach(callback);
  }
  map(callback) {
    return this.docs.map(callback);
  }
}

export function collection(dbInstance, path) {
  return { path: path || "candidates" };
}

export function doc(dbInstance, pathOrCollection, id) {
  let colName = "candidates";
  let docId = id;
  if (typeof pathOrCollection === "string") {
    colName = pathOrCollection;
  } else if (pathOrCollection && pathOrCollection.path) {
    colName = pathOrCollection.path;
  }
  return { colName, id: docId };
}

export async function getDocs(queryRef) {
  const colName = queryRef?.path || queryRef?.colName || "candidates";
  const records = await dbGetDocs(colName);
  const docs = records.map(r => new DocumentSnapshot(r.id, r));
  return new QuerySnapshot(docs);
}

export async function getDoc(docRef) {
  const colName = docRef?.colName || "candidates";
  const id = docRef?.id;
  if (!id) return new DocumentSnapshot(null, null);
  const record = await dbGetDoc(colName, id);
  return new DocumentSnapshot(id, record);
}

export async function setDoc(docRef, data, options) {
  const colName = docRef?.colName || "candidates";
  const id = docRef?.id || data?.id || "id_" + Date.now();
  await dbSetDoc(colName, id, data);
  return true;
}

export async function addDoc(colRef, data) {
  const colName = colRef?.path || colRef?.colName || "candidates";
  const res = await dbAddDoc(colName, data);
  return { id: res.id };
}

export async function updateDoc(docRef, data) {
  const colName = docRef?.colName || "candidates";
  const id = docRef?.id;
  if (!id) return true;
  await dbUpdateDoc(colName, id, data);
  return true;
}

export async function deleteDoc(docRef) {
  const colName = docRef?.colName || "candidates";
  const id = docRef?.id;
  if (!id) return true;
  await dbDeleteDoc(colName, id);
  return true;
}

export function query(colRef, ...constraints) {
  return colRef;
}

export function orderBy(field, direction) {
  return { field, direction };
}

export function where(field, op, value) {
  return { field, op, value };
}

export const db = {};
export const auth = {
  currentUser: null,
  onAuthStateChanged: (cb) => {
    try {
      const sessionUser = JSON.parse(localStorage.getItem("cv_portal_supabase_user") || "null");
      cb(sessionUser);
    } catch (e) {
      cb(null);
    }
    return () => {};
  }
};
export const googleProvider = {};

export async function createUserWithEmailAndPassword(authInstance, email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    const userId = "u_" + Math.random().toString(36).substring(2, 10);
    return { user: { uid: userId, email } };
  }
  return { user: data.user || { uid: "u_" + Date.now(), email } };
}

export async function signInWithEmailAndPassword(authInstance, email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { user: data.user };
}

export async function signOut(authInstance) {
  await supabase.auth.signOut();
  return true;
}

export async function signInWithPopup(authInstance, provider) {
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
  if (error) throw error;
  return data;
}

export async function sendPasswordResetEmail(authInstance, email) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
  return data;
}

export const storage = {};
export function ref(storageInstance, path) {
  return { path };
}

export function uploadBytesResumable(storageRef, file) {
  const uploadTask = {
    on: (event, progressCb, errorCb, completeCb) => {
      (async () => {
        try {
          const fileName = `${Date.now()}_${file?.name || 'file'}`;
          const { data, error } = await supabase.storage.from("documents").upload(fileName, file);
          if (error) {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
              uploadTask.snapshot = { downloadURL: reader.result };
              if (completeCb) completeCb();
            };
            reader.onerror = (err) => { if (errorCb) errorCb(err); };
            return;
          }
          const { data: publicUrlData } = supabase.storage.from("documents").getPublicUrl(fileName);
          uploadTask.snapshot = { downloadURL: publicUrlData.publicUrl };
          if (completeCb) completeCb();
        } catch (err) {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => {
            uploadTask.snapshot = { downloadURL: reader.result };
            if (completeCb) completeCb();
          };
        }
      })();
    },
    snapshot: { downloadURL: "" }
  };
  return uploadTask;
}

export async function getDownloadURL(uploadTaskSnapshotOrRef) {
  if (uploadTaskSnapshotOrRef && uploadTaskSnapshotOrRef.downloadURL) {
    return uploadTaskSnapshotOrRef.downloadURL;
  }
  return "";
}
