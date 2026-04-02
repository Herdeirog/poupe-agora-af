import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Simple .env parser to avoid external dependencies
function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env');
        console.log('Loading .env from:', envPath);
        if (!fs.existsSync(envPath)) {
            console.log('.env file not found');
            return;
        }

        const content = fs.readFileSync(envPath, 'utf-8');
        const loadedKeys: string[] = [];

        // Handle CRLF or LF
        content.split(/\r?\n/).forEach(line => {
            line = line.trim();
            // Skip comments and empty lines
            if (!line || line.startsWith('#')) return;

            const idx = line.indexOf('=');
            if (idx !== -1) {
                const key = line.substring(0, idx).trim();
                let value = line.substring(idx + 1).trim();

                // Remove surrounding quotes if present
                if ((value.startsWith('"') && value.endsWith('"')) ||
                    (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.substring(1, value.length - 1);
                }

                // Don't overwrite existing env vars
                if (!process.env[key]) {
                    process.env[key] = value;
                    loadedKeys.push(key);
                }
            }
        });
        console.log('Loaded env keys:', loadedKeys.join(', '));
    } catch (e) {
        console.warn('Could not load .env file manually');
    }
}


loadEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Required environment variables are missing.');
    console.error('Available VITE_SUPABASE_URL:', !!supabaseUrl);
    console.error('Available SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const users = [
    {
        email: 'admin@nex.com.br',
        password: 'Admin@123',
        role: 'admin',
        name: 'Administrador Nex',
        metadata: { tipo: 'admin', full_name: 'Administrador Nex' }
    },
    {
        email: 'cliente@poupeagora.com',
        password: 'Cliente@123',
        role: 'cliente',
        name: 'Cliente Exemplo',
        metadata: { tipo: 'cliente', full_name: 'Cliente Exemplo' }
    }
];

async function seedUsers() {
    console.log('Starting user seed process...');

    for (const user of users) {
        try {
            // 1. Check if user exists (can't search by email directly with admin api effectively without listing, 
            // but creating with same email throws error, so implies existence)
            // Actually we can list users or just try to delete if we knew the ID.
            // List users to find ID by email
            const { data: { users: existingUsers }, error: listError } = await supabase.auth.admin.listUsers();

            if (listError) throw listError;

            const existingUser = existingUsers.find(u => u.email === user.email);

            if (existingUser) {
                console.log(`Deleting existing user: ${user.email}`);
                const { error: deleteError } = await supabase.auth.admin.deleteUser(existingUser.id);
                if (deleteError) throw deleteError;
            }

            // 1.5. Clean up separate profiles table (orphaned records)
            // If previous users were deleted but profiles remained, unique email constraint might block new user creation trigger
            const { error: profileDeleteError } = await supabase
                .from('profiles')
                .delete()
                .eq('email', user.email);

            if (profileDeleteError) {
                console.log(`Note: Profile delete error: ${profileDeleteError.message}`);
            } else {
                console.log(`Cleaned up potential orphaned profile for ${user.email}`);
            }

            // 2. Create user
            console.log(`Creating user: ${user.email}`);
            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                email: user.email,
                password: user.password,
                email_confirm: true,
                user_metadata: user.metadata
            });

            if (createError) {
                console.error('Detailed Create Error:', JSON.stringify(createError, null, 2));
                throw createError;
            }

            console.log(`User created successfully: ${newUser.user.id}`);

            // 3. Create/Update Profile (Public table)
            // Note: Typically triggered by Supabase on auth.users insert, but let's ensure it's correct
            // We'll upsert to profiles table to be sure
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: newUser.user.id,
                    email: user.email,
                    full_name: user.name,
                    tipo: user.role, // Assuming 'tipo' column exists as per earlier context
                    updated_at: new Date().toISOString()
                });

            if (profileError) {
                console.warn(`Warning updating profile for ${user.email}:`, profileError.message);
            } else {
                console.log(`Profile synced for ${user.email}`);
            }

        } catch (err: any) {
            console.error(`Failed to process user ${user.email}:`, err.message);
        }
    }

    console.log('Seed process completed.');
}

seedUsers();
