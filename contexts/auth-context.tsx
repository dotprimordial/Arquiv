"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { getSessionAction, logoutAction } from "@/app/actions/auth-actions";

export interface SupabaseUser {
  id: string;
  email?: string;
  user_metadata: {
    full_name?: string;
    avatar_url?: string;
    [key: string]: unknown;
  };
}

interface AuthContextValue {
  user: SupabaseUser | null;
  isAdmin: boolean;
  isSessionLoading: boolean;
  isAuthModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
  logoutState: "idle" | "loading" | "success";
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [logoutState, setLogoutState] = useState<"idle" | "loading" | "success">("idle");

  const refreshSession = useCallback(async () => {
    try {
      const res = await getSessionAction();
      if (res.success && res.user) {
        setUser(res.user as unknown as SupabaseUser);
        setIsAdmin(res.isAdmin);
      } else {
        setUser(null);
        setIsAdmin(false);
      }
    } catch {
      setUser(null);
      setIsAdmin(false);
    } finally {
      setIsSessionLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
    const safetyTimeout = setTimeout(() => setIsSessionLoading(false), 2000);
    return () => clearTimeout(safetyTimeout);
  }, [refreshSession]);

  const logout = useCallback(async () => {
    if (logoutState === "loading") return;
    setLogoutState("loading");
    try {
      await logoutAction();
      setLogoutState("success");
      setTimeout(() => {
        setUser(null);
        setIsAdmin(false);
        window.location.reload();
      }, 500);
    } catch {
      setLogoutState("idle");
    }
  }, [logoutState]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        isSessionLoading,
        isAuthModalOpen,
        setAuthModalOpen,
        refreshSession,
        logout,
        logoutState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
