import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function StoredImage({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) {
  const path = src?.startsWith("storage:") ? src.slice(8) : null;
  const { data } = useQuery({
    queryKey: ["product-photo", path],
    enabled: !!path,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      if (!path) return null;
      const { data, error } = await supabase.storage.from("product-photos").createSignedUrl(path, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });
  return <img {...props} alt={alt} src={path ? data ?? undefined : src} />;
}