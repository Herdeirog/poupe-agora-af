
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Função simples para ler .env
function getEnv() {
    const envPath = path.join(process.cwd(), '.env');
    const content = fs.readFileSync(envPath, 'utf-8');
    const env: Record<string, string> = {};

    content.split('\n').forEach(line => {
        const [key, ...values] = line.split('=');
        if (key && values.length > 0) {
            env[key.trim()] = values.join('=').trim();
        }
    });
    return env;
}

const env = getEnv();
const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseServiceKey = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Erro: VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontrados no .env');
    console.log('Keys encontradas:', Object.keys(env));
    process.exit(1);
}

console.log('Conectando ao Supabase:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function fixAdmin() {
    const email = 'admin@nex.com.br';
    console.log(`Buscando usuário: ${email}...`);

    // 1. Buscar usuário no Auth
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
        console.error('Erro ao listar usuários:', authError);
        return;
    }

    const user = users.find(u => u.email === email);

    if (!user) {
        console.error(`Usuário ${email} não encontrado no Auth. Users encontrados:`, users.map(u => u.email));
        return;
    }

    console.log(`Usuário encontrado: ${user.id}`);

    // 2. Verificar/Criar Profile
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (profileError && profileError.code !== 'PGRST116') {
        console.error('Erro ao buscar perfil:', profileError);
    }

    if (!profile) {
        // Se profile não existe, criamos (sem is_admin por enquanto se o schema nao permitir)
        // Mas a chave é o app_metadata
        console.log('Perfil não encontrado. Opcional: criando perfil básico...');
        try {
            await supabase.from('profiles').insert({ id: user.id, email: email, nome: 'Administrador' });
        } catch (e) {
            console.log('Erro ao criar perfil (pode ser ignorado se for coluna):', e);
        }
    }

    // 3. Atualizar app_metadata (Flag segura do Supabase)
    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        {
            app_metadata: {
                is_admin: true,
                ativo: true
            }
        }
    );

    if (updateError) {
        console.error('Erro ao atualizar app_metadata:', updateError);
    } else {
        console.log('Permissões de admin (app_metadata) concedidas com sucesso!');
        console.log('Metadados atuais:', updatedUser.user.app_metadata);
    }
}

fixAdmin().catch(console.error);
