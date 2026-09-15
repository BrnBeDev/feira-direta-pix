REVOKE SELECT ON public.sellers FROM anon;
GRANT SELECT (id, owner_id, stall_name, producer_name, bio, city, created_at, updated_at) ON public.sellers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sellers TO authenticated;
GRANT ALL ON public.sellers TO service_role;