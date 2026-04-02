import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

console.log('🔧 CRIANDO PERFIS PARA OS USUÁRIOS\n');

async function createProfiles() {
    // Buscar usuários
    const { data: users } = await supabase.auth.admin.listUsers();

    console.log(`Encontrados ${users.users.length} usuários\n`);

    for (const user of users.users) {
        console.log(`Criando perfil para: ${user.email}`);

        const isAdmin = user.email === 'admin@nex.com.br';

        const { error } = await supabase
            .from('profiles')
            .upsert({
                id: user.id,
                email: user.email,
                full_name: isAdmin ? 'Administrador Nex' : 'Cliente Teste',
                active: true
            }, {
                onConflict: 'id'
            });

        if (error) {
            console.log(`  ❌ Erro: ${error.message}`);
        } else {
            console.log(`  ✅ Perfil criado/atualizado`);
        }
    }

    // Atualizar app_metadata dos usuários
    console.log('\n🔧 ATUALIZANDO METADADOS DOS USUÁRIOS\n');

    for (const user of users.users) {
        const isAdmin = user.email === 'admin@nex.com.br';

        console.log(`Atualizando: ${user.email}`);

        const { error } = await supabase.auth.admin.updateUserById(user.id, {
            app_metadata: {
                is_admin: isAdmin,
                ativo: true
            }
        });

        if (error) {
            console.log(`  ❌ Erro: ${error.message}`);
        } else {
            console.log(`  ✅ Metadados atualizados`);
        }
    }

    console.log('\n✅ TUDO PRONTO!\n');
}

createProfiles().then(() => process.exit(0)).catch(err => {
    console.error('❌ Erro:', err);
    process.exit(1);
});
