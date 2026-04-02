import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Evolution settings from database
    const { data: settings, error: settingsError } = await supabase
      .from("integration_evolution")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (settingsError || !settings) {
      console.error("Error fetching Evolution settings:", settingsError);
      return new Response(
        JSON.stringify({ error: "Configurações da Evolution API não encontradas" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { api_url, api_key, instance_name } = settings;

    if (!api_url || !api_key || !instance_name) {
      return new Response(
        JSON.stringify({ error: "Configurações incompletas" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Logging out instance: ${instance_name}`);

    // Logout from Evolution API
    const response = await fetch(`${api_url}/instance/logout/${instance_name}`, {
      method: "DELETE",
      headers: {
        "apikey": api_key,
      },
    });

    if (!response.ok) {
      const data = await response.json();
      console.error("Evolution API error:", data);
      // Don't return error - instance might already be logged out
    }

    console.log("Instance logged out successfully");

    return new Response(
      JSON.stringify({ 
        ok: true, 
        message: "Sessão encerrada com sucesso"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error logging out:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
