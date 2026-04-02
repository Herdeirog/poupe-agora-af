import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Erro: Variáveis de ambiente não encontradas!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

console.log('🔍 DIAGNÓSTICO DO BANCO DE DADOS\n');

async function diagnose() {
    try {
        // 1. USUÁRIOS
        console.log('📋 1. USUÁRIOS (auth.users)');
        console.log('----------------------------');
        const { data: users, error: usersError } = await supabase.auth.admin.listUsers();

        if (usersError) {
            console.error('❌ Erro:', usersError.message);
        } else {
            console.log(`✅ Total: ${users.users.length}\n`);
            users.users.forEach((u, i) => {
                console.log(`Usuário ${i + 1}:`);
                console.log(`  Email: ${u.email}`);
                console.log(`  Confirmado: ${u.email_confirmed_at ? '✅' : '❌'}`);
                console.log(`  app_metadata:`, JSON.stringify(u.app_metadata, null, 2));
                console.log('');
            });
        }

        // 2. PERFIS
        console.log('\n📋 2. PERFIS (profiles)');
        console.log('------------------------');
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('*');

        if (profilesError) {
            console.error('❌ Erro:', profilesError.message);
        } else {
            console.log(`✅ Total: ${profiles.length}\n`);
            profiles.forEach((p, i) => {
                console.log(`Perfil ${i + 1}:`);
                console.log(`  Email: ${p.email}`);
                console.log(`  Nome: ${p.full_name || p.name || 'N/A'}`);
                console.log('');
            });
        }

        // 3. TESTAR AUTENTICAÇÃO
        console.log('\n📋 3. TESTE DE AUTENTICAÇÃO');
        console.log('----------------------------');

        const testUsers = [
            { email: 'admin@nex.com.br', password: 'admin123' },
            { email: 'cliente@poupeagora.com', password: 'cliente123' }
        ];

        for (const testUser of testUsers) {
            console.log(`\nTestando: ${testUser.email}`);
            const { data, error } = await supabase.auth.signInWithPassword(testUser);

            if (error) {
                console.log(`  ❌ Falhou: ${error.message}`);
                const existingUser = users?.users.find(u => u.email === testUser.email);
                if (existingUser) {
                    console.log(`  ℹ️  Usuário existe`);
                    console.log(`  ℹ️  Email confirmado: ${existingUser.email_confirmed_at ? 'Sim' : 'NÃO ⚠️'}`);
                } else {
                    console.log(`  ℹ️  Usuário NÃO existe no banco`);
                }
            } else {
                console.log(`  ✅ Sucesso!`);
                await supabase.auth.signOut();
            }
        }

        console.log('\n\n✅ DIAGNÓSTICO COMPLETO!\n');
    } catch (error) {
        console.error('\n❌ ERRO:', error);
    }
}

diagnose().then(() => process.exit(0)).catch(err => {
    console.error('Erro fatal:', err);
    process.exit(1);
});
