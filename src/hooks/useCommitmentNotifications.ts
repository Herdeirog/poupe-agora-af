/**
 * Hook for commitment notifications
 */

import { useMemo } from 'react';
import { FinancialCommitment } from '@/types/financialCommitment';
import { parseISO, differenceInDays, startOfDay } from 'date-fns';

export type NotificationType = 'overdue' | 'due_today' | 'due_soon';
export type NotificationPriority = 'high' | 'medium' | 'low';

export interface CommitmentNotification {
  id: string;
  type: NotificationType;
  commitment: FinancialCommitment;
  message: string;
  priority: NotificationPriority;
  daysUntilDue: number;
}

export function useCommitmentNotifications(commitments: FinancialCommitment[]) {
  const notifications = useMemo(() => {
    const today = startOfDay(new Date());
    const result: CommitmentNotification[] = [];
    
    commitments.forEach(c => {
      if (c.status === 'completed') return;
      
      const dueDate = startOfDay(parseISO(c.date));
      const daysUntilDue = differenceInDays(dueDate, today);
      
      // Atrasado
      if (daysUntilDue < 0 || c.status === 'overdue') {
        result.push({
          id: `overdue-${c.id}`,
          type: 'overdue',
          commitment: c,
          message: `"${c.title}" está atrasado há ${Math.abs(daysUntilDue)} dia(s)`,
          priority: 'high',
          daysUntilDue,
        });
      }
      // Vence hoje
      else if (daysUntilDue === 0) {
        result.push({
          id: `today-${c.id}`,
          type: 'due_today',
          commitment: c,
          message: `"${c.title}" vence hoje`,
          priority: 'high',
          daysUntilDue,
        });
      }
      // Vence em 3 dias
      else if (daysUntilDue <= 3) {
        result.push({
          id: `soon-${c.id}`,
          type: 'due_soon',
          commitment: c,
          message: `"${c.title}" vence em ${daysUntilDue} dia(s)`,
          priority: 'medium',
          daysUntilDue,
        });
      }
    });
    
    // Ordenar por prioridade (mais urgentes primeiro)
    return result.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  }, [commitments]);

  const overdueCount = useMemo(() => 
    notifications.filter(n => n.type === 'overdue').length, 
    [notifications]
  );

  const dueTodayCount = useMemo(() => 
    notifications.filter(n => n.type === 'due_today').length, 
    [notifications]
  );

  const dueSoonCount = useMemo(() => 
    notifications.filter(n => n.type === 'due_soon').length, 
    [notifications]
  );

  const totalAmount = useMemo(() => 
    notifications.reduce((sum, n) => sum + (n.commitment.amount || 0), 0),
    [notifications]
  );

  return { 
    notifications, 
    overdueCount, 
    dueTodayCount, 
    dueSoonCount,
    totalAmount,
    hasNotifications: notifications.length > 0,
  };
}
