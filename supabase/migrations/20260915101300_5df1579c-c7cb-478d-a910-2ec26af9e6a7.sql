-- Remove public (anon) access to the full sellers table, which includes pix_key
DROP POLICY IF EXISTS sellers_public_read ON public.sellers;

CREATE POLICY sellers_authenticated_read
  ON public.sellers FOR SELECT TO authenticated
  USING (true);

-- Public-safe projection without payment data
CREATE OR REPLACE VIEW public.sellers_public
WITH (security_invoker = false) AS
  SELECT id, stall_name, producer_name, bio, city, created_at
  FROM public.sellers;

REVOKE ALL ON public.sellers_public FROM anon, authenticated;
GRANT SELECT ON public.sellers_public TO anon, authenticated;
GRANT ALL ON public.sellers_public TO service_role;