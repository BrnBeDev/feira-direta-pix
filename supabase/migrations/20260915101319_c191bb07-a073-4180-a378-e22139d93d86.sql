DROP VIEW IF EXISTS public.sellers_public;

DROP POLICY IF EXISTS sellers_authenticated_read ON public.sellers;

CREATE POLICY sellers_public_read
  ON public.sellers FOR SELECT
  USING (true);

-- Column-level privileges: anon can never read payment data
REVOKE SELECT ON public.sellers FROM anon;
GRANT SELECT (id, stall_name, producer_name, bio, city, created_at, updated_at)
  ON public.sellers TO anon;
GRANT SELECT ON public.sellers TO authenticated;
GRANT ALL ON public.sellers TO service_role;