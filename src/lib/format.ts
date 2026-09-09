export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** Converte "12,90" ou "12.90" em centavos. */
export function parseBRLToCents(value: string): number | null {
  const clean = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const num = Number(clean);
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.round(num * 100);
}
