import type { ReactNode } from "react";
import { AppHeader } from "@/components/AppHeader";

/** Fundo com halos difusos + cabeçalho, base de todas as telas. */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <div className="halo -top-32 -right-24 size-[520px] bg-primary/25" />
      <div className="halo top-1/3 -left-28 size-[440px] bg-mint/20" />
      <div className="halo bottom-0 right-1/4 size-[380px] bg-primary-deep/15" />

      <div className="relative z-10 mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <AppHeader />
        {children}
      </div>
    </div>
  );
}
