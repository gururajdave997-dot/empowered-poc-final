import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const r = login(email, password);
    if (r.ok) navigate("/");
    else setError(r.error || "Login failed");
  };

  const allowed = (import.meta.env.VITE_ALLOWED_EMAILS || "").split(",").filter(Boolean);

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:flex flex-col justify-center bg-brand-dark text-white p-12">
        <div className="text-4xl font-bold mb-2">EmpowerED</div>
        <div className="text-lg text-white/80 mb-6">AI-Powered Internal Resource Management</div>
        <p className="text-white/60 max-w-sm text-sm leading-relaxed">
          Find available talent, analyze skills, track allocation and make staffing decisions —
          all from your Skill Management Report and Time Sheet.
        </p>
      </div>
      <div className="flex items-center justify-center p-8 bg-slate-50">
        <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 text-brand mb-4"><Sparkles size={20} /><span className="font-semibold">Sign in</span></div>
          <label className="text-sm text-slate-600">User ID (email)</label>
          <Input className="mt-1 mb-3" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" autoFocus />
          <label className="text-sm text-slate-600">Password</label>
          <Input className="mt-1 mb-4" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="(optional in POC)" />
          {error && <div className="text-sm text-red-600 mb-3">{error}</div>}
          <Button type="submit" className="w-full">Sign in</Button>
          <div className="mt-4 text-xs text-slate-400">
            Demo accounts (from .env): {allowed.slice(0, 5).join(", ") || "set VITE_ALLOWED_EMAILS"}
          </div>
        </form>
      </div>
    </div>
  );
}
