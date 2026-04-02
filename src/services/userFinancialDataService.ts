import { supabase } from "@/integrations/supabase/client";
import { getUserControlState } from "./adminControlStorage";

export interface UserFinancialSummary {
  agenda: {
    status: 'active' | 'blocked';
    totalCommitments: number;
  };
  installments: {
    active: number;
    limit: number;
  };
  reminders: {
    active: number;
    paused: number;
  };
  googleCalendar: {
    status: 'connected' | 'disconnected' | 'blocked';
    email?: string;
    lastSync?: string;
  };
}

export async function getUserFinancialSummary(userId: string, planLimit: number = 10): Promise<UserFinancialSummary | null> {
  try {
    // Buscar profile para email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return null;
    }

    // Buscar controles do admin do localStorage
    const controls = await getUserControlState(userId);

    // Buscar total de compromissos do localStorage
    const commitments = JSON.parse(localStorage.getItem('poupe_agora_financial_commitments') || '[]');
    const userCommitments = commitments.filter((c: any) => c.userId === userId);
    const totalCommitments = userCommitments.length;
    const activeInstallments = userCommitments.filter((c: any) => c.type === 'installment' && c.status === 'pending').length;

    // Buscar lembretes do localStorage
    const reminders = JSON.parse(localStorage.getItem('commitment_reminders') || '[]');
    const userReminders = reminders.filter((r: any) => r.userId === userId);
    const activeReminders = userReminders.filter((r: any) => r.status === 'active').length;
    const pausedReminders = userReminders.filter((r: any) => r.status === 'paused').length;

    // Determinar status do Google Calendar
    let googleStatus: 'connected' | 'disconnected' | 'blocked' = 'disconnected';
    if (controls?.googleDisabled) {
      googleStatus = 'blocked';
    }

    return {
      agenda: {
        status: controls?.agendaBlocked ? 'blocked' : 'active',
        totalCommitments: totalCommitments ?? 0,
      },
      installments: {
        active: activeInstallments ?? 0,
        limit: planLimit,
      },
      reminders: {
        active: activeReminders,
        paused: pausedReminders,
      },
      googleCalendar: {
        status: googleStatus,
        email: profile?.email ?? undefined,
      },
    };
  } catch (error) {
    console.error('Error fetching user financial summary:', error);
    return null;
  }
}
