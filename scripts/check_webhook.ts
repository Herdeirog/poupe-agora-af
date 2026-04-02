
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

const API_URL = env.VITE_EVOLUTION_API_URL;
const API_KEY = env.VITE_EVOLUTION_API_KEY;
const INSTANCE_NAME = 'poupeagora2'; // Instância que vimos anteriormente

async function checkWebhook() {
    console.log(`Verificando Webhook para instância: ${INSTANCE_NAME}...`);
    try {
        const response = await fetch(`${API_URL}/webhook/find/${INSTANCE_NAME}`, {
            method: 'GET',
            headers: {
                'apikey': API_KEY as string,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('--- Configuração de Webhook ---');
            console.dir(data, { depth: null });
        } else {
            const text = await response.text();
            console.error('Erro ao buscar webhook (Status ' + response.status + '):', text);
        }

    } catch (error: any) {
        console.error('Erro de rede:', error.message);
    }
}

checkWebhook();
