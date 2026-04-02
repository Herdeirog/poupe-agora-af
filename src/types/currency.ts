export type CurrencyCode = 'BRL' | 'USD' | 'EUR' | 'AOA' | 'MZN';

export interface CurrencyInfo {
  code: CurrencyCode;
  name: string;
  symbol: string;
  locale: string;
  decimalPlaces: number;
  flag: string;
}

export interface CurrencyRate {
  id: string;
  baseCurrency: CurrencyCode;
  targetCurrency: CurrencyCode;
  rate: number;
  source: 'manual' | 'api';
  updatedAt: string;
}

export interface GlobalSetting {
  id: string;
  key: string;
  value: unknown;
  description: string | null;
  updatedAt: string;
  updatedBy: string | null;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  BRL: { code: 'BRL', name: 'Real Brasileiro', symbol: 'R$', locale: 'pt-BR', decimalPlaces: 2, flag: '🇧🇷' },
  USD: { code: 'USD', name: 'Dólar Americano', symbol: '$', locale: 'en-US', decimalPlaces: 2, flag: '🇺🇸' },
  EUR: { code: 'EUR', name: 'Euro', symbol: '€', locale: 'de-DE', decimalPlaces: 2, flag: '🇪🇺' },
  AOA: { code: 'AOA', name: 'Kwanza Angolano', symbol: 'Kz', locale: 'pt-AO', decimalPlaces: 2, flag: '🇦🇴' },
  MZN: { code: 'MZN', name: 'Metical Moçambicano', symbol: 'MT', locale: 'pt-MZ', decimalPlaces: 2, flag: '🇲🇿' },
};

export const CURRENCY_CODES: CurrencyCode[] = ['BRL', 'USD', 'EUR', 'AOA', 'MZN'];
