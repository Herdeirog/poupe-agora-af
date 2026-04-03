import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function reset() {
    const usersToReset = [
        { email: 'marcos@gmail.com', password: '123' },
        { email: 'admin@nex.com.br', password: 'admin' },
        { email: 'cliente@poupeagora.com', password: '123' }
    ];

    const { data: users } = await supabase.auth.admin.listUsers();

    for (const u of usersToReset) {
        const user = users.users.find(x => x.email === u.email);
        if (user) {
            await supabase.auth.admin.updateUserById(user.id, { password: u.password });
            console.log(`Reset ${u.email} to ${u.password}`);
        }
    }
}

reset();
