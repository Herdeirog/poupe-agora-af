import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GoalReminderData {
  id: string;
  goal_id: string;
  user_id: string;
  day_of_week: number;
  time_of_day: string;
  status: string;
  next_alert_date: string;
}

interface GoalData {
  id: string;
  title: string;
  initial_value: number;
  total_weeks: number;
  current_week: number;
  status: string;
}

interface ProfileData {
  full_name: string;
  whatsapp: string;
}

const calculateWeekValue = (weekNumber: number, initialValue: number): number => {
  return weekNumber * initialValue;
};

const calculateTotalUpToWeek = (weekNumber: number, initialValue: number): number => {
  return (weekNumber * (weekNumber + 1) / 2) * initialValue;
};

const calculateGrandTotal = (totalWeeks: number, initialValue: number): number => {
  return calculateTotalUpToWeek(totalWeeks, initialValue);
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[send-goal-reminders] Starting execution...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    console.log(`[send-goal-reminders] Looking for reminders for date: ${today}`);

    // Fetch active reminders due today
    const { data: reminders, error: remindersError } = await supabase
      .from('goal_reminders')
      .select('*')
      .eq('status', 'active')
      .lte('next_alert_date', today);

    if (remindersError) {
      console.error('[send-goal-reminders] Error fetching reminders:', remindersError);
      throw remindersError;
    }

    if (!reminders || reminders.length === 0) {
      console.log('[send-goal-reminders] No reminders to process today');
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'No reminders to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[send-goal-reminders] Found ${reminders.length} reminders to process`);

    let processed = 0;
    let errors = 0;

    for (const reminder of reminders as GoalReminderData[]) {
      try {
        // Fetch goal data
        const { data: goal, error: goalError } = await supabase
          .from('goals')
          .select('*')
          .eq('id', reminder.goal_id)
          .single();

        if (goalError || !goal) {
          console.error(`[send-goal-reminders] Goal not found for reminder ${reminder.id}`);
          continue;
        }

        const goalData = goal as GoalData;

        // Skip if goal is not active
        if (goalData.status !== 'active') {
          console.log(`[send-goal-reminders] Skipping inactive goal ${goalData.id}`);
          continue;
        }

        // Fetch user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, whatsapp')
          .eq('id', reminder.user_id)
          .single();

        if (profileError || !profile) {
          console.error(`[send-goal-reminders] Profile not found for user ${reminder.user_id}`);
          continue;
        }

        const profileData = profile as ProfileData;

        if (!profileData.whatsapp) {
          console.log(`[send-goal-reminders] User ${reminder.user_id} has no WhatsApp`);
          continue;
        }

        // Count paid weeks
        const { count: paidCount } = await supabase
          .from('goal_weeks')
          .select('*', { count: 'exact', head: true })
          .eq('goal_id', goalData.id)
          .eq('status', 'paid');

        // Calculate values
        const currentWeekValue = calculateWeekValue(goalData.current_week, goalData.initial_value);
        const grandTotal = calculateGrandTotal(goalData.total_weeks, goalData.initial_value);
        const totalPaid = calculateTotalUpToWeek(paidCount || 0, goalData.initial_value);
        const progressPercent = grandTotal > 0 ? ((totalPaid / grandTotal) * 100).toFixed(1) : '0';

        // Build message
        const userName = profileData.full_name?.split(' ')[0] || 'Usuário';
        const message = `Olá, ${userName}! 👋

📊 *LEMBRETE DE META PROGRESSIVA*

🎯 *${goalData.title}*
📅 Semana ${goalData.current_week} de ${goalData.total_weeks}

💰 Valor desta semana: ${formatCurrency(currentWeekValue)}
📈 Progresso: ${progressPercent}%
✅ Total poupado: ${formatCurrency(totalPaid)}

Não esqueça de marcar sua semana como paga! 💪

_Enviado pelo Poupe Agora_`;

        console.log(`[send-goal-reminders] Sending reminder to ${profileData.whatsapp}`);

        // Send via Evolution API (if configured)
        const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL');
        const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');

        if (evolutionApiUrl && evolutionApiKey) {
          const phoneNumber = profileData.whatsapp.replace(/\D/g, '');
          
          try {
            const response = await fetch(`${evolutionApiUrl}/message/sendText/poupeagora2`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': evolutionApiKey,
              },
              body: JSON.stringify({
                number: phoneNumber,
                text: message,
              }),
            });

            if (!response.ok) {
              console.error(`[send-goal-reminders] Evolution API error:`, await response.text());
            } else {
              console.log(`[send-goal-reminders] Message sent successfully to ${phoneNumber}`);
            }
          } catch (sendError) {
            console.error(`[send-goal-reminders] Error sending message:`, sendError);
          }
        } else {
          console.log(`[send-goal-reminders] Evolution API not configured, skipping send`);
        }

        // Calculate next alert date (7 days from now)
        const nextAlertDate = new Date();
        nextAlertDate.setDate(nextAlertDate.getDate() + 7);
        const nextAlertDateStr = nextAlertDate.toISOString().split('T')[0];

        // Update reminder
        await supabase
          .from('goal_reminders')
          .update({
            next_alert_date: nextAlertDateStr,
            last_sent_at: new Date().toISOString(),
          })
          .eq('id', reminder.id);

        processed++;
      } catch (err) {
        console.error(`[send-goal-reminders] Error processing reminder ${reminder.id}:`, err);
        errors++;
      }
    }

    console.log(`[send-goal-reminders] Completed. Processed: ${processed}, Errors: ${errors}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed, 
        errors,
        total: reminders.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[send-goal-reminders] Fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
