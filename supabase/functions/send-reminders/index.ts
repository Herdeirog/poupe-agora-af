import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL');
const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');
const evolutionInstanceName = Deno.env.get('EVOLUTION_INSTANCE_NAME');

interface ReminderWithDetails {
  id: string;
  user_id: string;
  commitment_id: string;
  timing: string;
  custom_days: number | null;
  recurrence_mode: string | null;
  channel: string;
  status: string;
  next_alert_date: string;
  last_sent_at: string | null;
  commitment_title: string;
  commitment_amount: number | null;
  commitment_type: string;
  commitment_date: string;
  user_whatsapp: string | null;
  user_name: string | null;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function getTimingText(timing: string, customDays: number | null): string {
  switch (timing) {
    case 'same_day':
      return 'Hoje é o dia de vencimento';
    case '1_day_before':
      return 'Vencimento amanhã';
    case '3_days_before':
      return 'Vencimento em 3 dias';
    case 'custom':
      return `Vencimento em ${customDays} dias`;
    default:
      return 'Vencimento próximo';
  }
}

function buildWhatsAppMessage(reminder: ReminderWithDetails): string {
  const greeting = reminder.user_name ? `Olá, ${reminder.user_name.split(' ')[0]}! 👋` : 'Olá! 👋';
  const timingText = getTimingText(reminder.timing, reminder.custom_days);
  const amountText = reminder.commitment_amount 
    ? `💰 Valor: ${formatCurrency(reminder.commitment_amount)}` 
    : '';
  
  let typeEmoji = '📋';
  let typeText = '';
  if (reminder.commitment_type === 'recurring') {
    typeEmoji = '🔄';
    typeText = '(Recorrente)';
  } else if (reminder.commitment_type === 'installment') {
    typeEmoji = '💳';
    typeText = '(Parcelado)';
  }

  const message = `
${greeting}

⏰ *LEMBRETE FINANCEIRO*

${typeEmoji} *${reminder.commitment_title}* ${typeText}

📅 ${timingText}
📆 Data: ${new Date(reminder.commitment_date).toLocaleDateString('pt-BR')}
${amountText}

Não esqueça de organizar suas finanças! 💪

_Enviado pelo Poupe Agora_
`.trim();

  return message;
}

async function sendWhatsAppMessage(whatsapp: string, message: string): Promise<boolean> {
  if (!evolutionApiUrl || !evolutionApiKey || !evolutionInstanceName) {
    console.error('Evolution API not configured');
    return false;
  }

  // Clean phone number (remove non-digits)
  const cleanPhone = whatsapp.replace(/\D/g, '');
  
  // Ensure it has country code (Brazil = 55)
  const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

  try {
    const response = await fetch(`${evolutionApiUrl}/message/sendText/${evolutionInstanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey,
      },
      body: JSON.stringify({
        number: fullPhone,
        text: message,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Evolution API error: ${response.status} - ${errorText}`);
      return false;
    }

    const result = await response.json();
    console.log(`Message sent successfully to ${fullPhone}:`, result);
    return true;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const today = new Date().toISOString().split('T')[0];

    console.log(`[send-reminders] Starting reminder check for date: ${today}`);

    // Fetch all active reminders due today
    const { data: reminders, error: remindersError } = await supabase
      .from('commitment_reminders')
      .select(`
        id,
        user_id,
        commitment_id,
        timing,
        custom_days,
        recurrence_mode,
        channel,
        status,
        next_alert_date,
        last_sent_at
      `)
      .eq('status', 'active')
      .eq('channel', 'whatsapp')
      .lte('next_alert_date', today);

    if (remindersError) {
      console.error('Error fetching reminders:', remindersError);
      throw remindersError;
    }

    console.log(`[send-reminders] Found ${reminders?.length || 0} reminders to process`);

    if (!reminders || reminders.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No reminders to send', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let sentCount = 0;
    let errorCount = 0;

    for (const reminder of reminders) {
      try {
        // Fetch commitment details
        const { data: commitment, error: commitmentError } = await supabase
          .from('financial_commitments')
          .select('title, amount, type, date')
          .eq('id', reminder.commitment_id)
          .single();

        if (commitmentError || !commitment) {
          console.error(`Commitment not found for reminder ${reminder.id}`);
          continue;
        }

        // Fetch user profile (for whatsapp number)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('whatsapp, full_name')
          .eq('id', reminder.user_id)
          .single();

        if (profileError || !profile || !profile.whatsapp) {
          console.error(`No WhatsApp number for user ${reminder.user_id}`);
          continue;
        }

        // Build the full reminder object
        const fullReminder: ReminderWithDetails = {
          ...reminder,
          commitment_title: commitment.title,
          commitment_amount: commitment.amount,
          commitment_type: commitment.type,
          commitment_date: commitment.date,
          user_whatsapp: profile.whatsapp,
          user_name: profile.full_name,
        };

        // Build and send the message
        const message = buildWhatsAppMessage(fullReminder);
        const sent = await sendWhatsAppMessage(profile.whatsapp, message);

        if (sent) {
          sentCount++;

          // Update reminder: set last_sent_at and calculate next_alert_date
          const updateData: any = {
            last_sent_at: new Date().toISOString(),
          };

          // For recurring with all_occurrences mode, calculate next alert date
          if (reminder.recurrence_mode === 'all_occurrences') {
            // This would need commitment frequency info to calculate properly
            // For now, we'll leave it to be updated when the commitment date changes
          } else if (reminder.recurrence_mode === 'next_only') {
            // Mark as paused after sending once
            updateData.status = 'paused';
          }

          await supabase
            .from('commitment_reminders')
            .update(updateData)
            .eq('id', reminder.id);

          console.log(`[send-reminders] Successfully sent reminder ${reminder.id}`);
        } else {
          errorCount++;
          console.error(`[send-reminders] Failed to send reminder ${reminder.id}`);
        }
      } catch (err) {
        errorCount++;
        console.error(`[send-reminders] Error processing reminder ${reminder.id}:`, err);
      }
    }

    console.log(`[send-reminders] Completed. Sent: ${sentCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${reminders.length} reminders`,
        sent: sentCount,
        errors: errorCount 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[send-reminders] Fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
