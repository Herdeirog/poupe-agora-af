export type FamilyRole = 'admin' | 'member';
export type MemberStatus = 'active' | 'invited' | 'pending' | 'blocked' | 'removed';

export interface FamilyMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: FamilyRole;
  status: MemberStatus;
  joinedAt?: string;
}

export interface FamilyPlanData {
  id: string;
  adminId: string;
  adminEmail: string;
  maxMembers: number;
  currentMembers: number;
  members: FamilyMember[];
  planType: 'individual' | 'family';
  isAdmin: boolean;
}

// Notification types
export type NotificationType = 'invite_accepted' | 'invite_expired' | 'invite_expiring' | 'member_removed' | 'member_joined';

export interface FamilyNotification {
  id: string;
  type: NotificationType;
  memberName?: string;
  memberEmail: string;
  createdAt: string;
  expiresAt?: string;
  read: boolean;
}

// Activity types
export type ActivityType = 
  | 'member_invited' 
  | 'member_joined' 
  | 'member_removed' 
  | 'member_blocked'
  | 'member_unblocked'
  | 'invite_expired' 
  | 'role_changed' 
  | 'plan_upgraded'
  | 'force_downgrade'
  | 'invites_blocked'
  | 'invites_unblocked';

export interface FamilyActivity {
  id: string;
  type: ActivityType;
  actorName: string;
  actorEmail: string;
  targetName?: string;
  targetEmail?: string;
  description: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

// Database types
export interface FamilyPlanDB {
  id: string;
  admin_user_id: string;
  plan_type: 'family' | 'family_plus' | 'individual';
  max_members: number;
  invites_blocked: boolean;
  created_at: string;
  updated_at: string;
}

export interface FamilyMemberDB {
  id: string;
  family_plan_id: string;
  user_id?: string;
  email: string;
  name?: string;
  role: 'admin' | 'member';
  status: 'active' | 'invited' | 'blocked' | 'removed';
  invited_at: string;
  joined_at?: string;
  removed_at?: string;
  invite_expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface FamilyActionHistoryDB {
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

export interface FamilyNotificationDB {
  id: string;
  family_plan_id: string;
  target_user_id?: string;
  target_email: string;
  notification_type: 'member_removed' | 'member_blocked' | 'member_unblocked' | 'invite_sent' | 'invite_expired' | 'force_downgrade' | 'plan_upgraded';
  channel: 'email' | 'whatsapp' | 'both';
  status: 'pending' | 'sent' | 'failed' | 'skipped';
  sent_at?: string;
  error_message?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}
