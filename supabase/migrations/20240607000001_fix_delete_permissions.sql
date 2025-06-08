-- Enable RLS for tables to ensure proper permissions
ALTER TABLE purchase_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

-- Create policies that allow all operations (including delete)
DROP POLICY IF EXISTS "Allow all operations on purchase_history" ON purchase_history;
CREATE POLICY "Allow all operations on purchase_history" ON purchase_history USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on shopping_items" ON shopping_items;
CREATE POLICY "Allow all operations on shopping_items" ON shopping_items USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on stores" ON stores;
CREATE POLICY "Allow all operations on stores" ON stores USING (true) WITH CHECK (true);
