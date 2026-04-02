export type NotificationType = 'whatsapp' | 'email' | 'sistema';
export type NotificationStatus = 'entregue' | 'falha' | 'pendente' | 'agendada';

export interface NotificationLog {
  id: string;
  timestamp: string;
  status: string;
  message: string;
}

export interface AdminNotification {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  type: NotificationType;
  title: string;
  content: string;
  status: NotificationStatus;
  attempts: number;
  maxAttempts: number;
  scheduledAt?: string;
  sentAt?: string;
  createdAt: string;
  logs: NotificationLog[];
}

export interface AdminNotificationFilters {
  search?: string;
  type?: NotificationType;
  status?: NotificationStatus;
}
