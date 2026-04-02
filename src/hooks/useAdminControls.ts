import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  UserControlState,
  getUserControlState,
  blockUserAgenda,
  unblockUserAgenda,
  pauseUserReminders,
  resumeUserReminders,
  resetUserReminders,
  disableUserGoogle,
  enableUserGoogle,
  updateAdminNotes,
} from '@/services/adminControlStorage';

export function useAdminControls(userId: string) {
  const [controlState, setControlState] = useState<UserControlState | null>(null);
  const [loading, setLoading] = useState(false);
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);

  const getAdminId = async (): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  };

  const refreshHistory = () => {
    setHistoryRefreshTrigger(prev => prev + 1);
  };

  const loadControlState = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const state = await getUserControlState(userId);
      setControlState(state);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const toggleAgendaBlock = useCallback(async () => {
    if (!controlState) return;
    
    const adminId = await getAdminId();
    if (!adminId) {
      toast.error('Sessão expirada');
      return;
    }

    setLoading(true);
    try {
      const success = controlState.agendaBlocked 
        ? await unblockUserAgenda(userId, adminId)
        : await blockUserAgenda(userId, adminId);

      if (success) {
        setControlState(prev => prev ? { ...prev, agendaBlocked: !prev.agendaBlocked } : null);
        toast.success(controlState.agendaBlocked ? 'Agenda desbloqueada!' : 'Agenda bloqueada!');
        refreshHistory();
      } else {
        toast.error('Erro ao alterar estado da agenda');
      }
    } finally {
      setLoading(false);
    }
  }, [userId, controlState]);

  const toggleRemindersPause = useCallback(async () => {
    if (!controlState) return;
    
    const adminId = await getAdminId();
    if (!adminId) {
      toast.error('Sessão expirada');
      return;
    }

    setLoading(true);
    try {
      const success = controlState.remindersPaused 
        ? await resumeUserReminders(userId, adminId)
        : await pauseUserReminders(userId, adminId);

      if (success) {
        setControlState(prev => prev ? { ...prev, remindersPaused: !prev.remindersPaused } : null);
        toast.success(controlState.remindersPaused ? 'Lembretes reativados!' : 'Lembretes pausados!');
        refreshHistory();
      } else {
        toast.error('Erro ao alterar estado dos lembretes');
      }
    } finally {
      setLoading(false);
    }
  }, [userId, controlState]);

  const doResetReminders = useCallback(async () => {
    const adminId = await getAdminId();
    if (!adminId) {
      toast.error('Sessão expirada');
      return false;
    }

    setLoading(true);
    try {
      const success = await resetUserReminders(userId, adminId);
      if (success) {
        toast.success('Lembretes resetados com sucesso!');
        refreshHistory();
      } else {
        toast.error('Erro ao resetar lembretes');
      }
      return success;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const toggleGoogleDisable = useCallback(async () => {
    if (!controlState) return;
    
    const adminId = await getAdminId();
    if (!adminId) {
      toast.error('Sessão expirada');
      return;
    }

    setLoading(true);
    try {
      const success = controlState.googleDisabled 
        ? await enableUserGoogle(userId, adminId)
        : await disableUserGoogle(userId, adminId);

      if (success) {
        setControlState(prev => prev ? { ...prev, googleDisabled: !prev.googleDisabled } : null);
        toast.success(controlState.googleDisabled ? 'Google Agenda habilitado!' : 'Google Agenda desativado!');
        refreshHistory();
      } else {
        toast.error('Erro ao alterar estado do Google');
      }
    } finally {
      setLoading(false);
    }
  }, [userId, controlState]);

  const saveAdminNotes = useCallback(async (notes: string) => {
    const adminId = await getAdminId();
    if (!adminId) {
      toast.error('Sessão expirada');
      return false;
    }

    setLoading(true);
    try {
      const success = await updateAdminNotes(userId, adminId, notes);
      if (success) {
        setControlState(prev => prev ? { ...prev, adminNotes: notes } : null);
        toast.success('Notas atualizadas!');
        refreshHistory();
      } else {
        toast.error('Erro ao salvar notas');
      }
      return success;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return {
    controlState,
    loading,
    historyRefreshTrigger,
    loadControlState,
    toggleAgendaBlock,
    toggleRemindersPause,
    resetReminders: doResetReminders,
    toggleGoogleDisable,
    saveAdminNotes,
  };
}
