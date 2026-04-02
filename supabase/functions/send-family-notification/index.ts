import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FamilyNotificationPayload {
  familyPlanId: string;
  targetEmail: string;
  targetUserId?: string;
  notificationType: string;
  channel: 'email' | 'whatsapp' | 'both';
  actorName?: string;
  metadata?: Record<string, unknown>;
}

const emailTemplates: Record<string, { subject: string; getHtml: (data: Record<string, unknown>) => string }> = {
  member_removed: {
    subject: "Você foi removido do Plano Família",
    getHtml: (data) => `<h1>Olá${data.targetName ? `, ${data.targetName}` : ''}!</h1><p>Você foi removido do plano família${data.actorName ? ` por ${data.actorName}` : ''}.</p>`
  },
  member_blocked: {
    subject: "Acesso temporariamente bloqueado",
    getHtml: (data) => `<h1>Olá${data.targetName ? `, ${data.targetName}` : ''}!</h1><p>Seu acesso ao plano família foi temporariamente bloqueado.</p>`
  },
  force_downgrade: {
    subject: "Alteração no seu plano",
    getHtml: (data) => `<h1>Olá${data.targetName ? `, ${data.targetName}` : ''}!</h1><p>O plano família foi encerrado. Sua conta foi migrada para individual.</p>`
  }
};

async function sendEmail(to: string, subject: string, html: string): Promise<{ success: boolean; error?: string }> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.log("RESEND_API_KEY not configured");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "Plano Família <onboarding@resend.dev>", to: [to], subject, html }),
    });
    if (!response.ok) return { success: false, error: await response.text() };
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function sendWhatsApp(phone: string, message: string): Promise<{ success: boolean; error?: string }> {
  const evolutionUrl = Deno.env.get("EVOLUTION_API_URL");
  const evolutionKey = Deno.env.get("EVOLUTION_API_KEY");
  const instanceName = Deno.env.get("EVOLUTION_INSTANCE_NAME");
  if (!evolutionUrl || !evolutionKey || !instanceName) {
    return { success: false, error: "Evolution API not configured" };
  }
  try {
    const response = await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": evolutionKey },
      body: JSON.stringify({ number: phone, text: message }),
    });
    if (!response.ok) return { success: false, error: await response.text() };
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const payload: FamilyNotificationPayload = await req.json();
    console.log("Notification request:", payload);

    const { familyPlanId, targetEmail, targetUserId, notificationType, channel, actorName, metadata } = payload;

    let targetName: string | undefined;
    let targetPhone: string | undefined;
    if (targetUserId) {
      const { data: profile } = await supabase.from("profiles").select("full_name, whatsapp").eq("id", targetUserId).single();
      if (profile) { targetName = profile.full_name || undefined; targetPhone = profile.whatsapp || undefined; }
    }

    const templateData = { targetName, targetEmail, actorName, ...metadata };
    let emailSent = false, whatsappSent = false, errorMessage: string | undefined;

    if (channel === 'email' || channel === 'both') {
      const template = emailTemplates[notificationType];
      if (template) {
        const result = await sendEmail(targetEmail, template.subject, template.getHtml(templateData));
        emailSent = result.success;
        if (!result.success) errorMessage = result.error;
      }
    }

    if ((channel === 'whatsapp' || channel === 'both') && targetPhone) {
      const result = await sendWhatsApp(targetPhone, `Notificação: ${notificationType}`);
      whatsappSent = result.success;
      if (!result.success && !errorMessage) errorMessage = result.error;
    }

    const finalStatus = emailSent || whatsappSent ? 'sent' : (errorMessage?.includes('not configured') ? 'skipped' : 'failed');

    await supabase.from("family_notifications").insert({
      family_plan_id: familyPlanId, target_user_id: targetUserId, target_email: targetEmail,
      notification_type: notificationType, channel, status: finalStatus,
      sent_at: finalStatus === 'sent' ? new Date().toISOString() : null,
      error_message: errorMessage, metadata: { emailSent, whatsappSent, ...metadata },
    });

    return new Response(JSON.stringify({ success: true, emailSent, whatsappSent, status: finalStatus }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: unknown) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
};

serve(handler);
