-- Adicionar colunas para metas progressivas na tabela goals
ALTER TABLE goals
ADD COLUMN IF NOT EXISTS type text DEFAULT 'progressive' NOT NULL,
ADD COLUMN IF NOT EXISTS initial_value numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_weeks integer DEFAULT 52,
ADD COLUMN IF NOT EXISTS current_week integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS start_date date,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- Criar tabela goal_weeks para rastrear cada semana
CREATE TABLE IF NOT EXISTS goal_weeks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  week_number integer NOT NULL,
  week_value numeric NOT NULL,
  status text DEFAULT 'pending' NOT NULL,
  paid_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT unique_goal_week UNIQUE (goal_id, week_number)
);

-- Habilitar RLS
ALTER TABLE goal_weeks ENABLE ROW LEVEL SECURITY;

-- Política RLS para goal_weeks
CREATE POLICY "Users manage own goal weeks" ON goal_weeks
  FOR ALL USING (user_id = auth.uid());

-- Index para performance
CREATE INDEX IF NOT EXISTS idx_goal_weeks_goal_id ON goal_weeks(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_weeks_user_id ON goal_weeks(user_id);