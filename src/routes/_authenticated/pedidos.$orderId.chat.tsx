import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/useSession";
import { formatBRL } from "@/lib/format";
import { orderStatusLabel } from "@/lib/order-rules";
import { PageShell } from "@/components/PageShell";
import { AccountNav } from "@/components/AccountNav";
import { OrderChat } from "@/components/OrderChat";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/pedidos/$orderId/chat")({
  head: () => ({ meta: [
    { title: "Conversa privada do pedido | Colheita" },
    { name: "description", content: "Mensagens e comprovantes privados entre comprador e produtor do pedido." },
    { property: "og:title", content: "Conversa do pedido — Colheita" },
    { property: "og:description", content: "Acompanhe seu pedido e converse com a outra parte." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: ChatPage,
});

function ChatPage() {
  const { orderId } = Route.useParams();
  const { user } = useSession();
  const { data: order, isPending, error } = useQuery({
    queryKey: ["chat-order", orderId, user?.id], enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("id, buyer_id, seller_id, total_cents, payment_method, status, sellers(stall_name), order_items(product_name, quantity, unit)").eq("id", orderId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  return <PageShell><AccountNav /><section className="my-10 max-w-3xl">
    <h1 className="font-display text-3xl font-bold">Conversa do pedido</h1>
    {isPending ? <p className="mt-6">Carregando pedido…</p> : error || !order || !user ? <p role="alert" className="mt-6 text-destructive">Pedido indisponível ou sem permissão de acesso.</p> : <>
      <p className="mt-3 font-semibold">{order.sellers?.stall_name ?? "Banca"} · {formatBRL(order.total_cents)}</p>
      <p className="mt-2 text-sm text-muted-foreground">{orderStatusLabel(order.status)} · Pedido {order.id.slice(0, 8)}</p>
      <ul className="mt-4 space-y-1 text-sm">{order.order_items.map((item, index) => <li key={index}>{item.quantity} {item.unit} · {item.product_name}</li>)}</ul>
      <Button asChild variant="outline" className="mt-4">{order.buyer_id === user.id ? <Link to="/meus-pedidos">Voltar aos pedidos</Link> : <Link to="/painel" search={{ secao: "pedidos" }}>Voltar aos pedidos recebidos</Link>}</Button>
      <OrderChat orderId={order.id} userId={user.id} isBuyer={order.buyer_id === user.id} paymentMethod={order.payment_method} />
    </>}
  </section></PageShell>;
}