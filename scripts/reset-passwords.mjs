import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

console.log('🔧 RESETANDO SENHAS DOS USUÁRIOS\n');

async function resetPasswords() {
    const { data: users } = await supabase.auth.admin.listUsers();

    const usersToReset = [
        { email: 'admin@nex.com.br', password: 'admin123' },
        { email: 'cliente@poupeagora.com', password: 'cliente123' }
    ];

    for (const userToReset of usersToReset) {
        const user = users?.users.find(u => u.email === userToReset.email);

        if (!user) {
            console.log(`❌ Usuário ${userToReset.email} não encontrado!`);
            continue;
        }

        console.log(`Resetando senha: ${userToReset.email}`);

        const { error } = await supabase.auth.admin.updateUserById(user.id, {
            password: userToReset.password
        });

        if (error) {
            console.log(`  ❌ Erro: ${error.message}`);
        } else {
            console.log(`  ✅ Senha resetada para: ${userToReset.password}`);
        }
    }

    console.log('\n🧪 TESTANDO LOGIN COM NOVAS SENHAS\n');

    for (const userToReset of usersToReset) {
        console.log(`Testando: ${userToReset.email}`);

        const { data, error } = await supabase.auth.signInWithPassword({
            email: userToReset.email,
            password: userToReset.password
        });

        if (error) {
            console.log(`  ❌ Login falhou: ${error.message}`);
        } else {
            console.log(`  ✅ Login funcionou! User ID: ${data.user?.id}`);
            await supabase.auth.signOut();
        }
    }

    console.log('\n✅ SENHAS RESETADAS COM SUCESSO!\n');
    console.log('Agora você pode fazer login com:');
    console.log('  Admin: admin@nex.com.br / admin123');
    console.log('  Cliente: cliente@poupeagora.com / cliente123');
}

resetPasswords().then(() => process.exit(0)).catch(err => {
    console.error('❌ Erro:', err);
    process.exit(1);
});
