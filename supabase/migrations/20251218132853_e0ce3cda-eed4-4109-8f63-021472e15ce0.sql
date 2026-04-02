-- Adicionar coluna category_id na tabela goals com FK para categories
ALTER TABLE goals ADD COLUMN category_id uuid REFERENCES categories(id) ON DELETE SET NULL;

-- Criar índice para performance
CREATE INDEX idx_goals_category_id ON goals(category_id);