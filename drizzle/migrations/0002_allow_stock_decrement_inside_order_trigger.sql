CREATE OR REPLACE FUNCTION public.validate_producer_write() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF pg_trigger_depth()>1 THEN RETURN NEW; END IF;
 IF auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid()) AND NOT public.has_role(auth.uid(),'produtor') THEN RAISE EXCEPTION 'Ative a conta de produtor nas configurações'; END IF;
 RETURN NEW;
END; $$;