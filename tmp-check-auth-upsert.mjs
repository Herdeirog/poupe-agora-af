import { createClient } from '@supabase/supabase-js';

// Usar a anon key (como o usuário logado no browser)
const supabase = createClient(
  'https://oxyrybdblpxgyrdxykpv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94eXJ5YmRibHB4Z3lyZHh5a3B2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMDY3MTYsImV4cCI6MjA4OTg4MjcxNn0.0qN2ci_7jpiWM0vgKJFGS3mpR78ho6rdTJipL59vjXI'
);

// Login como admin
console.log('Fazendo login como admin...');
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: 'admin@nex.com.br',
  password: 'admin123'
});
if (authError) {
  console.log('Erro login:', authError.message);
  process.exit(1);
}
console.log('Logado como:', authData.user?.email, '| Role:', authData.user?.role);

// Tentar upsert como admin autenticado
console.log('\n=== TESTANDO UPSERT COM USUÁRIO AUTENTICADO ===');
const { data, error } = await supabase
  .from('global_settings')
  .upsert({ key: 'white_label_settings', value: { platformName: 'Teste Admin', primaryColor: '#00ff00' } }, { onConflict: 'key' });

if (error) {
  console.log('ERRO:', JSON.stringify(error, null, 2));
} else {
  console.log('Sucesso! Data:', JSON.stringify(data));
}

// Verificar políticas RLS
console.log('\n=== VERIFICANDO ROLES DO USUÁRIO ===');
const { data: roleData, error: roleError } = await supabase
  .from('user_roles')
  .select('*')
  .eq('user_id', authData.user.id);
console.log('Roles:', JSON.stringify(roleData));
if (roleError) console.log('Erro roles:', roleError.message);
