
import { useState, useEffect, useCallback } from 'react';
import { AdminNotification } from '@/types/adminNotification';
import {
  getNotifications,
  createNotification,
} from '@/services/adminNotificationStorage';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function useAdminNotifications() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const updateNotification = useCallback(async (id: string, data: Partial<AdminNotification>) => {
    try {
      const { error } = await supabase
        .from('admin_notifications')
        .update({
          status: data.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) throw error;
      await refreshNotifications();
    } catch (error) {
      console.error('Error updating notification:', error);
      toast.error('Erro ao atualizar notificação');
    }
  }, [refreshNotifications]);

  const addNotification = useCallback(async (notification: Omit<AdminNotification, 'id'>) => {
    await createNotification(notification);
    await refreshNotifications();
  }, [refreshNotifications]);

  const getById = useCallback(async (id: string) => {
    const allNotifications = await getNotifications();
    return allNotifications.find(n => n.id === id);
  }, []);

  const resendNotification = useCallback(async (id: string) => {
    try {
      // Buscar a notificação
      const notification = notifications.find(n => n.id === id);
      if (!notification) {
        toast.error('Notificação não encontrada');
        return;
      }

      // Atualizar status para 'pending' e incrementar attempts
      const { error } = await supabase
        .from('admin_notifications')
        .update({
          status: 'pendente',
          attempts: (notification.attempts || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) throw error;
      
      await refreshNotifications();
      toast.success('Notificação reenviada para a fila de processamento');
    } catch (error) {
      console.error('Error resending notification:', error);
      toast.error('Erro ao reenviar notificação');
    }
  }, [notifications, refreshNotifications]);

  const metrics = {
    total: notifications.length,
    entregues: notifications.filter(n => n.status === 'entregue').length,
    falhas: notifications.filter(n => n.status === 'falha').length,
    pendentes: notifications.filter(n => n.status === 'pendente').length,
    agendadas: notifications.filter(n => n.status === 'agendada').length,
  };

  return {
    notifications,
    loading,
    refreshNotifications,
    updateNotification,
    addNotification,
    resendNotification,
    getById,
    metrics,
  };
}
