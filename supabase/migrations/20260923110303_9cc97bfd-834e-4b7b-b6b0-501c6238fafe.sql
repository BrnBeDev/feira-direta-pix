REVOKE SELECT ON public.sellers FROM authenticated;

GRANT SELECT (id, owner_id, stall_name, producer_name, bio, city, created_at, updated_at) ON public.sellers TO authenticated;