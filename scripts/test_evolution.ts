
import fs from 'fs';
import path from 'path';

// Carrega .env manualmente
const envPath = path.resolve(process.cwd(), '.env');
let env: Record<string, string> = {};

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            env[key.trim()] = value.trim();
        }
    });
}

const apiUrl = env.VITE_EVOLUTION_API_URL || env.EVOLUTION_API_URL || process.env.VITE_EVOLUTION_API_URL || process.env.EVOLUTION_API_URL;
const apiKey = env.VITE_EVOLUTION_API_KEY || env.EVOLUTION_API_KEY || process.env.VITE_EVOLUTION_API_KEY || process.env.EVOLUTION_API_KEY;

console.log('--- Teste de Conexão Evolution API ---');
console.log('URL configurada:', apiUrl ? 'Sim' : 'Não');
console.log('Key configurada:', apiKey ? 'Sim' : 'Não');

if (!apiUrl || !apiKey) {
    console.error('ERRO: Variáveis de ambiente da Evolution API não encontradas.');
    console.log('Verifique se VITE_EVOLUTION_API_URL e VITE_EVOLUTION_API_KEY estão no .env');
    process.exit(1);
}

async function testConnection() {
    try {
        console.log(`Tentando conectar em: ${apiUrl}/instance/fetchInstances`);

        const response = await fetch(`${apiUrl}/instance/fetchInstances`, {
            method: 'GET',
            headers: {
                'apikey': apiKey as string,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Conexão BEM SUCEDIDA!');
            console.log('Instâncias encontradas:', JSON.stringify(data, null, 2));
        } else {
            console.error('❌ Falha na conexão.');
            console.error('Status:', response.status);
            const text = await response.text();
            console.error('Resposta:', text);
        }
    } catch (error) {
        console.error('❌ Erro de rede ou exceção:', error);
    }
}

testConnection();
