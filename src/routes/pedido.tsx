import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/PageShell";
import { PixBlock } from "@/components/PixBlock";
import { useCart } from "@/lib/cart";
import { useSession } from "@/lib/useSession";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/pedido")({
  head: () => ({
    meta: [
      { title: "Meu pedido — pagar por PIX | Colheita" },
      {
        name: "description",
        content: "Confira os itens do seu pedido e pague direto na chave PIX de cada produtor.",
      },
      { property: "og:title", content: "Meu pedido — Colheita" },
      { property: "og:description", content: "Feche o pedido da feira e pague por PIX." },
    ],
  }),
  component: PedidoPage,
});

type Pagamento = "pix" | "na_retirada";

type Confirmado = { sellerId: string; stallName: string; totalCents: number; pixKey: string | null };

function PedidoPage() {
  const { items, totalCents, setQuantity, remove, clear } = useCart();
  const { user } = useSession();
  const [confirmados, setConfirmados] = useState<Confirmado[] | null>(null);
  const [pagamento, setPagamento] = useState<Pagamento>("pix");
  const [pagamentoFeito, setPagamentoFeito] = useState<Pagamento>("pix");
  const [enviando, setEnviando] = useState(false);

  const sellerIds = [...new Set(items.map((i) => i.sellerId))];

  const { data: bancas } = useQuery({
    queryKey: ["bancas-do-pedido", sellerIds.join(",")],
    enabled: sellerIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sellers")
        .select("id, stall_name, pix_key")
        .in("id", sellerIds);
      if (error) throw error;
      return data;
    },
  });

  const grupos = sellerIds.map((sellerId) => {
    const doGrupo = items.filter((i) => i.sellerId === sellerId);
    const banca = bancas?.find((b) => b.id === sellerId);
    return {
      sellerId,
      stallName: doGrupo[0]?.stallName ?? banca?.stall_name ?? "Banca",
      pixKey: banca?.pix_key ?? null,
      items: doGrupo,
      totalCents: doGrupo.reduce((s, i) => s + i.priceCents * i.quantity, 0),
    };
  });

  async function confirmar() {
    if (!user) return;
    setEnviando(true);
    try {
      const criados: Confirmado[] = [];
      for (const grupo of grupos) {
        const { data: pedido, error } = await supabase
          .from("orders")
          .insert({
            buyer_id: user.id,
            seller_id: grupo.sellerId,
            total_cents: grupo.totalCents,
            payment_method: pagamento,
          })
          .select("id")
          .single();
        if (error) throw error;

        const { error: itemsError } = await supabase.from("order_items").insert(
          grupo.items.map((i) => ({
            order_id: pedido.id,
            product_id: i.productId,
            product_name: i.name,
            unit: i.unit,
            unit_price_cents: i.priceCents,
            quantity: i.quantity,
          })),
        );
        if (itemsError) throw itemsError;

        criados.push({
          sellerId: grupo.sellerId,
          stallName: grupo.stallName,
          totalCents: grupo.totalCents,
          pixKey: grupo.pixKey,
        });
      }
      setConfirmados(criados);
      clear();
      toast.success("Pedido enviado ao produtor");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível fechar o pedido");
    } finally {
      setEnviando(false);
    }
  }

  if (confirmados) {
    return (
      <PageShell>
        <section className="mt-12">
          <h1 className="text-4xl font-extrabold">Agora é só pagar</h1>
          <p className="mt-2 text-muted-foreground">
            Copie a chave PIX de cada banca e envie o valor. O produtor recebe na hora.
          </p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {confirmados.map((c) => (
              <PixBlock
                key={c.sellerId}
                stallName={c.stallName}
                pixKey={c.pixKey}
                totalCents={c.totalCents}
              />
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/meus-pedidos"
              className="rounded-full bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground"
            >
              Ver meus pedidos
            </Link>
            <Link to="/" className="glass-soft rounded-full px-6 py-3.5 text-sm font-semibold">
              Voltar à feira
            </Link>
          </div>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <section className="mt-12 mb-8">
        <h1 className="text-4xl font-extrabold">Meu pedido</h1>
        <p className="mt-2 text-muted-foreground">
          {items.length === 0
            ? "Seu pedido está vazio."
            : "Confira as quantidades e finalize com o PIX de cada banca."}
        </p>

        {items.length === 0 ? (
          <Link
            to="/"
            className="mt-6 inline-block rounded-full bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground"
          >
            Escolher produtos
          </Link>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-12">
            <div className="space-y-5 lg:col-span-8">
              {grupos.map((grupo) => (
                <div key={grupo.sellerId} className="glass-panel rounded-3xl p-5 shadow-glass">
                  <div className="flex items-center justify-between gap-3">
                    <Link
                      to="/produtor/$id"
                      params={{ id: grupo.sellerId }}
                      className="font-display text-lg font-bold"
                    >
                      {grupo.stallName}
                    </Link>
                    <span className="font-display font-bold text-primary">
                      {formatBRL(grupo.totalCents)}
                    </span>
                  </div>

                  <ul className="mt-4 space-y-3">
                    {grupo.items.map((i) => (
                      <li key={i.productId} className="glass-soft flex items-center gap-3 rounded-2xl p-3">
                        {i.imageUrl ? (
                          <img
                            src={i.imageUrl}
                            alt={i.name}
                            loading="lazy"
                            width={128}
                            height={128}
                            className="size-14 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="grid size-14 place-items-center rounded-xl bg-mist">🧺</div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{i.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatBRL(i.priceCents)} · {i.unit}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setQuantity(i.productId, i.quantity - 1)}
                            className="glass-soft grid size-9 place-items-center rounded-full text-lg font-bold"
                            aria-label={`Diminuir ${i.name}`}
                          >
                            −
                          </button>
                          <span className="w-6 text-center text-sm font-bold">{i.quantity}</span>
                          <button
                            onClick={() => setQuantity(i.productId, i.quantity + 1)}
                            className="grid size-9 place-items-center rounded-full bg-primary text-lg font-bold text-primary-foreground"
                            aria-label={`Aumentar ${i.name}`}
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => remove(i.productId)}
                          className="text-xs font-medium text-muted-foreground"
                        >
                          tirar
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="lg:col-span-4">
              <div className="glass-panel rounded-3xl p-6 shadow-glass">
                <p className="text-sm font-semibold text-muted-foreground">Total do pedido</p>
                <p className="mt-1 font-display text-4xl font-extrabold text-primary">
                  {formatBRL(totalCents)}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  O pagamento é feito por PIX, direto para cada produtor.
                </p>

                {user ? (
                  <button
                    onClick={confirmar}
                    disabled={enviando}
                    className="mt-5 w-full rounded-2xl bg-primary px-4 py-4 text-base font-bold text-primary-foreground shadow-glass disabled:opacity-60"
                  >
                    {enviando ? "Enviando..." : "Confirmar e pagar com PIX"}
                  </button>
                ) : (
                  <Link
                    to="/auth"
                    search={{ next: "/pedido" }}
                    className="mt-5 block w-full rounded-2xl bg-primary px-4 py-4 text-center text-base font-bold text-primary-foreground shadow-glass"
                  >
                    Entrar para finalizar
                  </Link>
                )}

                <button
                  onClick={clear}
                  className="mt-3 w-full text-center text-xs font-medium text-muted-foreground"
                >
                  Esvaziar pedido
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </PageShell>
  );
}
