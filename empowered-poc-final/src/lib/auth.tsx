import React, { createContext, useContext, useEffect, useState } from "react";
import type { Role } from "./types";

interface AuthState { email: string; role: Role; }
interface AuthCtx {
  user: AuthState | null;
  login: (email: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;
}

const Ctx = createContext<AuthCtx>(null as any);

function parseAllowed(): string[] {
  return (import.meta.env.VITE_ALLOWED_EMAILS || "")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
}
function parseRoles(): Record<string, Role> {
  const map: Record<string, Role> = {};
  (import.meta.env.VITE_USER_ROLES || "").split(",").forEach((pair) => {
    const [email, role] = pair.split(":").map((s) => s.trim());
    if (email && role) map[email.toLowerCase()] = role as Role;
  });
  return map;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthState | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("empowered_user");
    if (raw) setUser(JSON.parse(raw));
  }, []);

  const login: AuthCtx["login"] = (email, password) => {
    const e = email.trim().toLowerCase();
    const allowed = parseAllowed();
    const sharedPw = import.meta.env.VITE_SHARED_PASSWORD || "";
    if (!allowed.includes(e)) return { ok: false, error: "Email not authorized. Add it to VITE_ALLOWED_EMAILS." };
    if (sharedPw && password !== sharedPw) return { ok: false, error: "Incorrect password." };
    const role = parseRoles()[e] || "Viewer";
    const state = { email: e, role };
    setUser(state);
    sessionStorage.setItem("empowered_user", JSON.stringify(state));
    return { ok: true };
  };

  const logout = () => { setUser(null); sessionStorage.removeItem("empowered_user"); };

  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
