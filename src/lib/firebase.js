import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBPL7vthHw3FSMOu_R-b88y4WwbYoJAo3A",
  authDomain: "simantap-ijef.firebaseapp.com",
  projectId: "simantap-ijef",
  storageBucket: "simantap-ijef.firebasestorage.app",
  messagingSenderId: "770616748921",
  appId: "1:770616748921:web:a1f198f006d95f8f589da8"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, storage, googleProvider, firebaseConfig };
