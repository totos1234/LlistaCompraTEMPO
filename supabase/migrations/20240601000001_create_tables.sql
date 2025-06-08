-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  family_code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create stores table
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  family_code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shopping_items table
CREATE TABLE IF NOT EXISTS shopping_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity TEXT,
  notes TEXT,
  added_by UUID REFERENCES users(id),
  added_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_purchased BOOLEAN DEFAULT FALSE,
  purchased_by UUID REFERENCES users(id),
  purchased_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create purchase_history table
CREATE TABLE IF NOT EXISTS purchase_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity TEXT,
  notes TEXT,
  buyer_id UUID REFERENCES users(id),
  buyer_name TEXT NOT NULL,
  purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable row level security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_history ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Users can view their family users" ON users;
CREATE POLICY "Users can view their family users"
ON users FOR SELECT
USING (family_code IN (SELECT family_code FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can view their family stores" ON stores;
CREATE POLICY "Users can view their family stores"
ON stores FOR SELECT
USING (family_code IN (SELECT family_code FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert into their family stores" ON stores;
CREATE POLICY "Users can insert into their family stores"
ON stores FOR INSERT
WITH CHECK (family_code IN (SELECT family_code FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update their family stores" ON stores;
CREATE POLICY "Users can update their family stores"
ON stores FOR UPDATE
USING (family_code IN (SELECT family_code FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete their family stores" ON stores;
CREATE POLICY "Users can delete their family stores"
ON stores FOR DELETE
USING (family_code IN (SELECT family_code FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can view their family shopping items" ON shopping_items;
CREATE POLICY "Users can view their family shopping items"
ON shopping_items FOR SELECT
USING (store_id IN (SELECT id FROM stores WHERE family_code IN (SELECT family_code FROM users WHERE id = auth.uid())));

DROP POLICY IF EXISTS "Users can insert into their family shopping items" ON shopping_items;
CREATE POLICY "Users can insert into their family shopping items"
ON shopping_items FOR INSERT
WITH CHECK (store_id IN (SELECT id FROM stores WHERE family_code IN (SELECT family_code FROM users WHERE id = auth.uid())));

DROP POLICY IF EXISTS "Users can update their family shopping items" ON shopping_items;
CREATE POLICY "Users can update their family shopping items"
ON shopping_items FOR UPDATE
USING (store_id IN (SELECT id FROM stores WHERE family_code IN (SELECT family_code FROM users WHERE id = auth.uid())));

DROP POLICY IF EXISTS "Users can delete their family shopping items" ON shopping_items;
CREATE POLICY "Users can delete their family shopping items"
ON shopping_items FOR DELETE
USING (store_id IN (SELECT id FROM stores WHERE family_code IN (SELECT family_code FROM users WHERE id = auth.uid())));

DROP POLICY IF EXISTS "Users can view their family purchase history" ON purchase_history;
CREATE POLICY "Users can view their family purchase history"
ON purchase_history FOR SELECT
USING (store_id IN (SELECT id FROM stores WHERE family_code IN (SELECT family_code FROM users WHERE id = auth.uid())));

DROP POLICY IF EXISTS "Users can insert into their family purchase history" ON purchase_history;
CREATE POLICY "Users can insert into their family purchase history"
ON purchase_history FOR INSERT
WITH CHECK (store_id IN (SELECT id FROM stores WHERE family_code IN (SELECT family_code FROM users WHERE id = auth.uid())));

-- Enable realtime
alter publication supabase_realtime add table users;
alter publication supabase_realtime add table stores;
alter publication supabase_realtime add table shopping_items;
alter publication supabase_realtime add table purchase_history;
