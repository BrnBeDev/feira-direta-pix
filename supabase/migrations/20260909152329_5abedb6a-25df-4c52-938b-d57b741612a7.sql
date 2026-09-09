CREATE TABLE public.sellers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID UNIQUE,
  stall_name TEXT NOT NULL,
  producer_name TEXT NOT NULL,
  bio TEXT,
  city TEXT,
  pix_key TEXT,
  pix_key_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sellers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sellers TO authenticated;
GRANT ALL ON public.sellers TO service_role;
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sellers_public_read" ON public.sellers FOR SELECT USING (true);
CREATE POLICY "sellers_owner_insert" ON public.sellers FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "sellers_owner_update" ON public.sellers FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "sellers_owner_delete" ON public.sellers FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  unit TEXT NOT NULL DEFAULT 'un',
  category TEXT NOT NULL DEFAULT 'Hortifruti',
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_public_read" ON public.products FOR SELECT USING (true);
CREATE POLICY "products_owner_insert" ON public.products FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = seller_id AND s.owner_id = auth.uid()));
CREATE POLICY "products_owner_update" ON public.products FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = seller_id AND s.owner_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = seller_id AND s.owner_id = auth.uid()));
CREATE POLICY "products_owner_delete" ON public.products FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = seller_id AND s.owner_id = auth.uid()));

CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id UUID NOT NULL,
  seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  status TEXT NOT NULL DEFAULT 'aguardando_pagamento',
  buyer_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_buyer_read" ON public.orders FOR SELECT TO authenticated USING (buyer_id = auth.uid());
CREATE POLICY "orders_seller_read" ON public.orders FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = seller_id AND s.owner_id = auth.uid()));
CREATE POLICY "orders_buyer_insert" ON public.orders FOR INSERT TO authenticated WITH CHECK (buyer_id = auth.uid());
CREATE POLICY "orders_buyer_update" ON public.orders FOR UPDATE TO authenticated USING (buyer_id = auth.uid()) WITH CHECK (buyer_id = auth.uid());
CREATE POLICY "orders_seller_update" ON public.orders FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = seller_id AND s.owner_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = seller_id AND s.owner_id = auth.uid()));

CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'un',
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  quantity NUMERIC(10,2) NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_items_read" ON public.order_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.orders o LEFT JOIN public.sellers s ON s.id = o.seller_id WHERE o.id = order_id AND (o.buyer_id = auth.uid() OR s.owner_id = auth.uid())));
CREATE POLICY "order_items_buyer_insert" ON public.order_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.buyer_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER update_sellers_updated_at BEFORE UPDATE ON public.sellers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.sellers (id, stall_name, producer_name, bio, city, pix_key, pix_key_type) VALUES
 ('11111111-1111-4111-8111-111111111111', 'Fazenda da Horta', 'Dona Marta', 'Hortaliças e legumes colhidos na manhã da feira.', 'Vila Aurora', 'contato@fazendadahorta.com', 'email'),
 ('22222222-2222-4222-8222-222222222222', 'Laticínio Boa Vista', 'Seu Antônio', 'Queijos artesanais curados no sítio da família.', 'Sítio Boa Vista', '11987654321', 'telefone'),
 ('33333333-3333-4333-8333-333333333333', 'Padaria Rústica', 'Clara Nunes', 'Pães de fermentação natural feitos em forno a lenha.', 'Centro', '123.456.789-00', 'cpf'),
 ('44444444-4444-4444-8444-444444444444', 'Chácara do Vale', 'João e Rita', 'Sucos e polpas de frutas da própria chácara.', 'Bairro do Vale', 'chacaradovale@pix.com', 'email');

INSERT INTO public.products (seller_id, name, description, price_cents, unit, category, image_url) VALUES
 ('11111111-1111-4111-8111-111111111111', 'Tomate Orgânico', 'Colhido no dia, sem agrotóxicos.', 1290, 'kg', 'Hortifruti', '/images/tomate.jpg'),
 ('22222222-2222-4222-8222-222222222222', 'Queijo Gouda Artesanal', 'Peça de 300g curada por 60 dias.', 2800, '300g', 'Frios & queijos', '/images/queijo.jpg'),
 ('33333333-3333-4333-8333-333333333333', 'Pão de Fermentação', 'Fermentação natural, casca crocante.', 1850, '800g', 'Panificados', '/images/pao.jpg'),
 ('44444444-4444-4444-8444-444444444444', 'Suco de Laranja', 'Prensado na hora, garrafa de 1L.', 990, '1L', 'Bebidas', '/images/suco.jpg');