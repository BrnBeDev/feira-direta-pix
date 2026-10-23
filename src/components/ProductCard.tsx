import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useCart } from "@/lib/cart";
import { formatBRL } from "@/lib/format";
import { StoredImage } from "@/components/StoredImage";

export type ProductCardData = {
  id: string;
  name: string;
  priceCents: number;
  unit: string;
  imageUrl: string | null;
  sellerId: string;
  stallName: string;
};

export function ProductCard({ product }: { product: ProductCardData }) {
  const { add } = useCart();

  return (
    <div className="glass-panel flex flex-col rounded-3xl p-4 shadow-glass">
      {product.imageUrl ? (
        <StoredImage
          src={product.imageUrl}
          alt={product.name}
          loading="lazy"
          width={1024}
          height={1024}
          className="aspect-square w-full rounded-2xl object-cover"
        />
      ) : (
        <div className="grid aspect-square w-full place-items-center rounded-2xl bg-mist text-3xl">
          🧺
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        <span className="size-2 rounded-full bg-mint" />
        <p className="text-sm font-semibold">{product.name}</p>
      </div>
      <Link
        to="/produtor/$id"
        params={{ id: product.sellerId }}
        className="mt-0.5 text-xs text-muted-foreground hover:text-primary"
      >
        {product.stallName} · {product.unit}
      </Link>

      <div className="mt-3 flex items-center justify-between">
        <p className="font-display text-lg font-bold text-primary">
          {formatBRL(product.priceCents)}
        </p>
        <button
          onClick={() => {
            add({
              productId: product.id,
              name: product.name,
              unit: product.unit,
              priceCents: product.priceCents,
              imageUrl: product.imageUrl,
              sellerId: product.sellerId,
              stallName: product.stallName,
            });
            toast.success(`${product.name} adicionado ao pedido`);
          }}
          className="rounded-full bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground"
        >
          Comprar
        </button>
      </div>
    </div>
  );
}
