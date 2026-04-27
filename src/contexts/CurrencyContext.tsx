import { createContext, useContext, useEffect, useCallback, useState, useMemo, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CurrencyCode, CurrencyRate, CurrencyInfo, CURRENCIES } from '@/types/currency';
import { getDisplayCurrency, getCurrencyRates, convertFromBRL, formatCurrency } from '@/services/currencyService';

interface CurrencyContextValue {
  currentCurrency: CurrencyCode;
  currencyInfo: CurrencyInfo;
  loading: boolean;
  formatValue: (amountInBRL: number) => string;
  convertValue: (amountInBRL: number) => number;
  refetch: () => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currentCurrency, setCurrentCurrency] = useState<CurrencyCode>('BRL');
  const [rates, setRates] = useState<CurrencyRate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [currency, ratesData] = await Promise.all([
        getDisplayCurrency(),
        getCurrencyRates(),
      ]);
      setCurrentCurrency(currency);
      setRates(ratesData);
    } catch (err) {
      console.error('[CurrencyContext] Error fetching:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Listen for admin changes to currency_settings in global_settings
    const channel = supabase
      .channel('currency-settings-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'global_settings', filter: 'key=eq.currency_settings' },
        () => { fetchData(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const currentRate = useMemo(() => {
    if (currentCurrency === 'BRL') return 1;
    return rates.find(r => r.targetCurrency === currentCurrency)?.rate || 1;
  }, [currentCurrency, rates]);

  const currencyInfo = useMemo(() => CURRENCIES[currentCurrency], [currentCurrency]);

  const convertValue = useCallback(
    (amountInBRL: number) => convertFromBRL(amountInBRL, currentRate),
    [currentRate]
  );

  const formatValue = useCallback(
    (amountInBRL: number) => formatCurrency(convertFromBRL(amountInBRL, currentRate), currentCurrency),
    [currentRate, currentCurrency]
  );

  return (
    <CurrencyContext.Provider value={{ currentCurrency, currencyInfo, loading, formatValue, convertValue, refetch: fetchData }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrencyContext(): CurrencyContextValue {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error('useCurrencyContext must be used within a CurrencyProvider');
  return context;
}
