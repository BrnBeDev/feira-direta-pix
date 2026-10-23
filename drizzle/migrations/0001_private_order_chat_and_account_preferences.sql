CREATE OR REPLACE FUNCTION public.set_account_preferences(_name text, _role public.app_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Entre na sua conta'; END IF;
 IF length(trim(_name)) NOT BETWEEN 1 AND 80 OR _role IS NULL THEN RAISE EXCEPTION 'Dados inválidos'; END IF;
 INSERT INTO public.profiles(id, display_name) VALUES(auth.uid(), trim(_name)) ON CONFLICT(id) DO UPDATE SET display_name = EXCLUDED.display_name;
 DELETE FROM public.user_roles WHERE user_id = auth.uid();
 INSERT INTO public.user_roles(user_id, role) VALUES(auth.uid(), _role);
END; $$;
REVOKE ALL ON FUNCTION public.set_account_preferences(text, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_account_preferences(text, public.app_role) TO authenticated;
CREATE OR REPLACE FUNCTION public.order_participant(_order_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT EXISTS(SELECT 1 FROM public.orders o JOIN public.sellers s ON s.id=o.seller_id WHERE o.id=_order_id AND (o.buyer_id=auth.uid() OR s.owner_id=auth.uid())); $$;
REVOKE ALL ON FUNCTION public.order_participant(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.order_participant(uuid) TO authenticated;
CREATE TABLE public.order_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id uuid NOT NULL REFERENCES public.orders(id),
 sender_id uuid NOT NULL,
 body text NOT NULL DEFAULT '',
 attachment_path text,
 attachment_name text,
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT order_message_length CHECK (length(body)<=2000 AND (length(trim(body))>0 OR attachment_path IS NOT NULL)),
 CONSTRAINT order_attachment_name_length CHECK (length(attachment_name)<=180)
);
GRANT SELECT, INSERT ON public.order_messages TO authenticated;
GRANT ALL ON public.order_messages TO service_role;
ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY order_messages_participant_read ON public.order_messages FOR SELECT TO authenticated USING(public.order_participant(order_id));
CREATE POLICY order_messages_participant_insert ON public.order_messages FOR INSERT TO authenticated WITH CHECK(sender_id=auth.uid() AND public.order_participant(order_id) AND (attachment_path IS NULL OR (split_part(attachment_path,'/',1)=order_id::text AND split_part(attachment_path,'/',2)=auth.uid()::text AND EXISTS(SELECT 1 FROM public.orders o WHERE o.id=order_id AND o.buyer_id=auth.uid() AND o.payment_method='pix'))));
CREATE INDEX order_messages_order_created ON public.order_messages(order_id, created_at);
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_messages;
CREATE POLICY receipt_participant_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='order-receipts' AND EXISTS(SELECT 1 FROM public.orders o WHERE o.id::text=split_part(name,'/',1) AND public.order_participant(o.id)));
CREATE POLICY receipt_buyer_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='order-receipts' AND split_part(name,'/',2)=auth.uid()::text AND lower(storage.extension(name)) IN ('jpg','jpeg','png','webp','pdf') AND EXISTS(SELECT 1 FROM public.orders o WHERE o.id::text=split_part(name,'/',1) AND o.buyer_id=auth.uid() AND o.payment_method='pix'));
CREATE POLICY product_photo_read ON storage.objects FOR SELECT TO anon, authenticated USING(bucket_id='product-photos' AND (EXISTS(SELECT 1 FROM public.products p WHERE p.image_url='storage:'||name AND p.is_available=true) OR EXISTS(SELECT 1 FROM public.sellers s WHERE s.id::text=split_part(name,'/',1) AND s.owner_id=auth.uid())));
CREATE POLICY product_photo_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='product-photos' AND lower(storage.extension(name)) IN ('jpg','jpeg','png','webp') AND EXISTS(SELECT 1 FROM public.sellers s WHERE s.id::text=split_part(name,'/',1) AND s.owner_id=auth.uid()));
CREATE OR REPLACE FUNCTION public.validate_order_status_change() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.status<>'aguardando_pagamento' THEN RAISE EXCEPTION 'O pedido inicia pendente de pagamento'; END IF;
 ELSIF auth.uid() IS NOT NULL THEN
  IF NOT EXISTS(SELECT 1 FROM public.sellers s WHERE s.id=OLD.seller_id AND s.owner_id=auth.uid()) THEN RAISE EXCEPTION 'Somente o produtor pode atualizar o pedido'; END IF;
  IF (to_jsonb(NEW)-'status') IS DISTINCT FROM (to_jsonb(OLD)-'status') THEN RAISE EXCEPTION 'Somente a situação pode ser alterada'; END IF;
  IF NOT (NEW.status=OLD.status OR (OLD.status='aguardando_pagamento' AND NEW.status='pago') OR (OLD.status='pago' AND NEW.status='concluido')) THEN RAISE EXCEPTION 'Situação inválida'; END IF;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER validate_order_status_change BEFORE INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.validate_order_status_change();
CREATE OR REPLACE FUNCTION public.validate_producer_write() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid()) AND NOT public.has_role(auth.uid(),'produtor') THEN RAISE EXCEPTION 'Ative a conta de produtor nas configurações'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER validate_product_producer BEFORE INSERT OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.validate_producer_write();
CREATE TRIGGER validate_seller_producer BEFORE INSERT OR UPDATE ON public.sellers FOR EACH ROW EXECUTE FUNCTION public.validate_producer_write();