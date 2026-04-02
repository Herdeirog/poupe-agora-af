import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WaSendRequest {
  remoteJid: string;
  message: string;
  evolutionSettings?: {
    api_url: string;
    instance_name: string;
    api_key: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: WaSendRequest = await req.json();
    const { remoteJid, message, evolutionSettings } = body;

    if (!remoteJid || !message) {
      return new Response(JSON.stringify({ error: "remoteJid and message are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!evolutionSettings || !evolutionSettings.api_url || !evolutionSettings.api_key) {
      console.error("Evolution settings not provided or incomplete");
      return new Response(JSON.stringify({ error: "Evolution settings missing" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { api_url, instance_name, api_key } = evolutionSettings;

    // Clean up the API URL
    const baseUrl = api_url.replace(/\/$/, "");
    const sendUrl = `${baseUrl}/message/sendText/${instance_name}`;

    console.log(`Sending message to ${remoteJid} via ${sendUrl}`);

    // Send message via Evolution API
    const response = await fetch(sendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": api_key,
      },
      body: JSON.stringify({
        number: remoteJid,
        text: message,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Evolution API error:", response.status, errorText);
      return new Response(JSON.stringify({ 
        error: "Failed to send message",
        details: errorText,
      }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    console.log("Message sent successfully:", result);

    return new Response(JSON.stringify({ 
      success: true,
      messageId: result.key?.id,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("wa-send error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
