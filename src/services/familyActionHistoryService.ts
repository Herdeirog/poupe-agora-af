import type { FamilyActionHistoryDB } from "@/types/familyPlan";

export interface FamilyActionRecord {
  id: string;
  familyPlanId: string;
  actorUserId: string;
  actorEmail?: string;
  targetUserId?: string;
  targetEmail?: string;
  actionType: string;
  actionLabel: string;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  notes?: string;
  isAdminAction: boolean;
  notificationSent: boolean;
  createdAt: string;
}

const STORAGE_KEY = 'family_action_history';

interface StoredAction {
  id: string;
  family_plan_id: string;
  actor_user_id: string;
  actor_email?: string;
  target_user_id?: string;
  target_email?: string;
  action_type: string;
  action_label: string;
  previous_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
  notes?: string;
  is_admin_action: boolean;
  notification_sent: boolean;
  created_at: string;
}

function getStoredHistory(): StoredAction[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveHistory(history: StoredAction[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 500)));
}

function transformAction(action: StoredAction): FamilyActionRecord {
  return {
    id: action.id,
    familyPlanId: action.family_plan_id,
    actorUserId: action.actor_user_id,
    actorEmail: action.actor_email,
    targetUserId: action.target_user_id,
    targetEmail: action.target_email,
    actionType: action.action_type,
    actionLabel: action.action_label,
    previousValue: action.previous_value,
    newValue: action.new_value,
    notes: action.notes,
    isAdminAction: action.is_admin_action,
    notificationSent: action.notification_sent,
    createdAt: action.created_at,
  };
}

// Get action history for a family plan
export async function getFamilyActionHistory(familyPlanId: string): Promise<FamilyActionRecord[]> {
  const history = getStoredHistory();
  return history
    .filter(a => a.family_plan_id === familyPlanId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 50)
    .map(transformAction);
}

// Get admin actions for a specific user's family plan
export async function getAdminFamilyActions(userId: string): Promise<FamilyActionRecord[]> {
  const history = getStoredHistory();
  return history
    .filter(a => a.actor_user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 50)
    .map(transformAction);
}

// Log a family action manually
export async function logFamilyAction(params: {
  familyPlanId: string;
  actorUserId: string;
  actorEmail?: string;
  targetUserId?: string;
  targetEmail?: string;
  actionType: string;
  actionLabel: string;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  notes?: string;
  isAdminAction?: boolean;
  notificationSent?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const history = getStoredHistory();
    
    const newAction: StoredAction = {
      id: crypto.randomUUID(),
      family_plan_id: params.familyPlanId,
      actor_user_id: params.actorUserId,
      actor_email: params.actorEmail,
      target_user_id: params.targetUserId,
      target_email: params.targetEmail,
      action_type: params.actionType,
      action_label: params.actionLabel,
      previous_value: params.previousValue,
      new_value: params.newValue,
      notes: params.notes,
      is_admin_action: params.isAdminAction ?? false,
      notification_sent: params.notificationSent ?? false,
      created_at: new Date().toISOString(),
    };
    
    history.unshift(newAction);
    saveHistory(history);
    
    return { success: true };
  } catch (error: any) {
    console.error("Error logging family action:", error);
    return { success: false, error: error.message };
  }
}

// Get action type label for display
export function getActionTypeLabel(actionType: string): string {
  const labels: Record<string, string> = {
    member_invited: "Convite Enviado",
    member_joined: "Membro Entrou",
    member_removed: "Membro Removido",
    member_blocked: "Membro Bloqueado",
    member_unblocked: "Membro Desbloqueado",
    invites_blocked: "Convites Bloqueados",
    invites_unblocked: "Convites Liberados",
    force_downgrade: "Downgrade Forçado",
    plan_upgraded: "Plano Atualizado",
    invite_expired: "Convite Expirado",
    role_changed: "Função Alterada",
  };

  return labels[actionType] || actionType;
}

// Get action icon color for display
export function getActionColor(actionType: string): string {
  const colors: Record<string, string> = {
    member_invited: "text-blue-500",
    member_joined: "text-green-500",
    member_removed: "text-destructive",
    member_blocked: "text-amber-500",
    member_unblocked: "text-green-500",
    invites_blocked: "text-amber-500",
    invites_unblocked: "text-green-500",
    force_downgrade: "text-destructive",
    plan_upgraded: "text-primary",
    invite_expired: "text-yellow-500",
    role_changed: "text-purple-500",
  };

  return colors[actionType] || "text-muted-foreground";
}
