import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/PageShell";
import { formatBRL, parseBRLToCents } from "@/lib/format";
import { useSession } from "@/lib/useSession";
import { AccountNav } from "@/components/AccountNav";
import { Button } from "@/components/ui/button";
import { StockEditor } from "@/components/StockEditor";
import { validStock } from "@/lib/account-rules";
import { useAccount } from "@/lib/useAccount";
import { StoredImage } from "@/components/StoredImage";
import { nextOrderStatus, orderStatusLabel, validUpload, uploadExtension } from "@/lib/order-rules";
import { MessageCircle, Check, Upload } from "lucide-react";

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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { secao: string } => ({
    secao: ["produtos", "pix", "estoque", "pedidos"].includes(String(search["secao"])) ? String(search["secao"]) : "produtos",
  }),
  component: Painel,
});

const unidades = ["kg", "un", "maço", "dúzia", "300g", "500g", "700ml", "800g", "1L", "peça"];
const categorias = ["Hortifruti", "Peixes", "Frios & queijos", "Doces", "Panificados", "Bebidas", "Artesanato"];
const tiposPix = ["cpf", "cnpj", "email", "telefone", "aleatoria"];

function Painel() {
  const { user, data: account, loading: accountLoading } = useAccount();
  const queryClient = useQueryClient();
  const { secao } = Route.useSearch();
  const navigate = Route.useNavigate();

  const { data: banca, isLoading } = useQuery({
    queryKey: ["minha-banca", user?.id],
    enabled: !!user && !!account?.producer,
    queryFn: async () => {
      if (!user) throw new Error("Entre na sua conta.");
      const { data, error } = await supabase
        .from("sellers")
        .select("id, stall_name, producer_name, bio, city")
        .eq("owner_id", user.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const { data: pix, error: pixError } = await supabase.rpc("get_seller_pix", {
        _seller_id: data.id,
      });
      if (pixError) throw pixError;
      return {
        ...data,
        pix_key: pix?.[0]?.pix_key ?? null,
        pix_key_type: pix?.[0]?.pix_key_type ?? null,
      };
    },
  });

  const { data: produtos } = useQuery({
    queryKey: ["meus-produtos", banca?.id],
    enabled: !!banca?.id && !!account?.producer,
    queryFn: async () => {
      if (!banca) return [];
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price_cents, unit, category, image_url, is_available, stock_quantity, low_stock_threshold")
        .eq("seller_id", banca.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: pedidos } = useQuery({
    queryKey: ["pedidos-da-banca", banca?.id],
    enabled: !!banca?.id && !!account?.producer,
    queryFn: async () => {
      if (!banca) return [];
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, total_cents, status, payment_method, created_at, order_items(product_name, quantity, unit)",
        )
        .eq("seller_id", banca.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (accountLoading) return <PageShell><AccountNav /><p className="my-10">Carregando sua conta…</p></PageShell>;
  if (!account?.producer) return <PageShell><AccountNav /><section className="my-10"><h1 className="font-display text-3xl font-bold">Conta de comprador</h1><Button asChild className="mt-6"><Link to="/configuracoes">Alterar para produtor nas configurações</Link></Button></section></PageShell>;

  return (
    <PageShell>
      <AccountNav />
      <section className="mt-12 mb-10">
        <h1 className="text-4xl font-extrabold">Painel do produtor</h1>
        <p className="mt-2 text-muted-foreground">
          Seus dados, sua chave PIX e os produtos que aparecem na feira.
        </p>
        <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Gerenciar minha banca">
          {[
            { id: "produtos", label: "Cadastrar produtos" },
            { id: "pix", label: "Cadastrar chave PIX" },
            { id: "estoque", label: "Gerenciar produtos e estoque" },
            { id: "pedidos", label: "Pedidos recebidos" },
          ].map((tab) => <Button key={tab.id} role="tab" aria-selected={secao === tab.id} variant={secao === tab.id ? "default" : "outline"} className="h-auto min-h-10 whitespace-normal" onClick={() => navigate({ search: { secao: tab.id } })}>{tab.label}</Button>)}
        </div>

        {isLoading ? (
          <div className="glass-panel mt-6 h-64 animate-pulse rounded-3xl" />
        ) : (
          <div className="mt-6">
            <div className={secao === "pix" || !banca ? "max-w-xl" : "hidden"}>
              <FormBanca
                banca={banca ?? null}
                userId={user?.id ?? ""}
                onSalvo={() => {
                  queryClient.invalidateQueries({ queryKey: ["minha-banca"] });
                  queryClient.invalidateQueries({ queryKey: ["produtos-feira"] });
                }}
              />
            </div>

            <div className="space-y-6">
              {banca ? (
                <>
                  {secao === "produtos" && <FormProduto
                    sellerId={banca.id}
                    onSalvo={() => {
                      queryClient.invalidateQueries({ queryKey: ["meus-produtos"] });
                      queryClient.invalidateQueries({ queryKey: ["produtos-feira"] });
                    }}
                  />}

                  {secao === "estoque" && <div className="p-0">
                    <h2 className="font-display text-lg font-bold">Meus produtos</h2>
                    <ul className="mt-4 space-y-3">
                      {produtos?.map((p) => (
                        <li
                          key={p.id}
                          className="glass-soft flex flex-wrap items-center gap-3 rounded-2xl p-3"
                        >
                          {p.image_url ? (
                            <StoredImage
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
                          <Button variant="outline" size="sm"
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
                          </Button>
                          <StockEditor key={`${p.id}-${p.stock_quantity}-${p.low_stock_threshold}`} product={p} onSaved={() => {
                            queryClient.invalidateQueries({ queryKey: ["meus-produtos"] });
                            queryClient.invalidateQueries({ queryKey: ["produtos-feira"] });
                          }} />
                          <Button variant="ghost" size="sm"
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
                          </Button>
                        </li>
                      ))}
                      {produtos && produtos.length === 0 && (
                        <li className="text-sm text-muted-foreground">
                          Nenhum produto cadastrado ainda.
                        </li>
                      )}
                    </ul>
                  </div>}

                  {secao === "pedidos" && <div>
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
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-mint/15 px-3 py-1 text-xs font-semibold text-mint">
                              {orderStatusLabel(o.status)}
                            </span>
                            {nextOrderStatus(o.status) && (
                              <Button size="sm"
                                onClick={async () => {
                                  const { error } = await supabase
                                    .from("orders")
                                    .update({ status: nextOrderStatus(o.status) ?? o.status })
                                    .eq("id", o.id).select("id").single();
                                  if (error) {
                                    toast.error("Não foi possível atualizar");
                                    return;
                                  }
                                  toast.success(o.status === "pago" ? "Pedido concluído" : "Pedido marcado como pago");
                                  queryClient.invalidateQueries({ queryKey: ["pedidos-da-banca"] });
                                }}
                                className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
                              >
                                <Check />{o.status === "pago" ? "Concluir pedido" : o.payment_method === "na_retirada"
                                  ? "Recebi na retirada"
                                  : "Recebi o PIX"}
                              </Button>
                            )}
                            <Button asChild variant="outline" size="sm"><Link to="/pedidos/$orderId/chat" params={{ orderId: o.id }}><MessageCircle />Conversa do pedido</Link></Button>
                          </div>
                        </li>
                      ))}
                      {pedidos && pedidos.length === 0 && (
                        <li className="text-sm text-muted-foreground">
                          Nenhum pedido ainda. Compartilhe sua banca com os clientes.
                        </li>
                      )}
                    </ul>
                  </div>}
                </>
              ) : (
                <div className="glass-soft rounded-3xl p-6 text-sm text-muted-foreground">
                  Preencha os dados da banca para começar a cadastrar produtos.
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
      <Button
        type="submit"
        disabled={salvando}
        className="w-full rounded-2xl bg-primary px-4 py-4 text-base font-bold text-primary-foreground shadow-glass disabled:opacity-60"
      >
        {banca ? "Salvar alterações" : "Criar minha banca"}
      </Button>
    </form>
  );
}

function FormProduto({ sellerId, onSalvo }: { sellerId: string; onSalvo: () => void }) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoInputKey, setPhotoInputKey] = useState(0);
  const [form, setForm] = useState({
    name: "",
    price: "",
    unit: "kg",
    category: "Hortifruti",
    image_url: "",
    description: "",
    stock: "",
    threshold: "3",
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
    const stock = validStock(form.stock);
    const threshold = validStock(form.threshold);
    if (stock === null || threshold === null) {
      toast.error("Informe um estoque válido, maior ou igual a zero.");
      return;
    }
    setSalvando(true);
    try {
      let imageUrl = form.image_url;
      if (photo) {
        if (!validUpload(photo)) throw new Error("Envie uma foto JPG, PNG ou WebP de até 5 MB.");
        const path = `${sellerId}/${crypto.randomUUID()}.${uploadExtension(photo.type)}`;
        const { error: uploadError } = await supabase.storage.from("product-photos").upload(path, photo, { contentType: photo.type });
        if (uploadError) throw uploadError;
        imageUrl = `storage:${path}`;
      }
      const { error } = await supabase.from("products").insert({
        seller_id: sellerId,
        name: form.name,
        description: form.description || null,
        price_cents: cents,
        unit: form.unit,
        category: form.category,
        image_url: imageUrl || null,
        stock_quantity: stock,
        low_stock_threshold: threshold,
      });
      if (error) throw error;
      toast.success("Produto publicado na feira");
      setForm({ ...form, name: "", price: "", image_url: "", description: "", stock: "" });
      setPhoto(null); setPhotoInputKey((key) => key + 1);
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
        <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Upload className="size-4" />Foto do produto (opcional)</span>
        <input key={photoInputKey} type="file" aria-label="Foto do produto" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
          const file = event.target.files?.[0];
          if (file && !validUpload(file)) { toast.error("Envie uma foto JPG, PNG ou WebP de até 5 MB."); event.target.value = ""; return; }
          setPhoto(file ?? null);
        }} className={campo} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block"><span className="text-xs font-medium text-muted-foreground">Estoque inicial ({form.unit})</span><input required type="number" min="0" step="any" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className={campo} /></label>
        <label className="block"><span className="text-xs font-medium text-muted-foreground">Alerta de estoque baixo</span><input required type="number" min="0" step="any" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: e.target.value })} className={campo} /></label>
      </div>
      <label className="block">
        <span className="text-xs font-medium text-muted-foreground">Descrição (opcional)</span>
        <input
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Colhido hoje, sem agrotóxicos"
          className={campo}
        />
      </label>
      <Button
        type="submit"
        disabled={salvando}
        className="w-full rounded-2xl bg-primary-deep px-4 py-4 text-base font-bold text-primary-foreground disabled:opacity-60"
      >
        Publicar na feira
      </Button>
    </form>
  );
}
