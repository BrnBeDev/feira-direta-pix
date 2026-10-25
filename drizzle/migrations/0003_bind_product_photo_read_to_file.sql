DROP POLICY IF EXISTS product_photo_read ON storage.objects;
CREATE POLICY product_photo_read ON storage.objects FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'product-photos' AND (
    EXISTS (SELECT 1 FROM public.products p JOIN public.sellers s ON s.id = p.seller_id
            WHERE p.image_url = ('storage:' || objects.name)
              AND s.id::text = split_part(objects.name, '/', 1)
              AND p.is_available = true)
    OR EXISTS (SELECT 1 FROM public.sellers s
               WHERE s.id::text = split_part(objects.name, '/', 1) AND s.owner_id = auth.uid())
  )
);