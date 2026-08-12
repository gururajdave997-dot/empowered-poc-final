import React, { createContext, useContext, useEffect, useState } from "react";
import type { Role } from "./types";
import { supabase, supabaseEnabled } from "./supabase";

interface Profile { email: string; role: Role; }
interface AuthCtx {
  user: Profile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
}
const Ctx = createContext<AuthCtx>(null as any);

const ACCESS_DENIED = "Access Denied. Please contact the administrator.";
const SESSION_KEY = "empowered_session";

function allowedUsers(): string[] {
  return (import.meta.env.VITE_ALLOWED_USERS || "")
    .split(",").map((s: string) => s.trim().toLowerCase()).filter(Boolean);
}
function roleFor(email: string): Role {
  const raw = (import.meta.env.VITE_USER_ROLES || "").trim();
  const map: Record<string, Role> = {};
  raw.split(",").forEach((p: string) => { const [e, r] = p.split(":").map((x) => x.trim()); if (e && r) map[e.toLowerCase()] = r as Role; });
  return map[email.toLowerCase()] || "Viewer";
}
const isAllowed = (email: string) => allowedUsers().includes(email.trim().toLowerCase());
const sharedPassword = () => (import.meta.env.VITE_APP_PASSWORD || "").toString();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Profile;
        if (isAllowed(p.email)) setUser(p);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const login: AuthCtx["login"] = async (email, password) => {
    const e = email.trim().toLowerCase();
    if (!e || !password) return { ok: false, error: "Please enter your email and password." };
    if (!isAllowed(e)) return { ok: false, error: ACCESS_DENIED };
    const shared = sharedPassword();
    if (!shared) return { ok: false, error: "Sign-in is not configured. Please contact the administrator." };
    if (password !== shared) return { ok: false, error: "Incorrect password. Please try again." };
    const profile: Profile = { email: e, role: roleFor(e) };
    setUser(profile);
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(profile)); } catch { /* ignore */ }
    if (supabaseEnabled && supabase) {
      try { await supabase.from("audit_logs").insert({ actor_email: e, action: "login", detail: "shared_password" }); } catch { /* ignore */ }
    }
    return { ok: true };
  };

  const logout: AuthCtx["logout"] = async () => {
    try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
    setUser(null);
  };

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
export { ACCESS_DENIED };
