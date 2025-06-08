-- First drop the foreign key constraints
ALTER TABLE IF EXISTS public.items DROP CONSTRAINT IF EXISTS items_store_id_fkey;

-- Then drop and recreate the tables
DROP TABLE IF EXISTS public.shopping_items;
DROP TABLE IF EXISTS public.purchase_history;
DROP TABLE IF EXISTS public.stores;
DROP TABLE IF EXISTS public.items;

-- Create stores table with TEXT id
CREATE TABLE public.stores (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name TEXT NOT NULL,
  description TEXT,
  family_code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create shopping_items table
CREATE TABLE public.shopping_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  store_id TEXT NOT NULL REFERENCES public.stores(id),
  name TEXT NOT NULL,
  quantity TEXT,
  notes TEXT,
  added_by TEXT,
  added_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  is_purchased BOOLEAN DEFAULT FALSE,
  purchased_by TEXT,
  purchased_date TIMESTAMP WITH TIME ZONE
);

-- Create purchase_history table
CREATE TABLE public.purchase_history (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  store_id TEXT NOT NULL REFERENCES public.stores(id),
  item_name TEXT NOT NULL,
  quantity TEXT,
  notes TEXT,
  buyer_id TEXT,
  buyer_name TEXT,
  purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  frequency INTEGER DEFAULT 1,
  last_quantity TEXT,
  last_notes TEXT
);

-- Enable row level security
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_history ENABLE ROW LEVEL SECURITY;

-- Create policies for stores
DROP POLICY IF EXISTS "Anyone can view stores" ON public.stores;
CREATE POLICY "Anyone can view stores"
  ON public.stores FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Anyone can insert stores" ON public.stores;
CREATE POLICY "Anyone can insert stores"
  ON public.stores FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update stores" ON public.stores;
CREATE POLICY "Anyone can update stores"
  ON public.stores FOR UPDATE
  USING (true);

-- Create policies for shopping_items
DROP POLICY IF EXISTS "Anyone can view shopping_items" ON public.shopping_items;
CREATE POLICY "Anyone can view shopping_items"
  ON public.shopping_items FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Anyone can insert shopping_items" ON public.shopping_items;
CREATE POLICY "Anyone can insert shopping_items"
  ON public.shopping_items FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update shopping_items" ON public.shopping_items;
CREATE POLICY "Anyone can update shopping_items"
  ON public.shopping_items FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Anyone can delete shopping_items" ON public.shopping_items;
CREATE POLICY "Anyone can delete shopping_items"
  ON public.shopping_items FOR DELETE
  USING (true);

-- Create policies for purchase_history
DROP POLICY IF EXISTS "Anyone can view purchase_history" ON public.purchase_history;
CREATE POLICY "Anyone can view purchase_history"
  ON public.purchase_history FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Anyone can insert purchase_history" ON public.purchase_history;
CREATE POLICY "Anyone can insert purchase_history"
  ON public.purchase_history FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update purchase_history" ON public.purchase_history;
CREATE POLICY "Anyone can update purchase_history"
  ON public.purchase_history FOR UPDATE
  USING (true);

-- Enable realtime
alter publication supabase_realtime add table public.stores;
alter publication supabase_realtime add table public.shopping_items;
alter publication supabase_realtime add table public.purchase_history;