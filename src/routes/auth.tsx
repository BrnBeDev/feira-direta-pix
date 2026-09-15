import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { PageShell } from "@/components/PageShell";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar na Colheita — feira de produtores" },
      {
        name: "description",
        content: "Entre ou crie sua conta para comprar na feira ou abrir sua própria banca.",
      },
      { property: "og:title", content: "Entrar na Colheita" },
      { property: "og:description", content: "Acesse sua conta da feira de produtores." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { next?: string } => ({
    next:
      typeof search["next"] === "string" && search["next"].startsWith("/")
        ? search["next"]
        : undefined,
  }),
  component: AuthPage,
});

function AuthPage() {
  const { next: destinoBruto } = Route.useSearch();
  const next = destinoBruto ?? "/";
  const navigate = useNavigate();
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [confirmeEmail, setConfirmeEmail] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      if (modo === "criar") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) {
          setConfirmeEmail(true);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
      }
      toast.success("Bem-vindo à feira!");
      navigate({ to: next, replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível entrar");
    } finally {
      setEnviando(false);
    }
  }

  async function entrarComGoogle() {
    try {
      window.sessionStorage.setItem("colheita.destino", next);
    } catch {
      /* ignora */
    }
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Não foi possível entrar com o Google");
      return;
    }
    if (result.redirected) return;
    navigate({ to: next, replace: true });
  }

  return (
    <PageShell>
      <div className="mx-auto mt-14 max-w-md">
        <h1 className="text-3xl font-extrabold">
          {modo === "entrar" ? "Entrar na feira" : "Criar minha conta"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Compre dos produtores ou abra a sua própria banca.
        </p>

        <div className="glass-panel mt-6 rounded-3xl p-6 shadow-glass">
          {confirmeEmail ? (
            <div className="text-center">
              <p className="text-4xl">📬</p>
              <p className="mt-3 font-display text-lg font-bold">Confirme seu e-mail</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Enviamos um link para <strong>{email}</strong>. Abra o e-mail e clique no link para
                ativar sua conta.
              </p>
            </div>
          ) : (
            <>
              <button
                onClick={entrarComGoogle}
                className="glass-soft w-full rounded-2xl px-4 py-3.5 text-sm font-semibold text-foreground"
              >
                Continuar com o Google
              </button>

              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-input" />
                ou com e-mail
                <span className="h-px flex-1 bg-input" />
              </div>

              <form onSubmit={enviar} className="space-y-3">
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">E-mail</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@email.com"
                    className="mt-1 w-full rounded-2xl border border-input bg-card px-4 py-3 text-base outline-none focus:border-primary"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Senha</span>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="pelo menos 6 caracteres"
                    className="mt-1 w-full rounded-2xl border border-input bg-card px-4 py-3 text-base outline-none focus:border-primary"
                  />
                </label>
                <button
                  type="submit"
                  disabled={enviando}
                  className="w-full rounded-2xl bg-primary px-4 py-4 text-sm font-bold text-primary-foreground shadow-glass disabled:opacity-60"
                >
                  {modo === "entrar" ? "Entrar" : "Criar conta"}
                </button>
              </form>

              <button
                onClick={() => setModo(modo === "entrar" ? "criar" : "entrar")}
                className="mt-4 w-full text-center text-sm font-medium text-primary"
              >
                {modo === "entrar"
                  ? "Ainda não tenho conta — quero criar"
                  : "Já tenho conta — quero entrar"}
              </button>
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
}
