import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

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
    const { api_url, api_key } = await req.json();

    if (!api_url || !api_key) {
      return new Response(
        JSON.stringify({ connected: false, error: "api_url and api_key are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Testing connection to Evolution API: ${api_url}`);

    // Try to fetch instances from Evolution API
    const response = await fetch(`${api_url}/instance/fetchInstances`, {
      method: "GET",
      headers: {
        "apikey": api_key,
        "Content-Type": "application/json",
      },
    });

    const connected = response.ok;
    const status = response.status;

    console.log(`Evolution API connection test: ${connected ? "success" : "failed"} (status: ${status})`);

    return new Response(
      JSON.stringify({ connected, status }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Evolution health check error:", error);
    return new Response(
      JSON.stringify({ 
        connected: false, 
        error: error instanceof Error ? error.message : "Connection failed" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
