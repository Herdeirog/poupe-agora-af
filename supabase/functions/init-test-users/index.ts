import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const testUsers = [
  {
    email: 'admin@nex.com.br',
    password: 'admin123',
    full_name: 'Administrador',
    is_admin: true
  },
  {
    email: 'cliente@poupeagora.com',
    password: 'cliente123',
    full_name: 'Cliente Exemplo',
    is_admin: false
  }
];

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const results: any[] = [];

    for (const testUser of testUsers) {
      console.log(`Processing user: ${testUser.email}`);

      // Check if user already exists
      const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
      
      if (listError) {
        console.error('Error listing users:', listError);
        results.push({ email: testUser.email, status: 'error', error: listError.message });
        continue;
      }

      const existingUser = existingUsers.users.find(u => u.email === testUser.email);

      if (existingUser) {
        console.log(`User ${testUser.email} already exists, updating password...`);
        
        // Update password
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          existingUser.id,
          { 
            password: testUser.password,
            email_confirm: true,
            app_metadata: { is_admin: testUser.is_admin }
          }
        );

        if (updateError) {
          console.error(`Error updating user ${testUser.email}:`, updateError);
          results.push({ email: testUser.email, status: 'error', error: updateError.message });
          continue;
        }

        // Ensure profile exists
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: existingUser.id,
            email: testUser.email,
            full_name: testUser.full_name,
            ativo: true
          }, { onConflict: 'id' });

        if (profileError) {
          console.error(`Error upserting profile for ${testUser.email}:`, profileError);
        }

        // Ensure user_roles entry for admin
        if (testUser.is_admin) {
          const { error: roleError } = await supabase
            .from('user_roles')
            .upsert({
              user_id: existingUser.id,
              role: 'admin'
            }, { onConflict: 'user_id,role' });

          if (roleError) {
            console.error(`Error upserting admin role for ${testUser.email}:`, roleError);
          }
        }

        results.push({ email: testUser.email, status: 'updated', id: existingUser.id });
      } else {
        console.log(`Creating new user: ${testUser.email}`);
        
        // Create new user
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: testUser.email,
          password: testUser.password,
          email_confirm: true,
          app_metadata: { is_admin: testUser.is_admin },
          user_metadata: { full_name: testUser.full_name }
        });

        if (createError) {
          console.error(`Error creating user ${testUser.email}:`, createError);
          results.push({ email: testUser.email, status: 'error', error: createError.message });
          continue;
        }

        if (newUser.user) {
          // Profile should be created automatically by trigger, but ensure it exists
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: newUser.user.id,
              email: testUser.email,
              full_name: testUser.full_name,
              ativo: true
            }, { onConflict: 'id' });

          if (profileError) {
            console.error(`Error upserting profile for ${testUser.email}:`, profileError);
          }

          // Add admin role if needed
          if (testUser.is_admin) {
            const { error: roleError } = await supabase
              .from('user_roles')
              .upsert({
                user_id: newUser.user.id,
                role: 'admin'
              }, { onConflict: 'user_id,role' });

            if (roleError) {
              console.error(`Error upserting admin role for ${testUser.email}:`, roleError);
            }
          }

          results.push({ email: testUser.email, status: 'created', id: newUser.user.id });
        }
      }
    }

    console.log('Init test users completed:', results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in init-test-users:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
