import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Não foi possível entrar. Verifique seus dados.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper dark:bg-ink px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="font-display text-3xl text-ink dark:text-paper">Fingest</h1>
          <p className="mt-2 text-sm text-olive">Sua vida financeira, organizada.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink dark:text-paper mb-1.5" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-card border border-paper-border dark:border-ink-border bg-paper-soft dark:bg-ink-soft px-4 py-2.5 text-ink dark:text-paper outline-none focus:ring-2 focus:ring-emerald transition"
              placeholder="voce@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink dark:text-paper mb-1.5" htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-card border border-paper-border dark:border-ink-border bg-paper-soft dark:bg-ink-soft px-4 py-2.5 text-ink dark:text-paper outline-none focus:ring-2 focus:ring-emerald transition"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-clay bg-clay/10 rounded-card px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-card bg-emerald hover:bg-emerald-deep text-white font-medium py-2.5 transition disabled:opacity-60"
          >
            {isSubmitting ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-olive">
          Ainda não tem conta?{" "}
          <Link to="/register" className="text-emerald font-medium hover:underline">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}
