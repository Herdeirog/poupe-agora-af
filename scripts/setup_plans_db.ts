
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

function getEnv() {
    const envPath = path.join(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) return {};
    const content = fs.readFileSync(envPath, 'utf-8');
    const env: Record<string, string> = {};
    content.split('\n').forEach(line => {
        const [key, ...values] = line.split('=');
        if (key && values.length > 0) env[key.trim()] = values.join('=').trim();
    });
    return env;
}

const env = getEnv();
const supabaseUrl = env['VITE_SUPABASE_URL'];
const serviceKey = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !serviceKey) {
    console.error('Missing credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

const DDL = `
create table if not exists public.plans (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  price numeric not null,
  period text default '/mês',
  features jsonb not null default '[]',
  active boolean default true,
  popular boolean default false,
  external_url text,
  created_at timestamptz default now()
);

alter table public.plans enable row level security;

create policy "Enable read access for all users" on public.plans for select using (true);
create policy "Enable all access for admins" on public.plans for all using (true); -- Simplificado para service role ignorar, mas bom ter para client admin
`;

async function setup() {
    console.log('Tentando criar tabela "plans"...');

    // Tentativa 1: RPC exec_sql (comum em setups Supabase)
    const { error: rpcError } = await supabase.rpc('exec_sql', { sql: DDL });

    if (!rpcError) {
        console.log('Sucesso via RPC exec_sql!');
        return;
    }

    console.log('RPC exec_sql falhou ou não existe. Tentando inserção direta para testar existência...');

    // Tentativa 2: Verificar se tabela já existe inserindo um dummy e falhando se nao existir
    const { error: insertError } = await supabase.from('plans').select('count', { count: 'exact', head: true });

    if (!insertError) {
        console.log('Tabela "plans" JÁ EXISTE. Pulando criação.');
    } else {
        console.error('Tabela "plans" não existe e não foi possível criar via RPC. Erro:', insertError.message);
        console.log('\n--- AÇÃO NECESSÁRIA ---');
        console.log('Por favor, execute o seguinte SQL no SQL Editor do seu Supabase Dashboard:');
        console.log(DDL);
    }
}

setup();
