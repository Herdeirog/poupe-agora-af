import { Json } from "@/integrations/supabase/types";

export interface AdminActionRecord {
  id: string;
  admin_id: string;
  target_user_id: string;
  action_type: string;
  action_label: string;
  previous_value: Json;
  new_value: Json;
  notes: string | null;
  created_at: string;
  admin_email?: string;
}

const STORAGE_KEY = 'admin_action_history';

function getStoredHistory(): AdminActionRecord[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveHistory(records: AdminActionRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, 500)));
}

export async function logAdminAction(
  adminId: string,
  targetUserId: string,
  actionType: string,
  actionLabel: string,
  previousValue?: Record<string, unknown>,
  newValue?: Record<string, unknown>,
  notes?: string
): Promise<boolean> {
  try {
    const history = getStoredHistory();
    const newRecord: AdminActionRecord = {
      id: crypto.randomUUID(),
      admin_id: adminId,
      target_user_id: targetUserId,
      action_type: actionType,
      action_label: actionLabel,
      previous_value: (previousValue ?? null) as Json,
      new_value: (newValue ?? null) as Json,
      notes: notes ?? null,
      created_at: new Date().toISOString(),
    };
    
    history.unshift(newRecord);
    saveHistory(history);
    return true;
  } catch (error) {
    console.error('Error logging admin action:', error);
    return false;
  }
}

export async function getActionHistory(targetUserId: string): Promise<AdminActionRecord[]> {
  try {
    const history = getStoredHistory();
    return history
      .filter(record => record.target_user_id === targetUserId)
      .slice(0, 50);
  } catch (error) {
    console.error('Error fetching action history:', error);
    return [];
  }
}
