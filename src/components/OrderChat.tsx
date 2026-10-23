import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Paperclip, Send, FileText, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { canSendReceipt, messageSchema, validUpload, uploadExtension } from "@/lib/order-rules";

export function OrderChat({ orderId, userId, isBuyer, paymentMethod }: {
  orderId: string; userId: string; isBuyer: boolean; paymentMethod: string;
}) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const queryKey = ["order-chat", orderId, userId];
  const { data: messages, isPending, error } = useQuery({
    queryKey,
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase.from("order_messages").select("*").eq("order_id", orderId).order("created_at");
      if (error) throw error;
      return data;
    },
  });
  useEffect(() => {
    const channel = supabase.channel(`order-${orderId}-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "order_messages", filter: `order_id=eq.${orderId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["order-chat", orderId] });
      }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [orderId, queryClient]);
  useEffect(() => { bottom.current?.scrollIntoView({ block: "nearest" }); }, [messages?.length]);
  async function send(event: React.FormEvent) {
    event.preventDefault();
    const parsed = messageSchema.safeParse({ body, attachment: !!file });
    if (!parsed.success || sending) return;
    if (file && (!canSendReceipt(isBuyer, paymentMethod) || !validUpload(file, true))) {
      toast.error("Envie uma foto JPG, PNG, WebP ou PDF de até 5 MB."); return;
    }
    setSending(true);
    try {
      let attachmentPath: string | null = null;
      if (file) {
        attachmentPath = `${orderId}/${userId}/${crypto.randomUUID()}.${uploadExtension(file.type)}`;
        const { error } = await supabase.storage.from("order-receipts").upload(attachmentPath, file, { contentType: file.type });
        if (error) throw error;
      }
      const { error } = await supabase.from("order_messages").insert({ order_id: orderId, sender_id: userId,
        body: parsed.data.body, attachment_path: attachmentPath, attachment_name: file?.name.slice(0, 180) ?? null });
      if (error) throw error;
      setBody(""); setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      await queryClient.invalidateQueries({ queryKey });
      toast.success("Mensagem enviada");
    } catch { toast.error("Não foi possível enviar. Tente novamente."); }
    finally { setSending(false); }
  }
  return <section className="mt-8 border-t border-border pt-6">
    <h2 className="font-display text-xl font-bold">Conversa do pedido</h2>
    <div className="mt-4 max-h-96 min-h-40 space-y-4 overflow-y-auto py-4" aria-live="polite">
      {isPending && <p>Carregando mensagens…</p>}
      {error && <p role="alert" className="text-destructive">Não foi possível carregar a conversa.</p>}
      {messages?.length === 0 && <p className="text-sm text-muted-foreground">Ainda não há mensagens.</p>}
      {messages?.map((message) => <article key={message.id} className={`max-w-[85%] rounded-lg p-4 ${message.sender_id === userId ? "ml-auto bg-primary/10" : "bg-card"}`}>
        <p className="mb-1 text-xs font-semibold text-muted-foreground">{message.sender_id === userId ? "Você" : isBuyer ? "Produtor" : "Comprador"}</p>
        {message.body && <p className="whitespace-pre-wrap break-words text-sm">{message.body}</p>}
        {message.attachment_path && <ReceiptLink path={message.attachment_path} name={message.attachment_name ?? "Comprovante"} userId={userId} />}
        <p className="mt-2 text-xs text-muted-foreground">{new Date(message.created_at).toLocaleString("pt-BR")}</p>
      </article>)}
      <div ref={bottom} />
    </div>
    <form onSubmit={send} className="mt-4 space-y-3">
      <label className="block text-sm font-medium">Mensagem<textarea aria-label="Mensagem" value={body} maxLength={2000} onChange={(event) => setBody(event.target.value)} rows={3} className="mt-2 w-full rounded-lg border border-input bg-card p-3" /></label>
      <div className="flex flex-wrap items-center gap-3">
        {canSendReceipt(isBuyer, paymentMethod) && <><input ref={fileInput} type="file" aria-label="Comprovante PIX" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={(event) => {
          const selected = event.target.files?.[0];
          if (selected && !validUpload(selected, true)) { toast.error("Envie foto ou PDF de até 5 MB."); event.target.value = ""; return; }
          setFile(selected ?? null);
        }} /><Button type="button" variant="outline" disabled={sending} onClick={() => fileInput.current?.click()}><Paperclip />Anexar comprovante</Button></>}
        {file && <span className="max-w-full break-all text-sm">{file.name}</span>}
        <Button type="submit" disabled={sending || (!body.trim() && !file)}><Send />{sending ? "Enviando…" : "Enviar"}</Button>
      </div>
    </form>
  </section>;
}

function ReceiptLink({ path, name, userId }: { path: string; name: string; userId: string }) {
  const { data, error } = useQuery({
    queryKey: ["receipt", path, userId], staleTime: 4 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("order-receipts").createSignedUrl(path, 300);
      if (error) throw error;
      return data.signedUrl;
    },
  });
  return data ? <Button asChild variant="outline" className="mt-2 h-auto max-w-full whitespace-normal"><a href={data} target="_blank" rel="noopener noreferrer"><FileText className="shrink-0" /><span className="break-all">{name}</span><Download className="shrink-0" /></a></Button>
    : <p className="text-sm text-muted-foreground">{error ? "Comprovante indisponível" : "Carregando comprovante…"}</p>;
}