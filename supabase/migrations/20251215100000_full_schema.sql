-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ROLES (Ensure they exist)
CREATE TABLE IF NOT EXISTS roles (
  id uuid primary key default gen_random_uuid(),
  name text unique not null
);

INSERT INTO roles (name) VALUES ('admin'), ('client') ON CONFLICT (name) DO NOTHING;

-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role_id uuid references roles(id),
  active boolean default true,
  created_at timestamptz default now()
);

-- Add missing columns to profiles
DO $$
BEGIN
    ALTER TABLE profiles ADD COLUMN email text;
    ALTER TABLE profiles ADD COLUMN telefone text;
    ALTER TABLE profiles ADD COLUMN whatsapp text;
    ALTER TABLE profiles ADD COLUMN avatar_url text;
    ALTER TABLE profiles ADD COLUMN tipo text;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade, -- NULL for global/default categories
  name text not null,
  icon text,
  color text,
  type text check (type in ('income', 'expense')),
  created_at timestamptz default now()
);

-- TRANSACTIONS
CREATE TABLE IF NOT EXISTS transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  amount numeric not null,
  type text check (type in ('income', 'expense')) not null,
  description text not null,
  category_id uuid references categories(id) on delete set null,
  date date not null default CURRENT_DATE,
  status text check (status in ('pending', 'completed', 'cancelled')) default 'completed',
  origin text, -- 'manual', 'import', 'whatsapp'
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- GOALS
CREATE TABLE IF NOT EXISTS goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  target_amount numeric not null,
  current_amount numeric default 0,
  deadline date,
  created_at timestamptz default now()
);

-- SUBSCRIPTIONS (Admin/CRM)
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  status text, -- 'active', 'canceled', 'trial', 'past_due'
  plan text,
  trial_ends_at timestamptz,
  next_billing_at timestamptz,
  amount numeric,
  origin text,
  created_at timestamptz default now()
);

-- ADMIN NOTIFICATIONS
CREATE TABLE IF NOT EXISTS admin_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  content text,
  read boolean default false,
  type text, -- 'info', 'warning', 'success'
  created_at timestamptz default now()
);

-- RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Helper function for admin check
CREATE OR REPLACE FUNCTION is_admin(uid uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    LEFT JOIN roles r ON r.id = p.role_id
    WHERE p.id = uid AND (r.name = 'admin' OR p.tipo = 'admin')
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Policies for Categories
DROP POLICY IF EXISTS "Users can view own or default categories" ON categories;
CREATE POLICY "Users can view own or default categories" ON categories
  FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can manage own categories" ON categories;
CREATE POLICY "Users can manage own categories" ON categories
  FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all categories" ON categories;
CREATE POLICY "Admins can manage all categories" ON categories
  FOR ALL USING (is_admin(auth.uid()));

-- Policies for Transactions
DROP POLICY IF EXISTS "Users can manage own transactions" ON transactions;
CREATE POLICY "Users can manage own transactions" ON transactions
  FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all transactions" ON transactions;
CREATE POLICY "Admins can view all transactions" ON transactions
  FOR SELECT USING (is_admin(auth.uid()));

-- Policies for Goals
DROP POLICY IF EXISTS "Users can manage own goals" ON goals;
CREATE POLICY "Users can manage own goals" ON goals
  FOR ALL USING (user_id = auth.uid());

-- Policies for Subscriptions
DROP POLICY IF EXISTS "Users can view own subscription" ON subscriptions;
CREATE POLICY "Users can view own subscription" ON subscriptions
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage subscriptions" ON subscriptions;
CREATE POLICY "Admins can manage subscriptions" ON subscriptions
  FOR ALL USING (is_admin(auth.uid()));

-- Policies for Notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON admin_notifications;
CREATE POLICY "Users can view own notifications" ON admin_notifications
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage notifications" ON admin_notifications;
CREATE POLICY "Admins can manage notifications" ON admin_notifications
  FOR ALL USING (is_admin(auth.uid()));

-- UPDATE TRIGGER FUNCTION to handle new fields
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role_id uuid;
  v_name text;
BEGIN
  -- Default to 'client' role
  SELECT id INTO v_role_id FROM roles WHERE name = 'client';
  
  v_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    new.email
  );

  INSERT INTO profiles (id, full_name, role_id, email, tipo)
  VALUES (
    new.id, 
    v_name, 
    v_role_id, 
    new.email,
    'cliente' -- Default tipo
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;

  RETURN new;
END;
$$;
