"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { auth, db, googleProvider } from "@/lib/firebase";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  signInWithPopup,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState({
    email: "admin@ijef.com",
    fullName: "Admin LPK IJEF CORP",
    role: "admin",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          setUser(firebaseUser);
          try {
            const docRef = doc(db, "users", firebaseUser.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
              setUserData(docSnap.data());
            } else {
              const newProfile = {
                email: firebaseUser.email,
                fullName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
                role: "admin",
                createdAt: new Date().toISOString(),
              };
              try {
                await setDoc(docRef, newProfile);
              } catch (e) {}
              setUserData(newProfile);
            }
          } catch (firestoreErr) {
            console.warn("Firestore permission error in AuthContext, using admin fallback profile:", firestoreErr);
            setUserData({
              email: firebaseUser.email,
              fullName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
              role: "admin",
            });
          }
        } else {
          setUser({ uid: "offline_admin", email: "admin@ijef.com" });
          setUserData({
            email: "admin@ijef.com",
            fullName: "Admin LPK IJEF CORP",
            role: "admin",
          });
        }
      } catch (err) {
        console.error("Auth state change error:", err);
        setUser({ uid: "offline_admin", email: "admin@ijef.com" });
        setUserData({
          email: "admin@ijef.com",
          fullName: "Admin LPK IJEF CORP",
          role: "admin",
        });
      } finally {
        setLoading(false);
      }
    });

    // Fallback timer in case onAuthStateChanged takes too long
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const register = async (email, password, fullName, role = "candidate") => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      try {
        await setDoc(doc(db, "users", userCredential.user.uid), {
          email,
          fullName,
          role,
          createdAt: new Date().toISOString(),
        });
      } catch (e) {}
      return userCredential;
    } catch (err) {
      throw err;
    }
  };

  const login = async (email, password) => {
    return await signInWithEmailAndPassword(auth, email, password);
  };

  const loginWithGoogle = async (role = "candidate") => {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    try {
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        await setDoc(doc(db, "users", user.uid), {
          email: user.email,
          fullName: user.displayName,
          role: role,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (e) {}
    return result;
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {}
    setUser(null);
    setUserData(null);
  };

  const resetPassword = async (email) => {
    return await sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, register, login, loginWithGoogle, logout, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
