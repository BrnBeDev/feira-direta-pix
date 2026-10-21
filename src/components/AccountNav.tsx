import { Link } from "@tanstack/react-router";
import { LayoutDashboard, ShoppingBag, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSignOut } from "@/lib/useSignOut";

export function AccountNav() {
  const { signOut, leaving } = useSignOut();
  return (
    <nav aria-label="Menu da conta" className="mt-8 flex flex-wrap gap-2 border-b border-border pb-4">
      <Button asChild variant="ghost"><Link to="/minha-conta"><LayoutDashboard />Meu painel</Link></Button>
      <Button asChild variant="ghost"><Link to="/meus-pedidos"><ShoppingBag />Meus pedidos</Link></Button>
      <Button asChild variant="ghost"><Link to="/configuracoes"><Settings />Configurações</Link></Button>
      <Button variant="ghost" onClick={signOut} disabled={leaving} className="sm:ml-auto"><LogOut />{leaving ? "Saindo…" : "Sair"}</Button>
    </nav>
  );
}