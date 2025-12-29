import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  GoogleAuthProvider,
  getIdTokenResult,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "../firebase.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (!user) {
      setIsAdmin(false);
      setAdminLoading(false);
      return () => {
        isMounted = false;
      };
    }

    setAdminLoading(true);
    getIdTokenResult(user)
      .then((tokenResult) => {
        if (!isMounted) return;
        const claims = tokenResult?.claims ?? {};
        setIsAdmin(Boolean(claims.admin || claims.role === "admin"));
      })
      .catch(() => {
        if (isMounted) {
          setIsAdmin(false);
        }
      })
      .finally(() => {
        if (isMounted) {
          setAdminLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAdmin,
      adminLoading,
      signInWithEmail: (email, password) =>
        signInWithEmailAndPassword(auth, email, password),
      signUpWithEmail: (email, password) =>
        createUserWithEmailAndPassword(auth, email, password),
      signInWithGoogle: () =>
        signInWithPopup(auth, new GoogleAuthProvider()),
      resetPassword: (email) => sendPasswordResetEmail(auth, email),
      signOut: () => signOut(auth),
    }),
    [user, loading, isAdmin, adminLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
