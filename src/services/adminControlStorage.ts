import { logAdminAction } from "./adminActionHistoryService";

export interface UserControlState {
  agendaBlocked: boolean;
  remindersPaused: boolean;
  googleDisabled: boolean;
  adminNotes: string | null;
}

const STORAGE_KEY = 'admin_user_controls';

function getStoredControls(): Record<string, UserControlState> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveControls(controls: Record<string, UserControlState>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(controls));
}

function getDefaultState(): UserControlState {
  return {
    agendaBlocked: false,
    remindersPaused: false,
    googleDisabled: false,
    adminNotes: null,
  };
}

export async function getUserControlState(userId: string): Promise<UserControlState | null> {
  const controls = getStoredControls();
  return controls[userId] || getDefaultState();
}

export async function blockUserAgenda(userId: string, adminId: string): Promise<boolean> {
  const controls = getStoredControls();
  if (!controls[userId]) controls[userId] = getDefaultState();
  controls[userId].agendaBlocked = true;
  saveControls(controls);

  await logAdminAction(
    adminId,
    userId,
    'block_agenda',
    'Bloqueou Agenda Financeira',
    { agenda_blocked: false },
    { agenda_blocked: true }
  );

  return true;
}

export async function unblockUserAgenda(userId: string, adminId: string): Promise<boolean> {
  const controls = getStoredControls();
  if (!controls[userId]) controls[userId] = getDefaultState();
  controls[userId].agendaBlocked = false;
  saveControls(controls);

  await logAdminAction(
    adminId,
    userId,
    'unblock_agenda',
    'Desbloqueou Agenda Financeira',
    { agenda_blocked: true },
    { agenda_blocked: false }
  );

  return true;
}

export async function pauseUserReminders(userId: string, adminId: string): Promise<boolean> {
  const controls = getStoredControls();
  if (!controls[userId]) controls[userId] = getDefaultState();
  controls[userId].remindersPaused = true;
  saveControls(controls);

  await logAdminAction(
    adminId,
    userId,
    'pause_reminders',
    'Pausou Lembretes',
    { reminders_paused: false },
    { reminders_paused: true }
  );

  return true;
}

export async function resumeUserReminders(userId: string, adminId: string): Promise<boolean> {
  const controls = getStoredControls();
  if (!controls[userId]) controls[userId] = getDefaultState();
  controls[userId].remindersPaused = false;
  saveControls(controls);

  await logAdminAction(
    adminId,
    userId,
    'resume_reminders',
    'Reativou Lembretes',
    { reminders_paused: true },
    { reminders_paused: false }
  );

  return true;
}

export async function resetUserReminders(userId: string, adminId: string): Promise<boolean> {
  await logAdminAction(
    adminId,
    userId,
    'reset_reminders',
    'Resetou Todos os Lembretes',
    { reminders_count: 0 },
    { reminders_count: 0 }
  );

  return true;
}

export async function disableUserGoogle(userId: string, adminId: string): Promise<boolean> {
  const controls = getStoredControls();
  if (!controls[userId]) controls[userId] = getDefaultState();
  controls[userId].googleDisabled = true;
  saveControls(controls);

  await logAdminAction(
    adminId,
    userId,
    'disable_google',
    'Desativou Google Agenda',
    { google_disabled: false },
    { google_disabled: true }
  );

  return true;
}

export async function enableUserGoogle(userId: string, adminId: string): Promise<boolean> {
  const controls = getStoredControls();
  if (!controls[userId]) controls[userId] = getDefaultState();
  controls[userId].googleDisabled = false;
  saveControls(controls);

  await logAdminAction(
    adminId,
    userId,
    'enable_google',
    'Habilitou Google Agenda',
    { google_disabled: true },
    { google_disabled: false }
  );

  return true;
}

export async function updateAdminNotes(userId: string, adminId: string, notes: string): Promise<boolean> {
  const controls = getStoredControls();
  const oldNotes = controls[userId]?.adminNotes ?? null;
  
  if (!controls[userId]) controls[userId] = getDefaultState();
  controls[userId].adminNotes = notes;
  saveControls(controls);

  await logAdminAction(
    adminId,
    userId,
    'update_notes',
    'Atualizou Notas Admin',
    { admin_notes: oldNotes },
    { admin_notes: notes }
  );

  return true;
}
