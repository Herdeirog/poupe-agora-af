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
        JSON.stringify({ error: "Configurações incompletas. Verifique URL, API Key e nome da instância." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Connecting to Evolution instance: ${instance_name}`);

    // Request QR Code from Evolution API
    const response = await fetch(`${api_url}/instance/connect/${instance_name}`, {
      method: "GET",
      headers: {
        "apikey": api_key,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Evolution API error:", data);
      return new Response(
        JSON.stringify({ error: data.message || "Erro ao gerar QR Code" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("QR Code generated successfully");

    return new Response(
      JSON.stringify({ 
        ok: true, 
        qrcode: data.qrcode,
        base64: data.base64,
        pairingCode: data.pairingCode,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error connecting instance:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
