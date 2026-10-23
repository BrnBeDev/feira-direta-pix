import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";

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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { next?: string | undefined } =>
    typeof search["next"] === "string" && search["next"].startsWith("/")
      ? { next: search["next"] }
      : {},
  component: AuthPage,
});

function AuthPage() {
  const { next: destinoBruto } = Route.useSearch();
  const next = destinoBruto ?? "/minha-conta";
  const navigate = useNavigate();
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [papel, setPapel] = useState<"consumidor" | "produtor">("consumidor");
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
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: nome.trim(), role: papel },
          },
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
              <Button
                onClick={entrarComGoogle}
                className="glass-soft w-full rounded-2xl px-4 py-3.5 text-sm font-semibold text-foreground"
              >
                Continuar com o Google
              </Button>

              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-input" />
                ou com e-mail
                <span className="h-px flex-1 bg-input" />
              </div>

              <form onSubmit={enviar} className="space-y-3">
                {modo === "criar" && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          { valor: "consumidor", titulo: "Sou consumidor", desc: "Quero comprar na feira" },
                          { valor: "produtor", titulo: "Sou produtor", desc: "Quero vender na feira" },
                        ] as const
                      ).map((opcao) => (
                        <Button variant="outline" aria-pressed={papel === opcao.valor}
                          key={opcao.valor}
                          type="button"
                          onClick={() => setPapel(opcao.valor)}
                          className={`h-auto flex-col items-start whitespace-normal rounded-2xl border px-3 py-3 text-left transition-colors ${
                            papel === opcao.valor
                              ? "border-primary bg-primary/10"
                              : "border-input bg-card"
                          }`}
                        >
                          <p className="text-sm font-bold">{opcao.titulo}</p>
                          <p className="text-[11px] text-muted-foreground">{opcao.desc}</p>
                        </Button>
                      ))}
                    </div>
                    <label className="block">
                      <span className="text-xs font-medium text-muted-foreground">Seu nome</span>
                      <input
                        type="text"
                        required
                        maxLength={80}
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        placeholder="Como você quer ser chamado"
                        className="mt-1 w-full rounded-2xl border border-input bg-card px-4 py-3 text-base outline-none focus:border-primary"
                      />
                    </label>
                  </>
                )}
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
                <Button
                  type="submit"
                  disabled={enviando}
                  className="w-full rounded-2xl bg-primary px-4 py-4 text-sm font-bold text-primary-foreground shadow-glass disabled:opacity-60"
                >
                  {modo === "entrar" ? "Entrar" : "Criar conta"}
                </Button>
              </form>

              <Button variant="ghost"
                onClick={() => setModo(modo === "entrar" ? "criar" : "entrar")}
                className="mt-4 w-full text-center text-sm font-medium text-primary"
              >
                {modo === "entrar"
                  ? "Ainda não tenho conta — quero criar"
                  : "Já tenho conta — quero entrar"}
              </Button>
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
}
