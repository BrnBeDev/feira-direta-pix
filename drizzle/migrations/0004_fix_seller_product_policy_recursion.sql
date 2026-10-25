CREATE OR REPLACE FUNCTION public.owns_seller(_seller_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.sellers WHERE id = _seller_id AND owner_id = auth.uid());
$$;
CREATE OR REPLACE FUNCTION public.seller_is_listed(_seller_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.products WHERE seller_id = _seller_id AND is_available = true)
      OR EXISTS (SELECT 1 FROM public.orders WHERE seller_id = _seller_id AND buyer_id = auth.uid());
$$;
REVOKE EXECUTE ON FUNCTION public.owns_seller(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.seller_is_listed(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.owns_seller(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.seller_is_listed(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS sellers_public_read ON public.sellers;
CREATE POLICY sellers_public_read ON public.sellers FOR SELECT TO anon, authenticated
  USING (owner_id = auth.uid() OR public.seller_is_listed(id));

DROP POLICY IF EXISTS products_public_read ON public.products;
CREATE POLICY products_public_read ON public.products FOR SELECT TO public
  USING (is_available = true OR public.owns_seller(seller_id));
DROP POLICY IF EXISTS products_owner_insert ON public.products;
CREATE POLICY products_owner_insert ON public.products FOR INSERT TO authenticated WITH CHECK (public.owns_seller(seller_id));
DROP POLICY IF EXISTS products_owner_update ON public.products;
CREATE POLICY products_owner_update ON public.products FOR UPDATE TO authenticated USING (public.owns_seller(seller_id)) WITH CHECK (public.owns_seller(seller_id));
DROP POLICY IF EXISTS products_owner_delete ON public.products;
CREATE POLICY products_owner_delete ON public.products FOR DELETE TO authenticated USING (public.owns_seller(seller_id));

DROP POLICY IF EXISTS orders_seller_read ON public.orders;
CREATE POLICY orders_seller_read ON public.orders FOR SELECT TO authenticated USING (public.owns_seller(seller_id));
DROP POLICY IF EXISTS orders_seller_update ON public.orders;
CREATE POLICY orders_seller_update ON public.orders FOR UPDATE TO authenticated USING (public.owns_seller(seller_id)) WITH CHECK (public.owns_seller(seller_id));

ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS product_type text;
GRANT SELECT (product_type) ON public.sellers TO anon, authenticated;