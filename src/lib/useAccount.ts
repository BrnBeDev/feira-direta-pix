import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/useSession";
import { isProducerAccount } from "@/lib/account-rules";

export function useAccount() {
  const { user, loading } = useSession();
  const query = useQuery({
    queryKey: ["account", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) throw new Error("Entre na sua conta para continuar.");
      const [profile, roles, stall] = await Promise.all([
        supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("sellers").select("id").eq("owner_id", user.id).limit(1),
      ]);
      if (profile.error) throw profile.error;
      if (roles.error) throw roles.error;
      if (stall.error) throw stall.error;
      return {
        name: profile.data?.display_name ?? "",
        producer: isProducerAccount((roles.data ?? []).map((row) => row.role), !!stall.data?.length),
      };
    },
  });
  return { user, ...query, loading: loading || (!!user && query.isPending) };
}