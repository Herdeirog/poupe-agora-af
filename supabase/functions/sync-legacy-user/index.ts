import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, whatsapp, full_name, telefone } = await req.json();

    console.log('[sync-legacy-user] Request received:', { email, whatsapp, full_name });

    // Validate that at least email OR whatsapp was provided
    if (!email && !whatsapp) {
      console.log('[sync-legacy-user] No email or whatsapp provided');
      return new Response(
        JSON.stringify({ error: 'Email or WhatsApp is required to sync identity' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Search for existing profile by email OR whatsapp
    let query = supabase.from('profiles').select('*');
    
    if (email && whatsapp) {
      query = query.or(`email.eq.${email},whatsapp.eq.${whatsapp}`);
    } else if (email) {
      query = query.eq('email', email);
    } else if (whatsapp) {
      query = query.eq('whatsapp', whatsapp);
    }

    const { data: existingProfiles, error: searchError } = await query.limit(1);

    if (searchError) {
      console.error('[sync-legacy-user] Error searching profiles:', searchError);
      return new Response(
        JSON.stringify({ error: 'Error searching for existing profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If profile exists, return it
    if (existingProfiles && existingProfiles.length > 0) {
      const existingProfile = existingProfiles[0];
      console.log('[sync-legacy-user] Found existing profile:', existingProfile.id);
      
      return new Response(
        JSON.stringify({ 
          profile_id: existingProfile.id, 
          existed: true,
          profile: existingProfile 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // No existing profile found - create new one
    const newProfileId = crypto.randomUUID();
    console.log('[sync-legacy-user] Creating new profile with ID:', newProfileId);

    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: newProfileId,
        email: email || null,
        whatsapp: whatsapp || null,
        telefone: telefone || null,
        full_name: full_name || null,
        ativo: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('[sync-legacy-user] Error creating profile:', insertError);
      return new Response(
        JSON.stringify({ error: 'Error creating profile', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[sync-legacy-user] New profile created successfully:', newProfile.id);

    return new Response(
      JSON.stringify({ 
        profile_id: newProfile.id, 
        existed: false,
        profile: newProfile 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[sync-legacy-user] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Unexpected error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
