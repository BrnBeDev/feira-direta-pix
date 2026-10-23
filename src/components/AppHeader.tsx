import { Link } from "@tanstack/react-router";
import { ShoppingBasket } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useSession } from "@/lib/useSession";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/lib/useAccount";

const navItems = [
  { to: "/", label: "Explorar" },
  { to: "/minha-conta", label: "Meu painel" },
] as const;

export function AppHeader() {
  const { count } = useCart();
  const { user } = useSession();
  const { data: account, loading } = useAccount();

  const initials = (user?.email ?? "?").slice(0, 2).toUpperCase();


  return (
    <header className="flex items-center justify-between gap-4">
      <Link to="/" className="flex items-center gap-3">
        <div className="grid size-11 place-items-center rounded-2xl bg-primary font-display text-lg font-bold text-primary-foreground shadow-lg">
          C
        </div>
        <div>
          <p className="font-display text-lg font-bold leading-none">Colheita</p>
          <p className="text-[11px] font-medium text-muted-foreground">Feira de produtores</p>
        </div>
      </Link>

      <nav className="glass-soft hidden items-center gap-1 rounded-full p-1 lg:flex">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: item.to === "/" }}
            className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors data-[status=active]:bg-primary data-[status=active]:font-semibold data-[status=active]:text-primary-foreground"
          >
            {item.label}
          </Link>
        ))}
        {user && !loading && <Button asChild variant="ghost">{account?.producer ? <Link to="/painel" search={{ secao: "pedidos" }}>Pedidos recebidos</Link> : <Link to="/meus-pedidos">Meus pedidos</Link>}</Button>}
      </nav>

      <div className="flex items-center gap-3">
        <Link
          to="/pedido"
          className="glass-soft relative grid size-11 place-items-center rounded-full text-foreground"
          aria-label="Ver meu pedido"
        >
          <ShoppingBasket className="size-5" aria-hidden="true" />
          {count > 0 && (
            <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-mint px-1 text-[11px] font-bold text-mint-foreground">
              {count}
            </span>
          )}
        </Link>

        {user ? (
          <Button asChild variant="ghost"
            className="grid size-10 place-items-center rounded-full bg-mint text-sm font-bold text-mint-foreground"
            title="Abrir meu painel"
          >
            <Link to="/minha-conta" aria-label="Abrir meu painel">{initials}</Link>
          </Button>
        ) : (
          <Link
            to="/auth"
            className="glass-soft rounded-full px-4 py-2.5 text-sm font-semibold text-foreground"
          >
            Entrar
          </Link>
        )}
      </div>
    </header>
  );
}
