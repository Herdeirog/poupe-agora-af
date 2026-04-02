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

    // Get request body
    const { instance_name } = await req.json();

    if (!instance_name) {
      return new Response(
        JSON.stringify({ error: "instance_name é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    const { api_url, api_key } = settings;

    if (!api_url || !api_key) {
      return new Response(
        JSON.stringify({ error: "URL e API Key da Evolution são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Creating Evolution instance: ${instance_name}`);

    // Create instance on Evolution API
    const response = await fetch(`${api_url}/instance/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": api_key,
      },
      body: JSON.stringify({
        instanceName: instance_name,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Evolution API error:", data);
      return new Response(
        JSON.stringify({ error: data.message || "Erro ao criar instância" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update database with new instance name
    await supabase
      .from("integration_evolution")
      .update({ 
        instance_name,
        updated_at: new Date().toISOString()
      })
      .eq("id", settings.id);

    console.log("Instance created successfully:", data);

    return new Response(
      JSON.stringify({ 
        ok: true, 
        instance: data,
        message: "Instância criada com sucesso"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error creating instance:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
