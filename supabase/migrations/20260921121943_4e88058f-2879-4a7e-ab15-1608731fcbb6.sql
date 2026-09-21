ALTER TABLE public.orders
  ADD COLUMN payment_method text NOT NULL DEFAULT 'pix';

ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_method_check CHECK (payment_method IN ('pix', 'na_retirada'));