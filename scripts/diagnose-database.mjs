/**
 * SCRIPT DE DIAGNÓSTICO COMPLETO DO BANCO DE DADOS
 * 
 * Este script verifica:
 * 1. Usuários cadastrados
 * 2. Perfis (profiles)
 * 3. Políticas RLS
 * 4. Estrutura das tabelas
 * 5. Configurações de autenticação
 * 
 * COMO USAR:
 * 1. Adicione sua SUPABASE_SERVICE_ROLE_KEY no arquivo .env
 * 2. Execute: node scripts/diagnose-database.js
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Erro: Variáveis de ambiente não encontradas!');
    console.error('');
    console.error('Certifique-se de que o arquivo .env contém:');
    console.error('  VITE_SUPABASE_URL=https://seu-projeto.supabase.co');
    console.error('  SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui');
    console.error('');
    console.error('Você pode encontrar essas chaves em:');
    console.error('  https://supabase.com/dashboard/project/SEU_PROJETO/settings/api');
    process.exit(1);
}

// Criar cliente com service role (acesso total)
const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

console.log('🔍 DIAGNÓSTICO COMPLETO DO BANCO DE DADOS');
console.log('==========================================\n');

async function diagnose() {
    try {
        // 1. VERIFICAR USUÁRIOS
        console.log('📋 1. VERIFICANDO USUÁRIOS (auth.users)');
        console.log('----------------------------------------');

        const { data: users, error: usersError } = await supabase.auth.admin.listUsers();

        if (usersError) {
            console.error('❌ Erro ao buscar usuários:', usersError.message);
        } else {
            console.log(`✅ Total de usuários: ${users.users.length}\n`);

            users.users.forEach((user, index) => {
                console.log(`Usuário ${index + 1}:`);
                console.log(`  ID: ${user.id}`);
                console.log(`  Email: ${user.email}`);
                console.log(`  Confirmado: ${user.email_confirmed_at ? '✅ Sim' : '❌ Não'}`);
                console.log(`  Criado em: ${new Date(user.created_at).toLocaleString('pt-BR')}`);
                console.log(`  Último login: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('pt-BR') : 'Nunca'}`);
                console.log(`  app_metadata:`, JSON.stringify(user.app_metadata, null, 2));
                console.log(`  user_metadata:`, JSON.stringify(user.user_metadata, null, 2));
                console.log('');
            });
        }

        // 2. VERIFICAR PERFIS
        console.log('\n📋 2. VERIFICANDO PERFIS (profiles)');
        console.log('----------------------------------------');

        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('*');

        if (profilesError) {
            console.error('❌ Erro ao buscar perfis:', profilesError.message);
        } else {
            console.log(`✅ Total de perfis: ${profiles.length}\n`);

            profiles.forEach((profile, index) => {
                console.log(`Perfil ${index + 1}:`);
                console.log(`  ID: ${profile.id}`);
                console.log(`  Email: ${profile.email}`);
                console.log(`  Nome: ${profile.full_name || profile.name || 'N/A'}`);
                console.log(`  Ativo: ${profile.active || profile.ativo ? '✅ Sim' : '❌ Não'}`);
                console.log(`  Criado em: ${new Date(profile.created_at).toLocaleString('pt-BR')}`);
                console.log('');
            });
        }

        // 3. VERIFICAR CORRESPONDÊNCIA USUÁRIO-PERFIL
        console.log('\n📋 3. VERIFICANDO CORRESPONDÊNCIA USUÁRIO ↔ PERFIL');
        console.log('--------------------------------------------------');

        if (users && profiles) {
            const userIds = new Set(users.users.map(u => u.id));
            const profileIds = new Set(profiles.map(p => p.id));

            // Usuários sem perfil
            const usersWithoutProfile = users.users.filter(u => !profileIds.has(u.id));
            if (usersWithoutProfile.length > 0) {
                console.log('⚠️  Usuários SEM perfil:');
                usersWithoutProfile.forEach(u => {
                    console.log(`  - ${u.email} (${u.id})`);
                });
            } else {
                console.log('✅ Todos os usuários têm perfil');
            }

            // Perfis sem usuário
            const profilesWithoutUser = profiles.filter(p => !userIds.has(p.id));
            if (profilesWithoutUser.length > 0) {
                console.log('\n⚠️  Perfis SEM usuário:');
                profilesWithoutUser.forEach(p => {
                    console.log(`  - ${p.email} (${p.id})`);
                });
            } else {
                console.log('✅ Todos os perfis têm usuário correspondente');
            }
        }

        // 4. TESTAR AUTENTICAÇÃO
        console.log('\n\n📋 4. TESTANDO AUTENTICAÇÃO');
        console.log('----------------------------------------');

        const testUsers = [
            { email: 'admin@nex.com.br', password: 'admin123' },
            { email: 'cliente@poupeagora.com', password: 'cliente123' }
        ];

        for (const testUser of testUsers) {
            console.log(`\nTestando: ${testUser.email}`);

            const { data, error } = await supabase.auth.signInWithPassword({
                email: testUser.email,
                password: testUser.password
            });

            if (error) {
                console.log(`  ❌ Falhou: ${error.message}`);

                // Verificar se o usuário existe
                const existingUser = users?.users.find(u => u.email === testUser.email);
                if (existingUser) {
                    console.log(`  ℹ️  Usuário existe no banco`);
                    console.log(`  ℹ️  Email confirmado: ${existingUser.email_confirmed_at ? 'Sim' : 'NÃO'}`);
                    console.log(`  ℹ️  app_metadata:`, existingUser.app_metadata);
                } else {
                    console.log(`  ℹ️  Usuário NÃO existe no banco`);
                }
            } else {
                console.log(`  ✅ Sucesso!`);
                console.log(`  ℹ️  User ID: ${data.user?.id}`);
                console.log(`  ℹ️  Email: ${data.user?.email}`);

                // Fazer logout
                await supabase.auth.signOut();
            }
        }

        // 5. VERIFICAR ESTRUTURA DAS TABELAS
        console.log('\n\n📋 5. VERIFICANDO ESTRUTURA DAS TABELAS');
        console.log('----------------------------------------');

        const tables = ['profiles', 'categories', 'transactions', 'goals'];

        for (const table of tables) {
            const { data, error } = await supabase
                .from(table)
                .select('*')
                .limit(1);

            if (error) {
                console.log(`❌ Tabela '${table}': ${error.message}`);
            } else {
                console.log(`✅ Tabela '${table}': OK (${data.length > 0 ? 'com dados' : 'vazia'})`);
            }
        }

        // 6. VERIFICAR POLÍTICAS RLS
        console.log('\n\n📋 6. VERIFICANDO POLÍTICAS RLS');
        console.log('----------------------------------------');

        const { data: policies, error: policiesError } = await supabase
            .rpc('get_policies'); // Esta função pode não existir

        if (policiesError) {
            console.log('⚠️  Não foi possível verificar políticas RLS automaticamente');
            console.log('   Verifique manualmente em: Dashboard → Database → Policies');
        } else {
            console.log('✅ Políticas RLS:', policies);
        }

        console.log('\n\n==========================================');
        console.log('✅ DIAGNÓSTICO COMPLETO!');
        console.log('==========================================\n');

    } catch (error) {
        console.error('\n❌ ERRO DURANTE DIAGNÓSTICO:', error);
    }
}

// Executar diagnóstico
diagnose().then(() => {
    console.log('Diagnóstico finalizado.');
    process.exit(0);
}).catch(error => {
    console.error('Erro fatal:', error);
    process.exit(1);
});
