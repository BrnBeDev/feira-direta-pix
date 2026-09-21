import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/PageShell";
import { ProductCard } from "@/components/ProductCard";
import { useCart } from "@/lib/cart";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Colheita — feira de produtores com pagamento PIX" },
      {
        name: "description",
        content:
          "Veja as bancas da feira, escolha produtos frescos e pague direto na chave PIX do produtor.",
      },
      { property: "og:title", content: "Colheita — da horta para a sua mesa" },
      {
        property: "og:description",
        content: "Bancas da feira, produtos do dia e pagamento direto por PIX.",
      },
    ],
  }),
  component: Index,
});

const categorias = ["Hortifruti", "Peixes", "Doces", "Bebidas", "Artesanato"];

function Index() {
  const { totalCents, count, items } = useCart();

  const { data: produtos, isLoading } = useQuery({
    queryKey: ["produtos-feira"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price_cents, unit, image_url, category, seller_id, sellers(stall_name)")
        .eq("is_available", true)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: bancas } = useQuery({
    queryKey: ["bancas-total"],
    queryFn: async () => {
      const { count: total, error } = await supabase
        .from("sellers")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      return total ?? 0;
    },
  });

  const primeiraBanca = items[0]?.stallName ?? null;

  return (
    <PageShell>
      <section className="mt-12 grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <span className="glass-soft inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold text-primary-deep">
            <span className="size-1.5 rounded-full bg-mint" />
            {bancas ?? 0} bancas na feira de hoje
          </span>
          <h1 className="mt-5 text-5xl font-extrabold leading-[1.02] sm:text-6xl">
            Da horta
            <br />
            para a sua mesa.
            <br />
            <span className="text-primary">Direto pelo app.</span>
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-muted-foreground">
            Conheça o produtor, veja o produto e pague na hora com a chave PIX dele. Sem
            intermediário, no seu ritmo.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a
              href="#feira"
              className="rounded-full bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-glass"
            >
              Explorar produtos
            </a>
            <Link
              to="/painel"
              className="glass-soft rounded-full px-6 py-3.5 text-sm font-semibold text-foreground"
            >
              Sou produtor
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            {categorias.map((c) => (
              <span
                key={c}
                className="glass-soft rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground"
              >
                {c}
              </span>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="glass-panel relative rounded-3xl p-6 shadow-glass">
            <span className="absolute -top-3 left-6 rounded-full bg-mint px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-mint-foreground">
              Pagamento rápido
            </span>
            <p className="text-sm font-semibold text-muted-foreground">Pagamento via PIX</p>
            <p className="mt-1 font-display text-lg font-bold">Recebido em instantes</p>
            <div className="glass-soft mt-5 flex items-center gap-4 rounded-2xl p-4">
              <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-primary/10 text-xl">
                🧺
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">
                  {primeiraBanca ? "Banca escolhida" : "Seu pedido"}
                </p>
                <p className="truncate text-sm font-semibold">
                  {primeiraBanca ?? "Nenhum item ainda"}
                </p>
              </div>
              <span className="ml-auto shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">
                {count} {count === 1 ? "item" : "itens"}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="glass-soft rounded-2xl p-4">
                <p className="font-display text-2xl font-extrabold text-primary">
                  {formatBRL(totalCents)}
                </p>
                <p className="text-xs text-muted-foreground">Total do pedido</p>
              </div>
              <Link
                to="/pedido"
                className="grid place-items-center rounded-2xl bg-primary-deep p-4 text-center"
              >
                <p className="text-sm font-bold text-primary-foreground">Pagar agora</p>
                <p className="text-[10px] text-primary-foreground/70">PIX do produtor</p>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="feira" className="mt-14 scroll-mt-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Feira em destaque</h2>
            <p className="text-sm text-muted-foreground">Produtos frescos de quem você conhece</p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading &&
            [0, 1, 2, 3].map((i) => (
              <div key={i} className="glass-panel h-80 animate-pulse rounded-3xl" />
            ))}
          {produtos?.map((p) => (
            <ProductCard
              key={p.id}
              product={{
                id: p.id,
                name: p.name,
                priceCents: p.price_cents,
                unit: p.unit,
                imageUrl: p.image_url,
                sellerId: p.seller_id,
                stallName: p.sellers?.stall_name ?? "Banca da feira",
              }}
            />
          ))}
          {produtos && produtos.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum produto na feira ainda. Cadastre o primeiro na sua banca.
            </p>
          )}
        </div>
      </section>

      <section className="mt-14 mb-4">
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="glass-soft rounded-3xl p-6">
            <div className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-lg">
              👤
            </div>
            <h3 className="mt-4 text-base font-bold">Perfil do produtor</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Cada vendedor cria sua página com nome, história e os produtos da casa.
            </p>
          </div>
          <div className="glass-soft rounded-3xl p-6">
            <div className="grid size-11 place-items-center rounded-2xl bg-mint/10 text-lg">🧺</div>
            <h3 className="mt-4 text-base font-bold">Cadastro de produtos</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Adicione itens com foto, preço e unidade em poucos toques.
            </p>
          </div>
          <div className="glass-soft rounded-3xl p-6">
            <div className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-lg">
              💸
            </div>
            <h3 className="mt-4 text-base font-bold">Chave PIX própria</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Cadastre sua chave e receba o pagamento direto, sem taxa.
            </p>
          </div>
        </div>
        <p className="mt-10 text-center text-xs text-muted-foreground">
          Colheita · feira de produtores · interface pensada para todos
        </p>
      </section>
    </PageShell>
  );
}
