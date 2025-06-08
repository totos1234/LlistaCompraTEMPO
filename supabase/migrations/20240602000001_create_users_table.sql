-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  family_code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable row level security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read all users
DROP POLICY IF EXISTS "Users can view all users" ON public.users;
CREATE POLICY "Users can view all users"
  ON public.users FOR SELECT
  USING (true);

-- Create policy for users to insert their own user
DROP POLICY IF EXISTS "Users can insert their own user" ON public.users;
CREATE POLICY "Users can insert their own user"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create policy for users to update their own user
DROP POLICY IF EXISTS "Users can update their own user" ON public.users;
CREATE POLICY "Users can update their own user"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Enable realtime
alter publication supabase_realtime add table public.users;