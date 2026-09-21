ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS stock_quantity numeric NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS low_stock_threshold numeric NOT NULL DEFAULT 3;

CREATE OR REPLACE FUNCTION public.decrement_product_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  disponivel numeric;
  nome text;
BEGIN
  IF NEW.product_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT stock_quantity, name INTO disponivel, nome
  FROM public.products
  WHERE id = NEW.product_id
  FOR UPDATE;

  IF disponivel IS NULL THEN
    RETURN NEW;
  END IF;

  IF disponivel < NEW.quantity THEN
    RAISE EXCEPTION 'Estoque insuficiente para %: restam apenas %', nome, disponivel;
  END IF;

  UPDATE public.products
  SET stock_quantity = stock_quantity - NEW.quantity
  WHERE id = NEW.product_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS order_items_decrement_stock ON public.order_items;
CREATE TRIGGER order_items_decrement_stock
  BEFORE INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.decrement_product_stock();