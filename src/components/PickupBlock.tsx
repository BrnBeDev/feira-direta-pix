import { formatBRL } from "@/lib/format";

export function PickupBlock({
  stallName,
  totalCents,
}: {
  stallName: string;
  totalCents: number;
}) {
  return (
    <div className="glass-panel rounded-3xl p-6 shadow-glass">
      <p className="text-sm font-semibold text-muted-foreground">Pagar na banca {stallName}</p>
      <p className="mt-1 font-display text-3xl font-extrabold text-primary">
        {formatBRL(totalCents)}
      </p>

      <div className="glass-soft mt-5 rounded-2xl p-4">
        <p className="text-xs font-medium text-muted-foreground">Como funciona</p>
        <p className="mt-1 text-sm font-semibold">
          O produtor separa o seu pedido. Você paga na hora de retirar, direto com ele.
        </p>
      </div>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        Leve o valor em dinheiro ou combine cartão e PIX na hora da retirada.
      </p>
    </div>
  );
}
