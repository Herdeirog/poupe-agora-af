import { useState, useEffect, useCallback, useMemo } from 'react';
import { CurrencyCode, CurrencyRate, CURRENCIES, CurrencyInfo } from '@/types/currency';
import { 
  getDisplayCurrency, 
  getCurrencyRates, 
  convertFromBRL, 
  formatCurrency as formatCurrencyService 
} from '@/services/currencyService';

interface UseCurrencyReturn {
  currentCurrency: CurrencyCode;
  rates: CurrencyRate[];
  currencyInfo: CurrencyInfo;
  loading: boolean;
  formatValue: (amountInBRL: number) => string;
  convertValue: (amountInBRL: number) => number;
  refetch: () => Promise<void>;
}

export function useCurrency(): UseCurrencyReturn {
  const [currentCurrency, setCurrentCurrency] = useState<CurrencyCode>('BRL');
  const [rates, setRates] = useState<CurrencyRate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCurrencyData = useCallback(async () => {
    setLoading(true);
    try {
      const [currency, ratesData] = await Promise.all([
        getDisplayCurrency(),
        getCurrencyRates(),
      ]);
      setCurrentCurrency(currency);
      setRates(ratesData);
    } catch (error) {
      console.error('Error fetching currency data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrencyData();
  }, [fetchCurrencyData]);

  const currentRate = useMemo(() => {
    if (currentCurrency === 'BRL') return 1;
    const rate = rates.find(r => r.targetCurrency === currentCurrency);
    return rate?.rate || 1;
  }, [currentCurrency, rates]);

  const currencyInfo = useMemo(() => {
    return CURRENCIES[currentCurrency];
  }, [currentCurrency]);

  const convertValue = useCallback((amountInBRL: number): number => {
    return convertFromBRL(amountInBRL, currentRate);
  }, [currentRate]);

  const formatValue = useCallback((amountInBRL: number): string => {
    const convertedAmount = convertFromBRL(amountInBRL, currentRate);
    return formatCurrencyService(convertedAmount, currentCurrency);
  }, [currentRate, currentCurrency]);

  return {
    currentCurrency,
    rates,
    currencyInfo,
    loading,
    formatValue,
    convertValue,
    refetch: fetchCurrencyData,
  };
}
