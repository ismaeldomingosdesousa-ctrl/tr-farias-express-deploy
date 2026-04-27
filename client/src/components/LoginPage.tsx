import { useState } from "react";
import { Button } from "./ui/button";
import { Logo } from "./Logo";
import { Lock, Mail, AlertCircle } from "lucide-react";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Erro ao fazer login");
      } else {
        window.location.reload();
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen hero-gradient px-4">
      <div className="w-full max-w-sm animate-fade-in">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Logo size="lg" layout="stacked" />
          <p className="text-muted-foreground text-sm mt-3">
            Sistema de Gestão Logística
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-7 shadow-[0_0_40px_rgba(124,58,237,0.1)]">
          <h2 className="text-lg font-bold text-white tracking-tight mb-1">
            Acesse sua conta
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            Entre com seu e-mail e senha
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="admin@trfarias.com"
                  className="w-full rounded-xl border border-border bg-secondary pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-border bg-secondary pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 transition-all"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p className="text-xs font-medium">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              size="lg"
              className="w-full mt-1"
            >
              {loading ? "Entrando..." : "Entrar no Sistema"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
