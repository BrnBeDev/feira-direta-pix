import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { AccountNav } from "@/components/AccountNav";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/lib/useAccount";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({ meta: [
    { title: "Configurações da conta | Colheita" },
    { name: "description", content: "Atualize seu nome e consulte os dados da sua conta na Colheita." },
    { property: "og:title", content: "Configurações — Colheita" },
    { property: "og:description", content: "Gerencie seus dados pessoais na feira Colheita." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, data, loading, error } = useAccount();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (data) setName(data.name); }, [data]);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !name.trim()) return;
    setSaving(true);
    try {
      const { error: saveError } = await supabase.from("profiles").upsert({ id: user.id, display_name: name.trim() });
      if (saveError) throw saveError;
      await queryClient.invalidateQueries({ queryKey: ["account", user.id] });
      toast.success("Configurações salvas");
    } catch { toast.error("Não foi possível salvar suas configurações."); }
    finally { setSaving(false); }
  }
  const field = "mt-2 w-full rounded-xl border border-input bg-card px-4 py-3 outline-none focus:border-primary";
  return <PageShell><AccountNav /><section className="my-10 max-w-xl">
    <h1 className="font-display text-3xl font-bold">Configurações</h1>
    {loading ? <p className="mt-6">Carregando…</p> : error ? <p role="alert" className="mt-6 text-destructive">Não foi possível carregar seus dados.</p> : <form onSubmit={save} className="mt-8 space-y-5">
      <label className="block font-medium">Seu nome<input className={field} required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" /></label>
      <label className="block font-medium">E-mail<input className={field} readOnly value={user?.email ?? ""} type="email" /></label>
      <p className="text-sm text-muted-foreground">Tipo de conta: {data?.producer ? "Produtor" : "Comprador"}</p>
      <Button type="submit" disabled={saving || !name.trim()}><Save />{saving ? "Salvando…" : "Salvar configurações"}</Button>
    </form>}
  </section></PageShell>;
}