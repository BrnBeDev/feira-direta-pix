import { useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { validStock } from "@/lib/account-rules";

export function StockEditor({ product, onSaved }: {
  product: { id: string; name: string; unit: string; stock_quantity: number; low_stock_threshold: number };
  onSaved: () => void;
}) {
  const [stock, setStock] = useState(String(product.stock_quantity));
  const [threshold, setThreshold] = useState(String(product.low_stock_threshold));
  const [saving, setSaving] = useState(false);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    const quantity = validStock(stock);
    const warning = validStock(threshold);
    if (quantity === null || warning === null) { toast.error("Informe quantidades válidas, maiores ou iguais a zero."); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("products").update({ stock_quantity: quantity, low_stock_threshold: warning }).eq("id", product.id).select("id").single();
      if (error) throw error;
      toast.success("Estoque atualizado");
      onSaved();
    } catch { toast.error("Não foi possível atualizar o estoque."); }
    finally { setSaving(false); }
  }
  return <form onSubmit={save} className="flex w-full flex-wrap items-end gap-3 border-t border-border pt-3">
    <label className="min-w-32 flex-1 text-xs font-medium">Disponível ({product.unit})<input aria-label={`Estoque de ${product.name}`} type="number" min="0" step="any" required value={stock} onChange={(e) => setStock(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm" /></label>
    <label className="min-w-32 flex-1 text-xs font-medium">Alerta de estoque baixo<input aria-label={`Alerta de estoque de ${product.name}`} type="number" min="0" step="any" required value={threshold} onChange={(e) => setThreshold(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm" /></label>
    <Button type="submit" size="sm" disabled={saving}><Save />{saving ? "Salvando…" : "Salvar estoque"}</Button>
    <p className="w-full text-xs font-semibold text-muted-foreground">{product.stock_quantity === 0 ? "Esgotado" : product.stock_quantity <= product.low_stock_threshold ? "Estoque baixo" : "Em estoque"} · {product.stock_quantity} {product.unit}</p>
  </form>;
}