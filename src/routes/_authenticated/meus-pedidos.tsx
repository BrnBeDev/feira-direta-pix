import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/PageShell";
import { PixBlock } from "@/components/PixBlock";
import { formatBRL } from "@/lib/format";
import { useSession } from "@/lib/useSession";

export const Route = createFileRoute("/_authenticated/meus-pedidos")({
  head: () => ({
    meta: [
      { title: "Meus pedidos na feira | Colheita" },
      {
        name: "description",
        content: "Acompanhe seus pedidos da feira e a chave PIX de cada produtor para pagar.",
      },
      { property: "og:title", content: "Meus pedidos — Colheita" },
      { property: "og:description", content: "Seus pedidos da feira e o pagamento por PIX." },
    ],
  }),
  component: MeusPedidos,
});

function MeusPedidos() {
  const { user } = useSession();

  const { data: pedidos, isLoading } = useQuery({
    queryKey: ["meus-pedidos", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, total_cents, status, payment_method, created_at, sellers(stall_name, pix_key), order_items(product_name, quantity, unit, unit_price_cents)",
        )
        .eq("buyer_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <PageShell>
      <section className="mt-12 mb-10">
        <h1 className="text-4xl font-extrabold">Meus pedidos</h1>
        <p className="mt-2 text-muted-foreground">
          Pague com a chave PIX do produtor e retire na banca dele.
        </p>

        {isLoading && <div className="glass-panel mt-6 h-40 animate-pulse rounded-3xl" />}

        {pedidos && pedidos.length === 0 && (
          <p className="mt-6 text-sm text-muted-foreground">
            Você ainda não fez pedidos.{" "}
            <Link to="/" className="font-semibold text-primary">
              Ver a feira
            </Link>
          </p>
        )}

        <div className="mt-6 space-y-5">
          {pedidos?.map((o) => (
            <div key={o.id} className="grid gap-5 lg:grid-cols-12">
              <div className="glass-panel rounded-3xl p-5 shadow-glass lg:col-span-7">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-display text-lg font-bold">
                    {o.sellers?.stall_name ?? "Banca da feira"}
                  </p>
                  <span className="rounded-full bg-mint/15 px-3 py-1 text-xs font-semibold text-mint">
                    {o.status === "pago"
                      ? "Pagamento confirmado"
                      : o.payment_method === "na_retirada"
                        ? "Você paga na retirada"
                        : "Aguardando pagamento"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(o.created_at).toLocaleString("pt-BR")}
                </p>
                <ul className="mt-4 space-y-2">
                  {o.order_items.map((i, idx) => (
                    <li key={idx} className="flex items-center justify-between text-sm">
                      <span>
                        {i.quantity}× {i.product_name}{" "}
                        <span className="text-muted-foreground">({i.unit})</span>
                      </span>
                      <span className="font-semibold">
                        {formatBRL(i.unit_price_cents * Number(i.quantity))}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="lg:col-span-5">
                <PixBlock
                  stallName={o.sellers?.stall_name ?? "a banca"}
                  pixKey={o.sellers?.pix_key ?? null}
                  totalCents={o.total_cents}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
