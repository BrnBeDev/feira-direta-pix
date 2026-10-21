import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function useSignOut() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false);
  async function signOut() {
    setLeaving(true);
    try {
      await queryClient.cancelQueries();
      queryClient.clear();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      await navigate({ to: "/auth", replace: true });
    } catch {
      toast.error("Não foi possível sair. Tente novamente.");
    } finally {
      setLeaving(false);
    }
  }
  return { signOut, leaving };
}