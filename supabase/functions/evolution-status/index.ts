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
        JSON.stringify({ 
          status: "not_configured",
          connected: false,
          message: "Configurações da Evolution API não encontradas"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { api_url, api_key, instance_name, active } = settings;

    if (!api_url || !api_key || !instance_name) {
      return new Response(
        JSON.stringify({ 
          status: "incomplete",
          connected: false,
          message: "Configurações incompletas"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Checking status for instance: ${instance_name}`);

    // Get connection state from Evolution API
    const response = await fetch(`${api_url}/instance/connectionState/${instance_name}`, {
      method: "GET",
      headers: {
        "apikey": api_key,
      },
    });

    if (!response.ok) {
      // Try to fetch instance info
      const fetchResponse = await fetch(`${api_url}/instance/fetchInstances`, {
        method: "GET",
        headers: {
          "apikey": api_key,
        },
      });

      if (fetchResponse.ok) {
        const instances = await fetchResponse.json();
        const instance = Array.isArray(instances) 
          ? instances.find((i: any) => i.name === instance_name || i.instanceName === instance_name)
          : null;

        if (instance) {
          const state = instance.connectionStatus || instance.state || "disconnected";
          const isConnected = state === "open" || state === "connected";

          return new Response(
            JSON.stringify({ 
              status: state,
              connected: isConnected,
              instance_name,
              active,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      return new Response(
        JSON.stringify({ 
          status: "not_found",
          connected: false,
          message: "Instância não encontrada"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const state = data?.instance?.state || data?.state || "disconnected";
    const isConnected = state === "open" || state === "connected";

    console.log(`Instance ${instance_name} status: ${state}`);

    return new Response(
      JSON.stringify({ 
        status: state,
        connected: isConnected,
        instance_name,
        active,
        raw: data,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error checking status:", error);
    return new Response(
      JSON.stringify({ 
        status: "error",
        connected: false,
        error: error instanceof Error ? error.message : "Erro interno"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
