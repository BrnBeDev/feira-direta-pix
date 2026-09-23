DROP POLICY products_public_read ON public.products;

CREATE POLICY products_public_read ON public.products
FOR SELECT TO public
USING (
  is_available = true
  OR EXISTS (
    SELECT 1 FROM public.sellers s
    WHERE s.id = products.seller_id AND s.owner_id = auth.uid()
  )
);

REVOKE SELECT (pix_key, pix_key_type) ON public.sellers FROM authenticated;

CREATE OR REPLACE FUNCTION public.get_seller_pix(_seller_id uuid)
RETURNS TABLE(pix_key text, pix_key_type text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.pix_key, s.pix_key_type
  FROM public.sellers s
  WHERE s.id = _seller_id
    AND (
      s.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.seller_id = s.id AND o.buyer_id = auth.uid()
      )
    );
$$;

REVOKE ALL ON FUNCTION public.get_seller_pix(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_seller_pix(uuid) TO authenticated;