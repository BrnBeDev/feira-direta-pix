import { createFileRoute, Link } from "@tanstack/react-router";
import { ShoppingBag, Settings, LogOut, PackagePlus, KeyRound, Boxes, ArrowRight } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { AccountNav } from "@/components/AccountNav";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/lib/useAccount";
import { useSignOut } from "@/lib/useSignOut";

export const Route = createFileRoute("/_authenticated/minha-conta")({
  head: () => ({ meta: [
    { title: "Meu painel | Colheita" },
    { name: "description", content: "Sua conta, seus pedidos e sua banca na Colheita." },
    { property: "og:title", content: "Meu painel — Colheita" },
    { property: "og:description", content: "Acompanhe pedidos e gerencie sua banca na feira." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: AccountPage,
});

function AccountPage() {
  const { data, loading, error } = useAccount();
  const { signOut, leaving } = useSignOut();
  const producer = data?.producer ?? false;
  return <PageShell>
    <AccountNav />
    <section className="my-10">
      <p className="text-sm font-semibold text-primary">Minha conta</p>
      <h1 className="mt-2 font-display text-3xl font-bold">{loading ? "Meu painel" : producer ? "Painel do produtor" : "Painel do comprador"}</h1>
      {data?.name && <p className="mt-3 text-muted-foreground">Olá, {data.name}!</p>}
      {loading ? <p className="mt-8 text-muted-foreground">Carregando sua conta…</p> : error ? <p role="alert" className="mt-8 text-destructive">Não foi possível carregar sua conta. Tente novamente.</p> : <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {producer && [
          { section: "produtos", label: "Cadastrar produtos", Icon: PackagePlus },
          { section: "pix", label: "Cadastrar chave PIX", Icon: KeyRound },
          { section: "estoque", label: "Gerenciar produtos e estoque", Icon: Boxes },
          { section: "pedidos", label: "Pedidos recebidos", Icon: ShoppingBag },
        ].map(({ section, label, Icon }) => <Button key={section} asChild variant="outline" className="glass-panel h-auto min-h-32 justify-between whitespace-normal p-6 text-left">
          <Link to="/painel" search={{ secao: section }}><span className="flex flex-col gap-4"><Icon /><span className="font-display font-semibold">{label}</span></span><ArrowRight /></Link>
        </Button>)}
        {!producer && <Button asChild variant="outline" className="glass-panel h-28 justify-between p-6"><Link to="/meus-pedidos"><ShoppingBag />Meus pedidos<ArrowRight /></Link></Button>}
        <Button asChild variant="outline" className="glass-panel h-28 justify-between p-6"><Link to="/configuracoes"><Settings />Configurações<ArrowRight /></Link></Button>
        <Button variant="outline" className="glass-panel h-28 justify-start p-6" onClick={signOut} disabled={leaving}><LogOut />{leaving ? "Saindo…" : "Sair"}</Button>
      </div>}
    </section>
  </PageShell>;
}