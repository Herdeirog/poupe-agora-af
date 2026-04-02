import { AdminNotification, AdminNotificationFilters } from '@/types/adminNotification';
import { supabase } from '@/lib/supabase';

function mapNotification(n: any): AdminNotification {
  return {
    id: n.id,
    userId: n.user_id,
    userName: n.profiles?.full_name || 'Desconhecido',
    userEmail: n.profiles?.email || 'N/A',
    type: n.type,
    title: n.title,
    content: n.content,
    status: n.status,
    createdAt: n.created_at,
    sentAt: n.sent_at,
    attempts: n.attempts || 0,
    maxAttempts: n.max_attempts || 3,
    logs: [],
  };
}

export async function getNotifications(filters?: AdminNotificationFilters): Promise<AdminNotification[]> {
  let query = supabase
    .from('admin_notifications')
    .select('*, profiles(full_name, email)')
    .order('created_at', { ascending: false });

  if (filters) {
    // Filter logic
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }

  return data.map(mapNotification);
}

export async function createNotification(data: Omit<AdminNotification, 'id'>): Promise<AdminNotification | null> {
  const { data: note, error } = await supabase
    .from('admin_notifications')
    .insert({
      user_id: data.userId,
      type: data.type,
      title: data.title,
      content: data.content,
      status: 'pending'
    })
    .select()
    .single();

  if (error) return null;
  return mapNotification(note);
}

// Deprecated
export function seedNotificationsIfEmpty(): void { }
export function addNotification(n: any): any[] { return []; }
