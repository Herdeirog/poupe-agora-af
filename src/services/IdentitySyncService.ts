import { supabase } from "@/integrations/supabase/client";
import { runMigration, isMigrated } from "@/services/MigrationService";

const SYNC_FLAG_KEY = 'supabase_identity_synced';
const LEGACY_USER_KEY = 'poupe_agora_user';

interface LegacyUser {
  id?: string;
  email?: string;
  whatsapp?: string;
  phone?: string;
  telefone?: string;
  name?: string;
  nome?: string;
  supabase_id?: string;
}

interface SyncResult {
  profile_id: string;
  existed: boolean;
  profile: any;
}

/**
 * Synchronizes legacy localStorage user identity to Supabase profiles table.
 * This runs automatically, silently, and only once per user.
 */
export async function syncLegacyIdentity(): Promise<string | null> {
  // Check if already synced
  if (localStorage.getItem(SYNC_FLAG_KEY) === 'true') {
    console.log('[IdentitySync] Already synced, skipping');
    return null;
  }

  // Get legacy user from localStorage
  const storedUser = localStorage.getItem(LEGACY_USER_KEY);
  if (!storedUser) {
    console.log('[IdentitySync] No legacy user found in localStorage');
    return null;
  }

  let legacyUser: LegacyUser;
  try {
    legacyUser = JSON.parse(storedUser);
  } catch (e) {
    console.warn('[IdentitySync] Failed to parse legacy user:', e);
    return null;
  }

  // Check if user already has a supabase_id
  if (legacyUser.supabase_id) {
    console.log('[IdentitySync] User already has supabase_id:', legacyUser.supabase_id);
    localStorage.setItem(SYNC_FLAG_KEY, 'true');
    
    // Try to run migration in case it failed previously
    if (!isMigrated()) {
      try {
        console.log('[IdentitySync] Running pending data migration...');
        await runMigration(legacyUser.supabase_id);
        console.log('[IdentitySync] Pending migration completed');
      } catch (e) {
        console.warn('[IdentitySync] Pending migration error:', e);
      }
    }
    
    return legacyUser.supabase_id;
  }

  // Need at least email OR whatsapp to identify user
  const email = legacyUser.email;
  const whatsapp = legacyUser.whatsapp || legacyUser.phone || legacyUser.telefone;
  const fullName = legacyUser.name || legacyUser.nome;

  if (!email && !whatsapp) {
    console.log('[IdentitySync] No email or whatsapp found, cannot sync identity');
    return null;
  }

  console.log('[IdentitySync] Starting identity sync for:', { email, whatsapp, fullName });

  try {
    // Call the edge function to sync identity
    const { data, error } = await supabase.functions.invoke('sync-legacy-user', {
      body: {
        email: email || null,
        whatsapp: whatsapp || null,
        full_name: fullName || null,
        telefone: legacyUser.telefone || legacyUser.phone || null,
      },
    });

    if (error) {
      console.error('[IdentitySync] Edge function error:', error);
      return null;
    }

    const result = data as SyncResult;
    
    if (!result?.profile_id) {
      console.error('[IdentitySync] No profile_id returned from sync');
      return null;
    }

    console.log('[IdentitySync] Sync successful:', {
      profile_id: result.profile_id,
      existed: result.existed,
    });

    // Update localStorage with supabase_id
    legacyUser.supabase_id = result.profile_id;
    localStorage.setItem(LEGACY_USER_KEY, JSON.stringify(legacyUser));

    // Set sync flag
    localStorage.setItem(SYNC_FLAG_KEY, 'true');

    console.log('[IdentitySync] localStorage updated with supabase_id');

    // Automatic data migration after successful identity sync
    if (!isMigrated()) {
      try {
        console.log('[IdentitySync] Starting automatic data migration...');
        await runMigration(result.profile_id);
        console.log('[IdentitySync] Data migration completed successfully');
      } catch (migrationError) {
        // Log but don't throw - identity sync was successful
        console.warn('[IdentitySync] Data migration error (non-critical):', migrationError);
      }
    } else {
      console.log('[IdentitySync] Data already migrated, skipping');
    }

    return result.profile_id;

  } catch (e) {
    console.error('[IdentitySync] Unexpected error during sync:', e);
    return null;
  }
}

/**
 * Reset sync flag (useful for testing/debugging)
 */
export function resetSyncFlag(): void {
  localStorage.removeItem(SYNC_FLAG_KEY);
  console.log('[IdentitySync] Sync flag reset');
}

/**
 * Check if identity has been synced
 */
export function isIdentitySynced(): boolean {
  return localStorage.getItem(SYNC_FLAG_KEY) === 'true';
}

/**
 * Get the supabase_id from localStorage if available
 */
export function getSupabaseId(): string | null {
  try {
    const stored = localStorage.getItem(LEGACY_USER_KEY);
    if (stored) {
      const user = JSON.parse(stored);
      return user.supabase_id || null;
    }
  } catch (e) {
    console.warn('[IdentitySync] Error reading supabase_id:', e);
  }
  return null;
}
