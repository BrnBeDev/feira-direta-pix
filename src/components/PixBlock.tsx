import { useState } from "react";
import { toast } from "sonner";
import { formatBRL } from "@/lib/format";

export function PixBlock({
  stallName,
  pixKey,
  totalCents,
}: {
  stallName: string;
  pixKey: string | null;
  totalCents: number;
}) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    if (!pixKey) return;
    try {
      await navigator.clipboard.writeText(pixKey);
      setCopiado(true);
      toast.success("Chave PIX copiada");
      setTimeout(() => setCopiado(false), 3000);
    } catch {
      toast.error("Copie a chave manualmente");
    }
  }

  return (
    <div className="glass-panel rounded-3xl p-6 shadow-glass">
      <p className="text-sm font-semibold text-muted-foreground">Pagar {stallName}</p>
      <p className="mt-1 font-display text-3xl font-extrabold text-primary">
        {formatBRL(totalCents)}
      </p>

      {pixKey ? (
        <>
          <div className="glass-soft mt-5 rounded-2xl p-4">
            <p className="text-xs font-medium text-muted-foreground">Chave PIX do produtor</p>
            <p className="mt-1 break-all text-sm font-semibold">{pixKey}</p>
          </div>
          <button
            onClick={copiar}
            className="mt-4 w-full rounded-2xl bg-primary px-4 py-4 text-base font-bold text-primary-foreground shadow-glass"
          >
            {copiado ? "Chave copiada!" : "Copiar chave PIX"}
          </button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Cole a chave no app do seu banco e envie o valor para o produtor.
          </p>
        </>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          Este produtor ainda não cadastrou a chave PIX. Combine o pagamento na banca.
        </p>
      )}
    </div>
  );
}
