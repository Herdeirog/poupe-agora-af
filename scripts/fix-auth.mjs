import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🔍 TESTE DE CONFIGURAÇÃO DO SUPABASE\n');
console.log('URL:', supabaseUrl);
console.log('Anon Key:', anonKey ? anonKey.substring(0, 20) + '...' : 'NÃO DEFINIDA');
console.log('Service Key:', serviceRoleKey ? serviceRoleKey.substring(0, 20) + '...' : 'NÃO DEFINIDA');
console.log('\n---\n');

// Criar cliente com ANON key (como o frontend usa)
const supabaseAnon = createClient(supabaseUrl, anonKey);

// Criar cliente com SERVICE ROLE key
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function testAuth() {
    console.log('📋 TESTE 1: Login com ANON KEY (como o frontend)');
    console.log('------------------------------------------------\n');

    const testUser = {
        email: 'admin@nex.com.br',
        password: 'admin123'
    };

    console.log(`Tentando login: ${testUser.email}`);
    const { data, error } = await supabaseAnon.auth.signInWithPassword(testUser);

    if (error) {
        console.log('❌ FALHOU:', error.message);
        console.log('Código do erro:', error.status);
        console.log('Detalhes:', JSON.stringify(error, null, 2));
    } else {
        console.log('✅ SUCESSO!');
        console.log('User ID:', data.user?.id);
        console.log('Email:', data.user?.email);
        await supabaseAnon.auth.signOut();
    }

    console.log('\n---\n');
    console.log('📋 TESTE 2: Verificar usuário no banco (SERVICE ROLE)');
    console.log('-----------------------------------------------------\n');

    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const adminUser = users?.users.find(u => u.email === 'admin@nex.com.br');

    if (adminUser) {
        console.log('✅ Usuário encontrado:');
        console.log('ID:', adminUser.id);
        console.log('Email:', adminUser.email);
        console.log('Email confirmado:', adminUser.email_confirmed_at ? 'SIM ✅' : 'NÃO ❌');
        console.log('Criado em:', new Date(adminUser.created_at).toLocaleString('pt-BR'));
        console.log('Último login:', adminUser.last_sign_in_at ? new Date(adminUser.last_sign_in_at).toLocaleString('pt-BR') : 'Nunca');
        console.log('app_metadata:', JSON.stringify(adminUser.app_metadata, null, 2));
        console.log('user_metadata:', JSON.stringify(adminUser.user_metadata, null, 2));

        // Verificar se há algum bloqueio
        console.log('\nStatus da conta:');
        console.log('Banned:', adminUser.banned_until ? `SIM até ${adminUser.banned_until}` : 'NÃO ✅');
        console.log('Confirmação pendente:', adminUser.confirmation_sent_at && !adminUser.email_confirmed_at ? 'SIM ⚠️' : 'NÃO ✅');
    } else {
        console.log('❌ Usuário NÃO encontrado no banco!');
    }

    console.log('\n---\n');
    console.log('📋 TESTE 3: Resetar senha do admin (via SERVICE ROLE)');
    console.log('------------------------------------------------------\n');

    if (adminUser) {
        console.log('Tentando resetar senha para: admin123');

        const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            adminUser.id,
            { password: 'admin123' }
        );

        if (updateError) {
            console.log('❌ Erro ao resetar senha:', updateError.message);
        } else {
            console.log('✅ Senha resetada com sucesso!');
            console.log('Agora testando login novamente...\n');

            // Testar login com nova senha
            const { data: loginData, error: loginError } = await supabaseAnon.auth.signInWithPassword({
                email: 'admin@nex.com.br',
                password: 'admin123'
            });

            if (loginError) {
                console.log('❌ Login ainda falhou:', loginError.message);
            } else {
                console.log('✅ LOGIN FUNCIONOU! 🎉');
                console.log('User ID:', loginData.user?.id);
                await supabaseAnon.auth.signOut();
            }
        }
    }

    console.log('\n---\n');
    console.log('📋 TESTE 4: Criar/Atualizar usuário cliente');
    console.log('--------------------------------------------\n');

    const clienteEmail = 'cliente@poupeagora.com';
    const clienteUser = users?.users.find(u => u.email === clienteEmail);

    if (clienteUser) {
        console.log(`Usuário ${clienteEmail} já existe`);
        console.log('Resetando senha para: cliente123');

        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            clienteUser.id,
            { password: 'cliente123' }
        );

        if (updateError) {
            console.log('❌ Erro:', updateError.message);
        } else {
            console.log('✅ Senha resetada!');
        }
    } else {
        console.log(`Usuário ${clienteEmail} NÃO existe`);
        console.log('Criando usuário...');

        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: clienteEmail,
            password: 'cliente123',
            email_confirm: true,
            user_metadata: {
                full_name: 'Cliente Teste'
            },
            app_metadata: {
                is_admin: false,
                ativo: true
            }
        });

        if (createError) {
            console.log('❌ Erro ao criar:', createError.message);
        } else {
            console.log('✅ Usuário criado!');
            console.log('ID:', newUser.user?.id);

            // Criar perfil
            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .insert({
                    id: newUser.user?.id,
                    email: clienteEmail,
                    full_name: 'Cliente Teste',
                    active: true
                });

            if (profileError) {
                console.log('⚠️ Erro ao criar perfil:', profileError.message);
            } else {
                console.log('✅ Perfil criado!');
            }
        }
    }

    console.log('\n\n✅ TESTES COMPLETOS!\n');
}

testAuth().then(() => process.exit(0)).catch(err => {
    console.error('❌ Erro fatal:', err);
    process.exit(1);
});
