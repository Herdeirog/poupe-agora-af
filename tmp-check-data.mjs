import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://oxyrybdblpxgyrdxykpv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94eXJ5YmRibHB4Z3lyZHh5a3B2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDMwNjcxNiwiZXhwIjoyMDg5ODgyNzE2fQ.A_kS-0v0j7euti-Fk14GtGxHS1qYfkLeUVT29w_jLl0'
);

// Ler todos os registros para ver o que está gravado de verdade
const { data, error } = await supabase
  .from('global_settings')
  .select('*');

console.log('Registros encontrados:');
data?.forEach(r => console.log(`  key: ${r.key} | value:`, JSON.stringify(r.value)));

// Verificar a definição da coluna value
const { data: colData } = await supabase.rpc('exec_sql', { sql: `
  SELECT column_name, data_type, udt_name
  FROM information_schema.columns
  WHERE table_name = 'global_settings'
  ORDER BY ordinal_position;
`}).catch(() => ({ data: null }));

if (colData) console.log('Colunas:', colData);
