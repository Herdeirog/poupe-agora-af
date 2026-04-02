import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function sendWhatsAppMessage(phone: string, message: string): Promise<boolean> {
  const evolutionApiUrl = Deno.env.get("EVOLUTION_API_URL");
  const evolutionApiKey = Deno.env.get("EVOLUTION_API_KEY");
  const evolutionInstanceName = Deno.env.get("EVOLUTION_INSTANCE_NAME");

  if (!evolutionApiUrl || !evolutionApiKey || !evolutionInstanceName) {
    console.error("Evolution API not configured");
    return false;
  }

  const cleanPhone = phone.replace(/\D/g, "");
  const fullPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;

  try {
    const response = await fetch(`${evolutionApiUrl}/message/sendText/${evolutionInstanceName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": evolutionApiKey,
      },
      body: JSON.stringify({
        number: fullPhone,
        text: message,
      }),
    });

    if (!response.ok) {
      console.error(`Evolution API error: ${response.status}`);
      return false;
    }

    console.log(`Message sent to ${fullPhone}`);
    return true;
  } catch (error) {
    console.error("Error sending WhatsApp:", error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get today's date in Brazil timezone
    const now = new Date();
    const brazilOffset = -3 * 60; // UTC-3
    const localTime = new Date(now.getTime() + (brazilOffset * 60 * 1000));
    const today = localTime.toISOString().split("T")[0];

    console.log(`[morning-reminders] Starting proactive reminders for ${today}`);

    // Fetch all users with reminders for today
    const { data: remindersToday, error } = await supabase
      .from("reminders")
      .select(`
        id,
        user_id,
        description,
        reminder_time,
        amount,
        status
      `)
      .eq("reminder_date", today)
      .eq("status", "pending");

    if (error) {
      throw error;
    }

    if (!remindersToday || remindersToday.length === 0) {
      console.log("[morning-reminders] No reminders for today");
      return new Response(JSON.stringify({
        success: true,
        message: "Nenhum lembrete para hoje",
        sent: 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get unique user IDs
    const userIds = [...new Set(remindersToday.map(r => r.user_id))];

    // Fetch profiles for these users
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, whatsapp, full_name")
      .in("id", userIds);

    if (profilesError) {
      throw profilesError;
    }

    // Create profile lookup map
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    // Group reminders by user
    const byUser = new Map<string, {
      name: string;
      whatsapp: string;
      reminders: Array<{ description: string; time?: string; amount?: number }>;
    }>();

    remindersToday.forEach((r) => {
      const profile = profileMap.get(r.user_id);
      if (!profile?.whatsapp) return;

      const userId = r.user_id;
      if (!byUser.has(userId)) {
        byUser.set(userId, {
          name: profile.full_name?.split(" ")[0] || "Usuário",
          whatsapp: profile.whatsapp,
          reminders: [],
        });
      }
      byUser.get(userId)!.reminders.push({
        description: r.description,
        time: r.reminder_time,
        amount: r.amount,
      });
    });

    let sentCount = 0;

    // Send consolidated message to each user
    for (const [_userId, userData] of byUser) {
      const { name, whatsapp, reminders } = userData;

      let message = `☀️ Bom dia, ${name}!\n\n`;
      message += `📅 *Seus lembretes para hoje:*\n\n`;

      reminders.forEach((r, i) => {
        const time = r.time ? ` às ${r.time.slice(0, 5)}` : "";
        const amount = r.amount ? ` - R$ ${Number(r.amount).toFixed(2)}` : "";
        message += `${i + 1}. ${r.description}${time}${amount}\n`;
      });

      message += `\n💪 Tenha um excelente dia!\n_Enviado pelo Poupe Agora_`;

      const sent = await sendWhatsAppMessage(whatsapp, message);
      if (sent) sentCount++;
    }

    console.log(`[morning-reminders] Sent to ${sentCount} users`);

    return new Response(JSON.stringify({
      success: true,
      message: `Enviado para ${sentCount} usuários`,
      sent: sentCount,
      total_reminders: remindersToday.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[morning-reminders] Error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
