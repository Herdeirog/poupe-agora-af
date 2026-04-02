-- ============================================
-- POUPE AGORA 3.0 - Database Schema
-- Hybrid DataProvider Support
-- ============================================

-- 1. Create app_role enum for user roles (security best practice)
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 2. User Roles Table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, role)
);

-- 3. Profiles Table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    telefone TEXT,
    whatsapp TEXT,
    avatar_url TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Categories Table
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    type TEXT DEFAULT 'expense' CHECK (type IN ('income', 'expense', 'both')),
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Transactions Table
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    description TEXT,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    origin TEXT DEFAULT 'manual' CHECK (origin IN ('manual', 'whatsapp')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Goals Table
CREATE TABLE public.goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    target_amount DECIMAL(12,2) NOT NULL,
    current_amount DECIMAL(12,2) DEFAULT 0,
    deadline DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Budgets Table (1:1 per user)
CREATE TABLE public.budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    monthly_limit DECIMAL(12,2) DEFAULT 3000,
    alert_at_70 BOOLEAN DEFAULT true,
    alert_at_90 BOOLEAN DEFAULT true,
    alert_at_100 BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Reminders Table (1:1 per user)
CREATE TABLE public.reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT true,
    time TEXT DEFAULT '08:00',
    notify_goals BOOLEAN DEFAULT true,
    notify_expenses BOOLEAN DEFAULT true,
    notify_weekly_summary BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- SECURITY DEFINER FUNCTION FOR ROLE CHECK
-- ============================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- ============================================
-- TRIGGER: Auto-create profile on user signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
    
    -- Also create default user role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'user');
    
    RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- USER ROLES policies
CREATE POLICY "Users can view own roles" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

-- PROFILES policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- CATEGORIES policies (user can see own + system categories where user_id IS NULL)
CREATE POLICY "Users view own and system categories" ON public.categories
    FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "Users insert own categories" ON public.categories
    FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own categories" ON public.categories
    FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users delete own categories" ON public.categories
    FOR DELETE USING (user_id = auth.uid());

-- TRANSACTIONS policies
CREATE POLICY "Users manage own transactions" ON public.transactions
    FOR ALL USING (user_id = auth.uid());

-- GOALS policies
CREATE POLICY "Users manage own goals" ON public.goals
    FOR ALL USING (user_id = auth.uid());

-- BUDGETS policies
CREATE POLICY "Users manage own budget" ON public.budgets
    FOR ALL USING (user_id = auth.uid());

-- REMINDERS policies
CREATE POLICY "Users manage own reminders" ON public.reminders
    FOR ALL USING (user_id = auth.uid());

-- ============================================
-- INDEXES for performance
-- ============================================
CREATE INDEX idx_transactions_user_date ON public.transactions(user_id, date DESC);
CREATE INDEX idx_transactions_category ON public.transactions(category_id);
CREATE INDEX idx_categories_user ON public.categories(user_id);
CREATE INDEX idx_goals_user ON public.goals(user_id);

-- ============================================
-- DEFAULT SYSTEM CATEGORIES (user_id = NULL)
-- ============================================
INSERT INTO public.categories (user_id, name, icon, color, type, is_default) VALUES
    (NULL, 'Alimentação', '🍔', '#FF6B6B', 'expense', true),
    (NULL, 'Transporte', '🚗', '#4ECDC4', 'expense', true),
    (NULL, 'Moradia', '🏠', '#45B7D1', 'expense', true),
    (NULL, 'Saúde', '💊', '#96CEB4', 'expense', true),
    (NULL, 'Educação', '📚', '#DDA0DD', 'expense', true),
    (NULL, 'Lazer', '🎮', '#FFD93D', 'expense', true),
    (NULL, 'Roupas', '👕', '#FF8C94', 'expense', true),
    (NULL, 'Contas', '📄', '#A8E6CF', 'expense', true),
    (NULL, 'Salário', '💰', '#6BCB77', 'income', true),
    (NULL, 'Freelance', '💻', '#4D96FF', 'income', true),
    (NULL, 'Investimentos', '📈', '#FFD93D', 'income', true),
    (NULL, 'Outros', '📦', '#B8B8B8', 'both', true);