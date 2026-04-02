
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split('\n').forEach(line => {
        const [key] = line.split('=');
        if (key && key.trim()) console.log(key.trim());
    });
} else {
    console.log('No .env found');
}
