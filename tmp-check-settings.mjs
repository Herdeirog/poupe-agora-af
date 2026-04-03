import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://oxyrybdblpxgyrdxykpv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94eXJ5YmRibHB4Z3lyZHh5a3B2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDMwNjcxNiwiZXhwIjoyMDg5ODgyNzE2fQ.A_kS-0v0j7euti-Fk14GtGxHS1qYfkLeUVT29w_jLl0'
);

// 1. Verificar estrutura da tabela
console.log('\n=== VERIFICANDO TABELA global_settings ===');
const { data: allData, error: allError } = await supabase
  .from('global_settings')
  .select('*');

console.log('Registros:', JSON.stringify(allData, null, 2));
if (allError) console.log('ERRO ao ler:', JSON.stringify(allError));

// 2. Tentar um upsert de teste
console.log('\n=== TESTANDO UPSERT ===');
const { data: upsertData, error: upsertError } = await supabase
  .from('global_settings')
  .upsert({ key: 'white_label_settings', value: { platformName: 'Teste', primaryColor: '#ff0000' } }, { onConflict: 'key' });

console.log('Upsert data:', JSON.stringify(upsertData));
if (upsertError) console.log('ERRO upsert:', JSON.stringify(upsertError));

// 3. Ler novamente pra confirmar
const { data: afterData } = await supabase
  .from('global_settings')
  .select('*')
  .eq('key', 'white_label_settings')
  .single();

console.log('\nApós upsert:', JSON.stringify(afterData, null, 2));
