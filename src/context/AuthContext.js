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
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const docRef = doc(db, "users", firebaseUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setUserData(docSnap.data());
        } else {
          // AUTO-REPAIR: If user exists in Auth but not in Firestore
          console.log("Auto-repairing missing Firestore profile for:", firebaseUser.email);
          const newProfile = {
            email: firebaseUser.email,
            fullName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
            role: "candidate", // Default role for orphaned accounts
            createdAt: new Date().toISOString(),
            repairedAt: new Date().toISOString(),
          };
          await setDoc(docRef, newProfile);
          setUserData(newProfile);
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const register = async (email, password, fullName, role = "candidate") => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "users", userCredential.user.uid), {
      email,
      fullName,
      role,
      createdAt: new Date().toISOString(),
    });
    return userCredential;
  };

  const login = async (email, password) => {
    return await signInWithEmailAndPassword(auth, email, password);
  };

  const loginWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Check if user exists in Firestore
    const docRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      // Create new user record
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        fullName: user.displayName,
        role: "candidate", // Default role
        createdAt: new Date().toISOString(),
      });
    }
    return result;
  };

  const logout = async () => {
    await signOut(auth);
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
