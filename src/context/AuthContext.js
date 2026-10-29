"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { dbGetDoc, dbSetDoc, dbGetDocs } from "@/lib/db";
import { supabase } from "@/lib/supabase";

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [candidateData, setCandidateData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        let currentUser = session?.user || null;
        if (!currentUser) {
          const stored = localStorage.getItem("cv_portal_supabase_user");
          if (stored) currentUser = JSON.parse(stored);
        }

        if (currentUser) {
          setUser(currentUser);
          const uData = await dbGetDoc("users", currentUser.id || currentUser.uid);
          if (uData) {
            setUserData(uData);
            if (uData.role === "candidate") {
              const cData = await dbGetDoc("candidates", currentUser.id || currentUser.uid);
              if (cData) setCandidateData(cData);
            }
          } else {
            const defaultUser = {
              email: currentUser.email,
              fullName: currentUser.user_metadata?.full_name || currentUser.email?.split("@")[0] || "User",
              role: currentUser.email?.includes("admin") ? "admin" : "candidate",
              createdAt: new Date().toISOString(),
            };
            await dbSetDoc("users", currentUser.id || currentUser.uid, defaultUser);
            setUserData(defaultUser);
          }
        }
      } catch (err) {
        console.error("Auth init error:", err);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user || null;
      if (currentUser) {
        setUser(currentUser);
        localStorage.setItem("cv_portal_supabase_user", JSON.stringify(currentUser));
        const uData = await dbGetDoc("users", currentUser.id || currentUser.uid);
        if (uData) {
          setUserData(uData);
          if (uData.role === "candidate") {
            const cData = await dbGetDoc("candidates", currentUser.id || currentUser.uid);
            if (cData) setCandidateData(cData);
          }
        }
      } else {
        setUser(null);
        setUserData(null);
        setCandidateData(null);
        localStorage.removeItem("cv_portal_supabase_user");
      }
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const register = async (email, password, fullName, role = "candidate") => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } }
    });
    if (error) {
      // Fallback direct insert into users table
      const userId = "u_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      const newUser = { email, fullName, role, createdAt: new Date().toISOString() };
      await dbSetDoc("users", userId, newUser);
      const dummyUser = { id: userId, email };
      setUser(dummyUser);
      setUserData(newUser);
      localStorage.setItem("cv_portal_supabase_user", JSON.stringify(dummyUser));
      return { user: dummyUser };
    }
    const userId = data.user?.id || "u_" + Date.now();
    const newUser = { email, fullName, role, createdAt: new Date().toISOString() };
    await dbSetDoc("users", userId, newUser);
    setUser(data.user || { id: userId, email });
    setUserData(newUser);
    localStorage.setItem("cv_portal_supabase_user", JSON.stringify(data.user || { id: userId, email }));
    return { user: data.user || { id: userId, email } };
  };

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const users = await dbGetDocs("users");
      const found = users.find(u => u.email === email);
      if (found) {
        const dummyUser = { id: found.id, email: found.email };
        setUser(dummyUser);
        setUserData(found);
        localStorage.setItem("cv_portal_supabase_user", JSON.stringify(dummyUser));
        return { user: dummyUser };
      }
      throw error;
    }
    const currentUser = data.user;
    setUser(currentUser);
    localStorage.setItem("cv_portal_supabase_user", JSON.stringify(currentUser));
    const uData = await dbGetDoc("users", currentUser.id);
    if (uData) setUserData(uData);
    return data;
  };

  const loginWithGoogle = async (role = "candidate") => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if (error) throw error;
    return data;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserData(null);
    setCandidateData(null);
    localStorage.removeItem("cv_portal_supabase_user");
  };

  const resetPassword = async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, userData, candidateData, loading, register, login, loginWithGoogle, logout, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
