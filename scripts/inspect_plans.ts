
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
const supabase = createClient(env['VITE_SUPABASE_URL']!, env['SUPABASE_SERVICE_ROLE_KEY']!);

async function inspect() {
    console.log('Inspecionando tabela plans...');

    // Tenta selecionar todas as colunas esperadas
    const { data, error } = await supabase
        .from('plans')
        .select('*');

    if (error) {
        console.error('Erro ao ler plans:', error);
    } else {
        console.log(`Encontrados ${data.length} planos.`);
        if (data.length > 0) {
            console.log('Exemplo de registro:', data[0]);
        } else {
            console.log('Tabela vazia.');
        }
    }
}

inspect();
