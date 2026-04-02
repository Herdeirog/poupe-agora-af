import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-worker-token",
};

const BATCH_SIZE = 10;
const LOCK_DURATION_SECONDS = 30;
const MAX_ATTEMPTS = 3;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Optional authentication via header
  const workerToken = req.headers.get("x-worker-token");
  const authHeader = req.headers.get("authorization");
  
  // Accept either service role key or worker token
  if (!authHeader?.includes(supabaseServiceKey) && !workerToken) {
    // For now, allow without auth for easier testing - remove in production
    console.log("Warning: No authentication provided");
  }

  const processedJobs: string[] = [];
  const failedJobs: string[] = [];
  const skippedJobs: string[] = [];

  try {
    // ============================================================
    // FETCH QUEUED JOBS
    // ============================================================
    const now = new Date().toISOString();
    
    const { data: jobs, error: jobsError } = await supabase
      .from("message_queue")
      .select(`
        id,
        user_id,
        inbound_message_id,
        status,
        attempts,
        next_run_at,
        created_at
      `)
      .eq("status", "queued")
      .lte("next_run_at", now)
      .order("next_run_at", { ascending: true })
      .limit(BATCH_SIZE);

    if (jobsError) {
      console.error("Error fetching jobs:", jobsError);
      return new Response(JSON.stringify({ error: "Failed to fetch jobs" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!jobs || jobs.length === 0) {
      console.log("No jobs to process");
      return new Response(JSON.stringify({ 
        ok: true, 
        message: "No jobs to process",
        processed: 0,
        failed: 0,
        skipped: 0 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${jobs.length} jobs to process`);

    // Get Evolution settings once
    const { data: evolutionSettings } = await supabase
      .from("integration_evolution")
      .select("*")
      .eq("active", true)
      .limit(1)
      .maybeSingle();

    // Check real Evolution connection status before processing
    let evolutionConnected = false;
    if (evolutionSettings) {
      try {
        const statusResponse = await fetch(`${supabaseUrl}/functions/v1/evolution-status`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
        });
        
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          evolutionConnected = statusData.connected === true;
          console.log(`Evolution connection status: ${evolutionConnected ? 'connected' : 'disconnected'}`);
        }
      } catch (error) {
        console.error("Error checking Evolution status:", error);
      }
    }

    // If Evolution is not connected, skip processing and log warning
    if (!evolutionConnected) {
      console.warn("Evolution API is not connected. Skipping message processing.");
      return new Response(JSON.stringify({ 
        ok: false, 
        message: "Evolution API não está conectada. Mensagens não serão processadas.",
        evolution_status: "disconnected",
        processed: 0,
        failed: 0,
        skipped: jobs.length 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // PROCESS EACH JOB
    // ============================================================
    for (const job of jobs) {
      try {
        console.log(`Processing job ${job.id} for user ${job.user_id}`);

        // 1. TRY TO ACQUIRE LOCK
        const lockResult = await tryAcquireLock(supabase, job.user_id);
        
        if (!lockResult.acquired) {
          console.log(`User ${job.user_id} is locked, skipping job ${job.id}`);
          skippedJobs.push(job.id);
          continue;
        }

        // 2. MARK JOB AS PROCESSING
        await supabase
          .from("message_queue")
          .update({ status: "processing", updated_at: new Date().toISOString() })
          .eq("id", job.id);

        // 3. FETCH INBOUND MESSAGE DATA
        const { data: inboundMessage, error: inboundError } = await supabase
          .from("inbound_messages")
          .select("*")
          .eq("id", job.inbound_message_id)
          .single();

        if (inboundError || !inboundMessage) {
          throw new Error(`Inbound message not found: ${job.inbound_message_id}`);
        }

        // ============================================================
        // 3.5 PROCESS MEDIA VIA VISION SERVICE (image/audio)
        // ============================================================
        let messageToProcess = inboundMessage.content;
        
        // PROCESS IMAGE
        if (inboundMessage.message_type === "image" && inboundMessage.media_base64) {
          console.log(`Processing image via VisionService for job ${job.id}`);
          
          try {
            const visionResponse = await fetch(`${supabaseUrl}/functions/v1/vision-service`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                type: "image",
                media_base64: inboundMessage.media_base64,
                mime_type: "image/jpeg",
              }),
            });

            if (visionResponse.ok) {
              const visionResult = await visionResponse.json();
              
              if (visionResult.success && visionResult.extracted_text) {
                const caption = inboundMessage.content !== "[Imagem]" ? inboundMessage.content : "";
                messageToProcess = caption 
                  ? `${caption}\n\n[COMPROVANTE DETECTADO]\n${visionResult.extracted_text}`
                  : `[COMPROVANTE DETECTADO]\n${visionResult.extracted_text}`;
                
                console.log(`Vision extracted text (${visionResult.extracted_text.length} chars)`);
              } else {
                console.warn(`VisionService returned no text for job ${job.id}`);
                messageToProcess = inboundMessage.content + "\n[Não foi possível ler a imagem]";
              }
            } else {
              console.error(`VisionService error for job ${job.id}:`, await visionResponse.text());
              messageToProcess = inboundMessage.content + "\n[Erro ao processar imagem]";
            }
          } catch (visionError) {
            console.error(`VisionService exception for job ${job.id}:`, visionError);
            messageToProcess = inboundMessage.content + "\n[Erro ao processar imagem]";
          }
        }

        // PROCESS AUDIO
        if (inboundMessage.message_type === "audio" && inboundMessage.media_base64) {
          console.log(`Processing audio via VisionService for job ${job.id}`);
          
          try {
            const visionResponse = await fetch(`${supabaseUrl}/functions/v1/vision-service`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                type: "audio",
                media_base64: inboundMessage.media_base64,
                mime_type: "audio/ogg", // WhatsApp PTT default
              }),
            });

            if (visionResponse.ok) {
              const visionResult = await visionResponse.json();
              
              if (visionResult.success && visionResult.extracted_text) {
                messageToProcess = `[ÁUDIO TRANSCRITO]\n${visionResult.extracted_text}`;
                console.log(`Audio transcribed (${visionResult.extracted_text.length} chars) in ${visionResult.duration_ms}ms`);
              } else {
                console.warn(`VisionService returned no transcription for job ${job.id}`);
                messageToProcess = "[Áudio recebido mas não foi possível transcrever]";
              }
            } else {
              console.error(`VisionService audio error for job ${job.id}:`, await visionResponse.text());
              messageToProcess = "[Erro ao transcrever áudio]";
            }
          } catch (audioError) {
            console.error(`VisionService audio exception for job ${job.id}:`, audioError);
            messageToProcess = "[Erro ao transcrever áudio]";
          }
        }

        // 4. CALL AGENT ROUTER
        const routerResponse = await fetch(`${supabaseUrl}/functions/v1/agent-router`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            userId: job.user_id,
            message: messageToProcess,
            messageType: inboundMessage.message_type,
            remoteJid: inboundMessage.remote_jid,
            rawPayload: inboundMessage.raw_payload,
            jobId: job.id,
            inboundMessageId: inboundMessage.id,
            wasImageProcessed: inboundMessage.message_type === "image" && inboundMessage.media_base64 ? true : false,
          }),
        });

        if (!routerResponse.ok) {
          const errorText = await routerResponse.text();
          throw new Error(`Agent router failed: ${errorText}`);
        }

        const routerResult = await routerResponse.json();
        console.log(`Router response for job ${job.id}:`, routerResult);

        // 5. SEND RESPONSE VIA WA-SEND
        if (routerResult.response && evolutionSettings) {
          const sendResponse = await fetch(`${supabaseUrl}/functions/v1/wa-send`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              remoteJid: inboundMessage.remote_jid,
              message: routerResult.response,
              evolutionSettings,
            }),
          });

          if (!sendResponse.ok) {
            console.error(`wa-send failed for job ${job.id}:`, await sendResponse.text());
            // Don't throw - message was processed, just failed to send
          }
        }

        // 6. MARK INBOUND MESSAGE AS PROCESSED
        await supabase
          .from("inbound_messages")
          .update({ 
            processed: true, 
            processed_at: new Date().toISOString() 
          })
          .eq("id", job.inbound_message_id);

        // 7. MARK JOB AS DONE
        await supabase
          .from("message_queue")
          .update({ 
            status: "done", 
            updated_at: new Date().toISOString() 
          })
          .eq("id", job.id);

        // 8. RELEASE LOCK
        await releaseLock(supabase, job.user_id);

        processedJobs.push(job.id);
        console.log(`Job ${job.id} completed successfully`);

      } catch (error) {
        console.error(`Error processing job ${job.id}:`, error);

        const newAttempts = (job.attempts || 0) + 1;
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        if (newAttempts >= MAX_ATTEMPTS) {
          // Mark as failed permanently
          await supabase
            .from("message_queue")
            .update({ 
              status: "failed", 
              attempts: newAttempts,
              last_error: errorMessage,
              updated_at: new Date().toISOString() 
            })
            .eq("id", job.id);

          failedJobs.push(job.id);
        } else {
          // Schedule retry with backoff
          const backoffSeconds = newAttempts * 30;
          const nextRunAt = new Date(Date.now() + backoffSeconds * 1000).toISOString();

          await supabase
            .from("message_queue")
            .update({ 
              status: "queued", 
              attempts: newAttempts,
              next_run_at: nextRunAt,
              last_error: errorMessage,
              updated_at: new Date().toISOString() 
            })
            .eq("id", job.id);
        }

        // Always release lock on error
        await releaseLock(supabase, job.user_id);
      }
    }

    return new Response(JSON.stringify({ 
      ok: true,
      processed: processedJobs.length,
      failed: failedJobs.length,
      skipped: skippedJobs.length,
      processedJobs,
      failedJobs,
      skippedJobs,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Worker error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ============================================================
// LOCK HELPERS
// ============================================================

async function tryAcquireLock(
  supabase: any, 
  userId: string
): Promise<{ acquired: boolean }> {
  const now = new Date();
  const lockUntil = new Date(now.getTime() + LOCK_DURATION_SECONDS * 1000);

  // Check if there's an existing lock
  const { data: existingLock } = await supabase
    .from("processing_locks")
    .select("locked_until")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingLock && new Date(existingLock.locked_until) > now) {
    // Lock is still active
    return { acquired: false };
  }

  // Upsert lock
  const { error } = await supabase
    .from("processing_locks")
    .upsert({
      user_id: userId,
      locked_until: lockUntil.toISOString(),
      updated_at: now.toISOString(),
    }, { onConflict: "user_id" });

  if (error) {
    console.error("Error acquiring lock:", error);
    return { acquired: false };
  }

  return { acquired: true };
}

async function releaseLock(
  supabase: any, 
  userId: string
): Promise<void> {
  const now = new Date();
  
  await supabase
    .from("processing_locks")
    .update({ 
      locked_until: now.toISOString(),
      updated_at: now.toISOString() 
    })
    .eq("user_id", userId);
}
