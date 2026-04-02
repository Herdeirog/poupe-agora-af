import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * VisionService - Processa imagens e áudio via OpenAI APIs
 * 
 * Entrada: { 
 *   type?: "image" | "audio",
 *   image_base64?: string, 
 *   media_base64?: string,
 *   mime_type?: string 
 * }
 * Saída: { extracted_text: string, success: boolean, type: string }
 * 
 * SEGURANÇA:
 * - Não salva mídia
 * - Não retorna mídia
 * - Apenas texto extraído
 */

async function getOpenAIKey(supabase: any): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc("get_decrypted_secret", {
      p_key_name: "OPENAI_API_KEY"
    });
    
    if (!error && data) {
      return data;
    }
  } catch (e) {
    console.log("No custom OpenAI key in database, using env");
  }
  
  return Deno.env.get("OPENAI_API_KEY") || null;
}

function getExtensionFromMime(mimeType: string): string {
  const mimeMap: Record<string, string> = {
    "audio/ogg": "ogg",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/mp4": "m4a",
    "audio/m4a": "m4a",
    "audio/wav": "wav",
    "audio/webm": "webm",
    "audio/x-wav": "wav",
  };
  return mimeMap[mimeType] || "ogg";
}

async function transcribeAudio(
  base64Audio: string,
  mimeType: string,
  openaiApiKey: string
): Promise<string> {
  console.log(`[VisionService] Transcribing audio: ${base64Audio.length} chars, mime: ${mimeType}`);
  
  // Remove data URL prefix if present
  let cleanBase64 = base64Audio;
  if (cleanBase64.includes(",")) {
    cleanBase64 = cleanBase64.split(",")[1];
  }

  // Convert base64 to Uint8Array
  const binaryString = atob(cleanBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Create FormData for Whisper API
  const extension = getExtensionFromMime(mimeType);
  const blob = new Blob([bytes], { type: mimeType });
  const formData = new FormData();
  formData.append("file", blob, `audio.${extension}`);
  formData.append("model", "whisper-1");
  formData.append("language", "pt");
  formData.append("response_format", "text");

  const startTime = Date.now();
  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openaiApiKey}`,
    },
    body: formData,
  });

  const duration = Date.now() - startTime;

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[VisionService] Whisper API error: ${response.status}`, errorText);
    throw new Error(`Whisper API error: ${response.status} - ${errorText}`);
  }

  const transcription = await response.text();
  console.log(`[VisionService] Transcription completed in ${duration}ms: ${transcription.length} chars`);
  
  return transcription.trim();
}

async function extractFromImage(
  base64Image: string,
  mimeType: string,
  openaiApiKey: string | null,
  pjCriativoApiKey: string | null
): Promise<{ text: string; apiUsed: string }> {
  // Prepare base64 data URL
  let base64Data = base64Image;
  if (base64Data.includes(",")) {
    base64Data = base64Data.split(",")[1];
  }
  
  const imageUrl = `data:${mimeType};base64,${base64Data}`;
  console.log(`[VisionService] Processing image: ${base64Data.length} chars`);

  const systemPrompt = `Você é um assistente especializado em ler comprovantes de pagamento e extrair informações financeiras.

TAREFA:
Analise a imagem do comprovante de pagamento e extraia as seguintes informações:
- Tipo de transação (PIX, TED, boleto, cartão, etc.)
- Valor da transação
- Data da transação
- Destinatário/Favorecido (se visível)
- Descrição/Referência (se houver)
- Banco/Instituição (se visível)

FORMATO DE RESPOSTA:
Responda em texto estruturado de forma clara e objetiva.
Se alguma informação não estiver visível, omita-a.
Se a imagem não for um comprovante de pagamento, descreva brevemente o que você vê.

IMPORTANTE:
- Extraia APENAS os dados visíveis
- Não invente informações
- Seja preciso com valores e datas`;

  let extractedText = "";
  let apiUsed = "";

  if (openaiApiKey) {
    apiUsed = "openai";
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Analise esta imagem e extraia as informações do comprovante de pagamento:" },
              { type: "image_url", image_url: { url: imageUrl, detail: "high" } }
            ]
          }
        ],
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[VisionService] OpenAI Vision error: ${response.status}`, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    extractedText = data.choices?.[0]?.message?.content || "";

  } else if (pjCriativoApiKey) {
    apiUsed = "pjcriativo";
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${pjCriativoApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Analise esta imagem e extraia as informações do comprovante de pagamento:" },
              { type: "image_url", image_url: { url: imageUrl } }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[VisionService] PJ Criativo AI error: ${response.status}`, errorText);
      throw new Error(`PJ Criativo AI error: ${response.status}`);
    }

    const data = await response.json();
    extractedText = data.choices?.[0]?.message?.content || "";
  }

  return { text: extractedText, apiUsed };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    const { 
      type = "image", 
      image_base64, 
      media_base64, 
      mime_type = "image/jpeg" 
    } = body;

    // Get the actual media content
    const mediaContent = media_base64 || image_base64;

    if (!mediaContent || typeof mediaContent !== "string") {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "media_base64 or image_base64 is required" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get API keys
    const openaiApiKey = await getOpenAIKey(supabase);
    const pjCriativoApiKey = Deno.env.get("PJ_CRIATIVO_API_KEY") || null;

    if (!openaiApiKey && !pjCriativoApiKey) {
      console.error("[VisionService] No AI API key configured");
      return new Response(JSON.stringify({ 
        success: false, 
        error: "AI API not configured" 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let extractedText = "";
    let apiUsed = "";
    const startTime = Date.now();

    // ============================================================
    // AUDIO TRANSCRIPTION
    // ============================================================
    if (type === "audio") {
      if (!openaiApiKey) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: "OpenAI API key required for audio transcription (Whisper)" 
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      extractedText = await transcribeAudio(mediaContent, mime_type, openaiApiKey);
      apiUsed = "openai-whisper";
    }
    // ============================================================
    // IMAGE EXTRACTION
    // ============================================================
    else {
      const result = await extractFromImage(mediaContent, mime_type, openaiApiKey, pjCriativoApiKey);
      extractedText = result.text;
      apiUsed = result.apiUsed;
    }

    const duration = Date.now() - startTime;

    if (!extractedText) {
      console.warn(`[VisionService] No text extracted from ${type}`);
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Could not extract text from ${type}` 
      }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[VisionService] Success: ${type} processed via ${apiUsed} in ${duration}ms (${extractedText.length} chars)`);

    return new Response(JSON.stringify({ 
      success: true, 
      extracted_text: extractedText,
      type,
      api_used: apiUsed,
      duration_ms: duration,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[VisionService] Error:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
