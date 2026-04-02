import { createContext, useContext, ReactNode } from 'react';
import { useCurrency } from '@/hooks/useCurrency';
import { CurrencyCode, CurrencyInfo } from '@/types/currency';

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
  const currencyData = useCurrency();

  return (
    <CurrencyContext.Provider value={currencyData}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrencyContext(): CurrencyContextValue {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrencyContext must be used within a CurrencyProvider');
  }
  return context;
}
