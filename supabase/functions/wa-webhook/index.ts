import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-token",
};

interface EvolutionWebhookPayload {
  event?: string;
  instance?: string;
  data?: {
    key?: {
      remoteJid?: string;
      fromMe?: boolean;
      id?: string;
      participant?: string;      // Phone number for group messages
      participantAlt?: string;   // Alternative participant field
    };
    pushName?: string;
    message?: {
      conversation?: string;
      extendedTextMessage?: { text?: string };
      imageMessage?: { caption?: string; mimetype?: string };
      audioMessage?: { mimetype?: string; ptt?: boolean };
      videoMessage?: { caption?: string; mimetype?: string };
      documentMessage?: { fileName?: string; mimetype?: string };
    };
    messageType?: string;
    messageTimestamp?: number;
  };
}

// Fetch Base64 from Evolution API for media messages
async function fetchMediaBase64(
  apiUrl: string,
  apiKey: string,
  instanceName: string,
  messageKey: { id: string; remoteJid: string; fromMe: boolean }
): Promise<string | null> {
  try {
    console.log(`Fetching Base64 from Evolution API for message ${messageKey.id}...`);
    
    const response = await fetch(
      `${apiUrl}/chat/getBase64FromMediaMessage/${instanceName}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": apiKey,
        },
        body: JSON.stringify({
          message: { key: messageKey },
          convertToMp4: true,
        }),
      }
    );

    if (!response.ok) {
      console.error(`Failed to fetch base64: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    const base64 = data?.base64 || null;
    
    if (base64) {
      console.log(`Base64 fetched successfully (${base64.length} chars)`);
    }
    
    return base64;
  } catch (error) {
    console.error("Error fetching media base64:", error);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get webhook secret from header
    const webhookToken = req.headers.get("x-webhook-token") || req.headers.get("authorization")?.replace("Bearer ", "");
    
    // Get Evolution settings to validate webhook
    const { data: evolutionSettings, error: settingsError } = await supabase
      .from("integration_evolution")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (settingsError) {
      console.error("Error fetching evolution settings:", settingsError);
      return new Response(JSON.stringify({ error: "Internal error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!evolutionSettings || !evolutionSettings.active) {
      console.log("Evolution integration is disabled");
      return new Response(JSON.stringify({ ok: true, message: "Integration disabled" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate webhook secret if configured
    if (evolutionSettings.webhook_secret && webhookToken !== evolutionSettings.webhook_secret) {
      console.error("Invalid webhook token");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse webhook payload
    const payload: EvolutionWebhookPayload = await req.json();
    console.log("Received webhook payload:", JSON.stringify(payload, null, 2));

    // Normalize event name for case-insensitive comparison
    // Handles: MESSAGES_UPSERT, messages.upsert, Messages_Upsert, etc.
    const eventName = (payload.event || "").toLowerCase().replace(/_/g, ".");
    
    // Only process messages.upsert events (case-insensitive)
    if (eventName !== "messages.upsert") {
      console.log("Ignoring event:", payload.event);
      return new Response(JSON.stringify({ ok: true, message: "Event ignored" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract message data
    const messageData = payload.data;
    if (!messageData || messageData.key?.fromMe) {
      console.log("Ignoring own message or empty data");
      return new Response(JSON.stringify({ ok: true, message: "Message ignored" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const remoteJid = messageData.key?.remoteJid;
    const messageId = messageData.key?.id;
    
    if (!remoteJid || !messageId) {
      console.log("No remoteJid or messageId found");
      return new Response(JSON.stringify({ ok: true, message: "No remoteJid/messageId" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Detect if message is from a group
    const isGroup = remoteJid.endsWith("@g.us");
    
    // Extract phone number: for groups, use participant; for individual, use remoteJid
    let phoneNumber: string;
    if (isGroup) {
      // Group messages have the sender's number in participant or participantAlt
      const participantJid = messageData.key?.participantAlt || messageData.key?.participant;
      if (!participantJid) {
        console.log("Group message without participant, ignoring");
        return new Response(JSON.stringify({ ok: true, message: "No participant in group" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      phoneNumber = participantJid.split("@")[0];
      console.log(`Group message detected - Group: ${remoteJid}, Sender: ${phoneNumber}`);
    } else {
      // Individual messages: extract from remoteJid (format: 5511999999999@s.whatsapp.net)
      phoneNumber = remoteJid.split("@")[0];
    }
    
    // Extract message content and detect media type
    let messageContent = "";
    let messageType = "text";
    let isMediaMessage = false;
    
    if (messageData.message?.conversation) {
      messageContent = messageData.message.conversation;
    } else if (messageData.message?.extendedTextMessage?.text) {
      messageContent = messageData.message.extendedTextMessage.text;
    } else if (messageData.message?.imageMessage) {
      messageContent = messageData.message.imageMessage.caption || "[Imagem]";
      messageType = "image";
      isMediaMessage = true;
    } else if (messageData.message?.audioMessage) {
      const isVoiceNote = messageData.message.audioMessage.ptt;
      messageContent = isVoiceNote ? "[Áudio PTT]" : "[Áudio]";
      messageType = "audio";
      isMediaMessage = true;
    } else if (messageData.message?.videoMessage) {
      messageContent = messageData.message.videoMessage.caption || "[Vídeo]";
      messageType = "video";
      isMediaMessage = true;
    } else if (messageData.message?.documentMessage) {
      messageContent = messageData.message.documentMessage.fileName || "[Documento]";
      messageType = "document";
      isMediaMessage = true;
    }

    if (!messageContent) {
      console.log("No message content found");
      return new Response(JSON.stringify({ ok: true, message: "No content" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Message from ${phoneNumber}: ${messageContent} (type: ${messageType}, id: ${messageId})`);

    // Normalize Brazilian phone numbers for flexible search
    // Handles: 5541995404998 vs 554195404998 (with/without 9th digit)
    const normalizeForSearch = (phone: string): string[] => {
      const digits = phone.replace(/\D/g, "");
      const variations = [digits, `+${digits}`];
      
      // If it's a Brazilian number (starts with 55)
      if (digits.startsWith("55") && digits.length >= 12) {
        const withoutCountry = digits.slice(2);
        const ddd = withoutCountry.slice(0, 2);
        const number = withoutCountry.slice(2);
        
        // If has 9 digits (mobile with 9), try without the 9
        if (number.length === 9 && number.startsWith("9")) {
          const without9 = `55${ddd}${number.slice(1)}`;
          variations.push(without9, `+${without9}`);
        }
        // If has 8 digits (old format), try with the 9
        if (number.length === 8) {
          const with9 = `55${ddd}9${number}`;
          variations.push(with9, `+${with9}`);
        }
      }
      
      return [...new Set(variations)]; // Remove duplicates
    };

    const phoneVariations = normalizeForSearch(phoneNumber);
    console.log(`Searching user with phone variations: ${phoneVariations.join(", ")}`);

    // Find user by WhatsApp number (flexible search)
    const { data: userProfile, error: userError } = await supabase
      .from("profiles")
      .select("id, full_name, ativo, whatsapp")
      .or(phoneVariations.map(p => `whatsapp.eq.${p}`).join(","))
      .eq("ativo", true)
      .maybeSingle();

    if (userError) {
      console.error("Error finding user:", userError);
      return new Response(JSON.stringify({ error: "User lookup failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!userProfile) {
      console.log(`No active user found for phone: ${phoneNumber}`);
      return new Response(JSON.stringify({ ok: true, ignored: true, reason: "User not found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found user: ${userProfile.full_name} (${userProfile.id})`);

    // ============================================================
    // FETCH BASE64 FOR MEDIA MESSAGES
    // ============================================================
    let mediaBase64: string | null = null;

    if (isMediaMessage) {
      mediaBase64 = await fetchMediaBase64(
        evolutionSettings.api_url,
        evolutionSettings.api_key,
        evolutionSettings.instance_name,
        {
          id: messageId,
          remoteJid: remoteJid,
          fromMe: false,
        }
      );

      if (!mediaBase64) {
        console.warn(`Failed to fetch base64 for ${messageType} message ${messageId}`);
      }
    }

    // ============================================================
    // IDEMPOTENCY: Insert into inbound_messages with ON CONFLICT
    // ============================================================
    const { data: inboundMessage, error: inboundError } = await supabase
      .from("inbound_messages")
      .insert({
        user_id: userProfile.id,
        channel: "whatsapp",
        remote_jid: remoteJid,
        message_id: messageId,
        message_type: messageType,
        content: messageContent,
        media_base64: mediaBase64,
        raw_payload: payload,
      })
      .select("id")
      .single();

    if (inboundError) {
      // Check if it's a unique constraint violation (duplicate message)
      if (inboundError.code === "23505") {
        console.log(`Duplicate message ignored: ${messageId}`);
        return new Response(JSON.stringify({ ok: true, duplicate: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("Error inserting inbound message:", inboundError);
      return new Response(JSON.stringify({ error: "Failed to save message" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Inbound message saved: ${inboundMessage.id} (media: ${mediaBase64 ? 'yes' : 'no'})`);

    // ============================================================
    // ENQUEUE: Insert job into message_queue
    // ============================================================
    const { error: queueError } = await supabase
      .from("message_queue")
      .insert({
        user_id: userProfile.id,
        inbound_message_id: inboundMessage.id,
        status: "queued",
        attempts: 0,
        next_run_at: new Date().toISOString(),
      });

    if (queueError) {
      // If queue insert fails (shouldn't happen with unique constraint on inbound_message_id)
      console.error("Error inserting into queue:", queueError);
      // Still return 200 - message is saved, just not queued
      return new Response(JSON.stringify({ ok: true, queued: false, error: "Queue insert failed" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Message queued for processing: ${inboundMessage.id}`);

    // Trigger queue-worker immediately (fire-and-forget)
    // Using globalThis.EdgeRuntime for Supabase Edge Functions
    const triggerWorker = async () => {
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/queue-worker`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
        });
        console.log(`Queue-worker triggered: ${res.status}`);
      } catch (err) {
        console.error("Failed to trigger queue-worker:", err);
      }
    };
    
    // Use EdgeRuntime.waitUntil if available, otherwise fire-and-forget
    if (typeof (globalThis as any).EdgeRuntime !== "undefined") {
      (globalThis as any).EdgeRuntime.waitUntil(triggerWorker());
    } else {
      // Fallback: just trigger without waiting
      triggerWorker();
    }

    // Return immediately - worker processes in background
    return new Response(JSON.stringify({ 
      ok: true, 
      queued: true, 
      inbound_message_id: inboundMessage.id,
      has_media: !!mediaBase64,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
