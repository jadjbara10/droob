"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   دروب Droob — Auth Context & Provider
   ═══════════════════════════════════════════════════════════════════════════ */

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authApi, setAuthToken, clearAuthToken, getAuthToken, ApiRequestError } from "./api";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface DashboardUser {
  id: string;
  email: string;
  phone: string | null;
  name: string;
  role: string;
  preferredLang: string;
  created_at: string;
}

interface AuthContextType {
  user: DashboardUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const ALLOWED_ROLES = ["super_admin", "admin", "editor", "operator"];

export function isAllowedRole(role: string): boolean {
  return ALLOWED_ROLES.includes(role);
}

export function isSuperAdmin(role: string): boolean {
  return role === "super_admin";
}

// ─── Context ───────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshAuth = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      setAuthToken(token);
      const profile = await authApi.getProfile();
      if (!isAllowedRole(profile.role)) {
        clearAuthToken();
        setUser(null);
        setError("صلاحيات غير كافية. هذا القسم مخصص للمشرفين والمحررين فقط.");
        setIsLoading(false);
        return;
      }
      setUser(profile);
      setError(null);
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 401) {
        clearAuthToken();
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const result = await authApi.login(email, password);
      if (!isAllowedRole(result.user.role)) {
        throw new ApiRequestError(403, "Forbidden", "صلاحيات غير كافية. هذا القسم مخصص للمشرفين والمحررين فقط.");
      }
      setAuthToken(result.accessToken);
      // Also store refresh token
      if (typeof window !== "undefined") {
        localStorage.setItem("droob_refresh", result.refreshToken);
      }
      const profile = await authApi.getProfile();
      setUser(profile);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("فشل تسجيل الدخول");
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    clearAuthToken();
    if (typeof window !== "undefined") {
      localStorage.removeItem("droob_refresh");
    }
    setUser(null);
    setError(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        error,
        login,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
