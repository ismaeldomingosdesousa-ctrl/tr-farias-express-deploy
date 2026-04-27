import { useState } from "react";
import { Button } from "./ui/button";

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          E-mail
        </label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="w-full border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="admin@trfarias.com"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Senha
        </label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          className="w-full border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="••••••••"
        />
      </div>
      {error && (
        <p className="text-xs text-destructive font-semibold">{error}</p>
      )}
      <Button
        type="submit"
        disabled={loading}
        size="lg"
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold tracking-widest text-lg mt-2"
      >
        {loading ? "ENTRANDO..." : "ENTRAR"}
      </Button>
    </form>
  );
}
