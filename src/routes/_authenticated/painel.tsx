import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/PageShell";
import { formatBRL, parseBRLToCents } from "@/lib/format";
import { useSession } from "@/lib/useSession";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Minha banca — cadastro de produtos e chave PIX | Colheita" },
      {
        name: "description",
        content:
          "Cadastre sua banca, sua chave PIX e os produtos que você vende na feira, e acompanhe os pedidos recebidos.",
      },
      { property: "og:title", content: "Minha banca — Colheita" },
      {
        property: "og:description",
        content: "Gerencie produtos, chave PIX e pedidos da sua banca na feira.",
      },
    ],
  }),
  component: Painel,
});

const unidades = ["kg", "un", "maço", "dúzia", "300g", "500g", "800g", "1L", "peça"];
const categorias = ["Hortifruti", "Frios & queijos", "Doces", "Panificados", "Bebidas"];
const tiposPix = ["cpf", "cnpj", "email", "telefone", "aleatoria"];

function Painel() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  const { data: banca, isLoading } = useQuery({
    queryKey: ["minha-banca", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sellers")
        .select("id, stall_name, producer_name, bio, city, pix_key, pix_key_type")
        .eq("owner_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: produtos } = useQuery({
    queryKey: ["meus-produtos", banca?.id],
    enabled: !!banca?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price_cents, unit, category, image_url, is_available")
        .eq("seller_id", banca!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: pedidos } = useQuery({
    queryKey: ["pedidos-da-banca", banca?.id],
    enabled: !!banca?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, total_cents, status, payment_method, created_at, order_items(product_name, quantity, unit)",
        )
        .eq("seller_id", banca!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <PageShell>
      <section className="mt-12 mb-10">
        <h1 className="text-4xl font-extrabold">Minha banca</h1>
        <p className="mt-2 text-muted-foreground">
          Seus dados, sua chave PIX e os produtos que aparecem na feira.
        </p>

        {isLoading ? (
          <div className="glass-panel mt-6 h-64 animate-pulse rounded-3xl" />
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <FormBanca
                banca={banca ?? null}
                userId={user?.id ?? ""}
                onSalvo={() => {
                  queryClient.invalidateQueries({ queryKey: ["minha-banca"] });
                  queryClient.invalidateQueries({ queryKey: ["produtos-feira"] });
                }}
              />
            </div>

            <div className="space-y-6 lg:col-span-7">
              {banca ? (
                <>
                  <FormProduto
                    sellerId={banca.id}
                    onSalvo={() => {
                      queryClient.invalidateQueries({ queryKey: ["meus-produtos"] });
                      queryClient.invalidateQueries({ queryKey: ["produtos-feira"] });
                    }}
                  />

                  <div className="glass-panel rounded-3xl p-6 shadow-glass">
                    <h2 className="font-display text-lg font-bold">Meus produtos</h2>
                    <ul className="mt-4 space-y-3">
                      {produtos?.map((p) => (
                        <li
                          key={p.id}
                          className="glass-soft flex flex-wrap items-center gap-3 rounded-2xl p-3"
                        >
                          {p.image_url ? (
                            <img
                              src={p.image_url}
                              alt={p.name}
                              loading="lazy"
                              width={128}
                              height={128}
                              className="size-12 rounded-xl object-cover"
                            />
                          ) : (
                            <div className="grid size-12 place-items-center rounded-xl bg-mist">
                              🧺
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{p.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatBRL(p.price_cents)} · {p.unit} · {p.category}
                            </p>
                          </div>
                          <button
                            onClick={async () => {
                              const { error } = await supabase
                                .from("products")
                                .update({ is_available: !p.is_available })
                                .eq("id", p.id);
                              if (error) {
                                toast.error("Não foi possível atualizar");
                                return;
                              }
                              queryClient.invalidateQueries({ queryKey: ["meus-produtos"] });
                              queryClient.invalidateQueries({ queryKey: ["produtos-feira"] });
                            }}
                            className="glass-soft rounded-full px-3 py-1.5 text-xs font-semibold"
                          >
                            {p.is_available ? "Na feira" : "Escondido"}
                          </button>
                          <button
                            onClick={async () => {
                              const { error } = await supabase
                                .from("products")
                                .delete()
                                .eq("id", p.id);
                              if (error) {
                                toast.error("Não foi possível apagar");
                                return;
                              }
                              toast.success("Produto apagado");
                              queryClient.invalidateQueries({ queryKey: ["meus-produtos"] });
                              queryClient.invalidateQueries({ queryKey: ["produtos-feira"] });
                            }}
                            className="text-xs font-medium text-muted-foreground"
                          >
                            apagar
                          </button>
                        </li>
                      ))}
                      {produtos && produtos.length === 0 && (
                        <li className="text-sm text-muted-foreground">
                          Nenhum produto cadastrado ainda.
                        </li>
                      )}
                    </ul>
                  </div>

                  <div className="glass-panel rounded-3xl p-6 shadow-glass">
                    <h2 className="font-display text-lg font-bold">Pedidos recebidos</h2>
                    <ul className="mt-4 space-y-3">
                      {pedidos?.map((o) => (
                        <li key={o.id} className="glass-soft rounded-2xl p-4">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-semibold">
                              {new Date(o.created_at).toLocaleString("pt-BR")}
                            </span>
                            <span className="font-display font-bold text-primary">
                              {formatBRL(o.total_cents)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {o.order_items
                              .map((i) => `${i.quantity}× ${i.product_name} (${i.unit})`)
                              .join(", ")}
                          </p>
                          <div className="mt-3 flex items-center gap-2">
                            <span className="rounded-full bg-mint/15 px-3 py-1 text-xs font-semibold text-mint">
                              {o.status === "pago" ? "Pagamento confirmado" : "Aguardando pagamento"}
                            </span>
                            {o.status !== "pago" && (
                              <button
                                onClick={async () => {
                                  const { error } = await supabase
                                    .from("orders")
                                    .update({ status: "pago" })
                                    .eq("id", o.id);
                                  if (error) {
                                    toast.error("Não foi possível atualizar");
                                    return;
                                  }
                                  toast.success("Pedido marcado como pago");
                                  queryClient.invalidateQueries({ queryKey: ["pedidos-da-banca"] });
                                }}
                                className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
                              >
                                Recebi o PIX
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                      {pedidos && pedidos.length === 0 && (
                        <li className="text-sm text-muted-foreground">
                          Nenhum pedido ainda. Compartilhe sua banca com os clientes.
                        </li>
                      )}
                    </ul>
                  </div>
                </>
              ) : (
                <div className="glass-soft rounded-3xl p-6 text-sm text-muted-foreground">
                  Preencha os dados da banca ao lado para começar a cadastrar produtos.
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </PageShell>
  );
}

type Banca = {
  id: string;
  stall_name: string;
  producer_name: string;
  bio: string | null;
  city: string | null;
  pix_key: string | null;
  pix_key_type: string | null;
};

function FormBanca({
  banca,
  userId,
  onSalvo,
}: {
  banca: Banca | null;
  userId: string;
  onSalvo: () => void;
}) {
  const [form, setForm] = useState({
    stall_name: "",
    producer_name: "",
    bio: "",
    city: "",
    pix_key: "",
    pix_key_type: "email",
  });
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (banca) {
      setForm({
        stall_name: banca.stall_name,
        producer_name: banca.producer_name,
        bio: banca.bio ?? "",
        city: banca.city ?? "",
        pix_key: banca.pix_key ?? "",
        pix_key_type: banca.pix_key_type ?? "email",
      });
    }
  }, [banca]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      if (banca) {
        const { error } = await supabase.from("sellers").update(form).eq("id", banca.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("sellers").insert({ ...form, owner_id: userId });
        if (error) throw error;
      }
      toast.success("Dados da banca salvos");
      onSalvo();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar");
    } finally {
      setSalvando(false);
    }
  }

  const campo =
    "mt-1 w-full rounded-2xl border border-input bg-card px-4 py-3 text-base outline-none focus:border-primary";

  return (
    <form onSubmit={salvar} className="glass-panel space-y-3 rounded-3xl p-6 shadow-glass">
      <h2 className="font-display text-lg font-bold">Dados da banca</h2>
      <label className="block">
        <span className="text-xs font-medium text-muted-foreground">Nome da banca</span>
        <input
          required
          value={form.stall_name}
          onChange={(e) => setForm({ ...form, stall_name: e.target.value })}
          placeholder="Ex.: Horta da Dona Marta"
          className={campo}
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-muted-foreground">Seu nome</span>
        <input
          required
          value={form.producer_name}
          onChange={(e) => setForm({ ...form, producer_name: e.target.value })}
          placeholder="Ex.: Marta Souza"
          className={campo}
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-muted-foreground">Cidade ou bairro</span>
        <input
          value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
          placeholder="Ex.: Vila Aurora"
          className={campo}
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-muted-foreground">Sobre a sua produção</span>
        <textarea
          rows={3}
          value={form.bio}
          onChange={(e) => setForm({ ...form, bio: e.target.value })}
          placeholder="Conte o que você produz e como cuida da plantação"
          className={campo}
        />
      </label>
      <div className="grid grid-cols-3 gap-3">
        <label className="col-span-2 block">
          <span className="text-xs font-medium text-muted-foreground">Chave PIX</span>
          <input
            value={form.pix_key}
            onChange={(e) => setForm({ ...form, pix_key: e.target.value })}
            placeholder="e-mail, telefone, CPF ou chave aleatória"
            className={campo}
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Tipo</span>
          <select
            value={form.pix_key_type}
            onChange={(e) => setForm({ ...form, pix_key_type: e.target.value })}
            className={campo}
          >
            {tiposPix.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button
        type="submit"
        disabled={salvando}
        className="w-full rounded-2xl bg-primary px-4 py-4 text-base font-bold text-primary-foreground shadow-glass disabled:opacity-60"
      >
        {banca ? "Salvar alterações" : "Criar minha banca"}
      </button>
    </form>
  );
}

function FormProduto({ sellerId, onSalvo }: { sellerId: string; onSalvo: () => void }) {
  const [form, setForm] = useState({
    name: "",
    price: "",
    unit: "kg",
    category: "Hortifruti",
    image_url: "",
    description: "",
  });
  const [salvando, setSalvando] = useState(false);

  const campo =
    "mt-1 w-full rounded-2xl border border-input bg-card px-4 py-3 text-base outline-none focus:border-primary";

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const cents = parseBRLToCents(form.price);
    if (cents === null) {
      toast.error("Informe um preço válido, como 12,90");
      return;
    }
    setSalvando(true);
    try {
      const { error } = await supabase.from("products").insert({
        seller_id: sellerId,
        name: form.name,
        description: form.description || null,
        price_cents: cents,
        unit: form.unit,
        category: form.category,
        image_url: form.image_url || null,
      });
      if (error) throw error;
      toast.success("Produto publicado na feira");
      setForm({ ...form, name: "", price: "", image_url: "", description: "" });
      onSalvo();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível publicar");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={salvar} className="glass-panel space-y-3 rounded-3xl p-6 shadow-glass">
      <h2 className="font-display text-lg font-bold">Cadastrar produto</h2>
      <label className="block">
        <span className="text-xs font-medium text-muted-foreground">Nome do produto</span>
        <input
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Ex.: Cebola roxa"
          className={campo}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Preço</span>
          <input
            required
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            placeholder="12,90"
            className={campo}
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Unidade</span>
          <select
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
            className={campo}
          >
            {unidades.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Categoria</span>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className={campo}
          >
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block">
        <span className="text-xs font-medium text-muted-foreground">Link da foto (opcional)</span>
        <input
          value={form.image_url}
          onChange={(e) => setForm({ ...form, image_url: e.target.value })}
          placeholder="https://..."
          className={campo}
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-muted-foreground">Descrição (opcional)</span>
        <input
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Colhido hoje, sem agrotóxicos"
          className={campo}
        />
      </label>
      <button
        type="submit"
        disabled={salvando}
        className="w-full rounded-2xl bg-primary-deep px-4 py-4 text-base font-bold text-primary-foreground disabled:opacity-60"
      >
        Publicar na feira
      </button>
    </form>
  );
}
