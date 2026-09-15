import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/PageShell";
import { ProductCard } from "@/components/ProductCard";

export const Route = createFileRoute("/produtor/$id")({
  head: () => ({
    meta: [
      { title: "Banca do produtor — Colheita" },
      {
        name: "description",
        content: "Veja quem é o produtor, os produtos da banca e pague pela chave PIX dele.",
      },
      { property: "og:title", content: "Banca do produtor — Colheita" },
      {
        property: "og:description",
        content: "Produtos frescos de uma banca da feira, com pagamento direto por PIX.",
      },
    ],
  }),
  component: BancaPage,
  errorComponent: () => (
    <PageShell>
      <p className="mt-16 text-center text-sm text-muted-foreground">
        Não conseguimos abrir esta banca agora.
      </p>
    </PageShell>
  ),
  notFoundComponent: () => (
    <PageShell>
      <p className="mt-16 text-center text-sm text-muted-foreground">Banca não encontrada.</p>
    </PageShell>
  ),
});

function BancaPage() {
  const { id } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["banca", id],
    queryFn: async () => {
      const [banca, produtos] = await Promise.all([
        supabase
          .from("sellers")
          .select("id, stall_name, producer_name, bio, city")
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("products")
          .select("id, name, price_cents, unit, image_url, seller_id")
          .eq("seller_id", id)
          .eq("is_available", true)
          .order("created_at", { ascending: true }),
      ]);
      if (banca.error) throw banca.error;
      if (produtos.error) throw produtos.error;
      return { banca: banca.data, produtos: produtos.data };
    },
  });

  if (isLoading) {
    return (
      <PageShell>
        <div className="glass-panel mt-12 h-40 animate-pulse rounded-3xl" />
      </PageShell>
    );
  }

  if (!data?.banca) {
    return (
      <PageShell>
        <p className="mt-16 text-center text-sm text-muted-foreground">
          Essa banca não está mais na feira.{" "}
          <Link to="/" className="font-semibold text-primary">
            Ver outras bancas
          </Link>
        </p>
      </PageShell>
    );
  }

  const banca = data.banca;

  return (
    <PageShell>
      <section className="glass-panel mt-12 rounded-3xl p-6 shadow-glass sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-mint">Banca da feira</p>
        <h1 className="mt-2 text-4xl font-extrabold">{banca.stall_name}</h1>
        <p className="mt-2 text-base font-semibold text-muted-foreground">
          {banca.producer_name}
          {banca.city ? ` · ${banca.city}` : ""}
        </p>
        {banca.bio && <p className="mt-4 max-w-xl leading-relaxed text-muted-foreground">{banca.bio}</p>}
        <div className="glass-soft mt-6 inline-flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3">
          <span className="text-xs font-medium text-muted-foreground">Pagamento</span>
          <span className="text-sm font-semibold">A chave PIX aparece na hora de finalizar o pedido</span>
        </div>
      </section>

      <section className="mt-10 mb-6">
        <h2 className="text-2xl font-bold">Produtos desta banca</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {data.produtos.map((p) => (
            <ProductCard
              key={p.id}
              product={{
                id: p.id,
                name: p.name,
                priceCents: p.price_cents,
                unit: p.unit,
                imageUrl: p.image_url,
                sellerId: p.seller_id,
                stallName: banca.stall_name,
              }}
            />
          ))}
          {data.produtos.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Esta banca ainda não publicou produtos.
            </p>
          )}
        </div>
      </section>
    </PageShell>
  );
}
