DROP POLICY IF EXISTS "sellers_public_read" ON public.sellers;
CREATE POLICY "sellers_public_read" ON public.sellers
FOR SELECT TO anon, authenticated
USING (
  owner_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.products p WHERE p.seller_id = sellers.id AND p.is_available = true)
  OR EXISTS (SELECT 1 FROM public.orders o WHERE o.seller_id = sellers.id AND o.buyer_id = auth.uid())
);