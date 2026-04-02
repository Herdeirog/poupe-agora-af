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

    const { api_url, api_key, instance_name, webhook_secret } = settings;

    if (!api_url || !api_key || !instance_name) {
      return new Response(
        JSON.stringify({ error: "Configurações incompletas. Verifique URL, API Key e nome da instância." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build webhook URL pointing to our wa-webhook edge function
    const webhookUrl = `${supabaseUrl}/functions/v1/wa-webhook`;

    console.log(`Setting webhook for instance ${instance_name} to ${webhookUrl}`);

    // Configure webhook on Evolution API (v2 format)
    const webhookPayload = {
      enabled: true,
      url: webhookUrl,
      webhookByEvents: false,
      webhookBase64: true,
      events: [
        "MESSAGES_UPSERT",
        "MESSAGES_UPDATE",
        "MESSAGES_DELETE",
        "CONNECTION_UPDATE",
        "QRCODE_UPDATED",
      ],
    };

    console.log(`Webhook payload:`, JSON.stringify(webhookPayload, null, 2));

    const response = await fetch(`${api_url}/webhook/set/${instance_name}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": api_key,
      },
      body: JSON.stringify(webhookPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Evolution API error:", data);
      return new Response(
        JSON.stringify({ error: data.message || "Erro ao configurar webhook" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Webhook configured successfully:", data);

    return new Response(
      JSON.stringify({ 
        ok: true, 
        webhook_url: webhookUrl,
        events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "MESSAGES_DELETE", "CONNECTION_UPDATE", "QRCODE_UPDATED"],
        message: "Webhook configurado com sucesso"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error setting webhook:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
