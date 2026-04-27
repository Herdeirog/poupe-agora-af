import { createContext, useContext, useEffect, useCallback, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface TrialSettings {
  enabled: boolean;
  days: number;
}

interface TrialContextValue {
  trialEnabled: boolean;
  trialDays: number;
  loading: boolean;
  reload: () => Promise<void>;
}

const defaults: TrialSettings = { enabled: true, days: 7 };

const TrialContext = createContext<TrialContextValue>({
  trialEnabled: defaults.enabled,
  trialDays: defaults.days,
  loading: true,
  reload: async () => {},
});

export async function saveTrialSettings(settings: TrialSettings): Promise<void> {
  const { error } = await db
    .from('global_settings')
    .upsert({ key: 'trial_settings', value: settings }, { onConflict: 'key' });

  if (error) throw new Error(error.message);
}

export function TrialProvider({ children }: { children: ReactNode }) {
  const [trialSettings, setTrialSettings] = useState<TrialSettings>(defaults);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await db
        .from('global_settings')
        .select('value')
        .eq('key', 'trial_settings')
        .maybeSingle();

      if (data?.value) {
        setTrialSettings({ ...defaults, ...(data.value as TrialSettings) });
      }
    } catch (err) {
      console.error('[TrialContext] load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();

    const channel = supabase
      .channel('trial-settings-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'global_settings', filter: 'key=eq.trial_settings' },
        () => load()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [load]);

  return (
    <TrialContext.Provider value={{
      trialEnabled: trialSettings.enabled,
      trialDays: trialSettings.days,
      loading,
      reload: load,
    }}>
      {children}
    </TrialContext.Provider>
  );
}

export function useTrialContext(): TrialContextValue {
  return useContext(TrialContext);
}
