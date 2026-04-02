import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variáveis de ambiente não configuradas!');
    console.error('Configure VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function createMissingProfile() {
    console.log('🔍 Buscando usuário cliente01@poupeagora.com...');

    // Buscar usuário no auth
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
        console.error('❌ Erro ao buscar usuários:', authError);
        return;
    }

    const user = users.find(u => u.email === 'cliente01@poupeagora.com');

    if (!user) {
        console.error('❌ Usuário cliente01@poupeagora.com não encontrado no auth.users');
        return;
    }

    console.log('✅ Usuário encontrado:', user.email, 'ID:', user.id);

    // Verificar se já existe perfil
    const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (existingProfile) {
        console.log('ℹ️  Perfil já existe:', existingProfile);
        return;
    }

    console.log('📝 Criando perfil...');

    // Criar perfil
    const { data: newProfile, error: profileError } = await supabase
        .from('profiles')
        .insert({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.full_name || user.user_metadata?.name || 'Cliente 01',
            created_at: user.created_at,
            updated_at: new Date().toISOString()
        })
        .select()
        .single();

    if (profileError) {
        console.error('❌ Erro ao criar perfil:', profileError);
        return;
    }

    console.log('✅ Perfil criado com sucesso!');
    console.log(newProfile);
}

createMissingProfile()
    .then(() => {
        console.log('\n✅ Script concluído!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Erro fatal:', error);
        process.exit(1);
    });
