import { CurrencyCode, CurrencyRate, CURRENCIES } from "@/types/currency";

const STORAGE_KEY = 'currency_settings';

interface CurrencySettings {
  displayCurrency: CurrencyCode;
  rates: CurrencyRate[];
}

function getStoredSettings(): CurrencySettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : { displayCurrency: 'BRL', rates: [] };
  } catch {
    return { displayCurrency: 'BRL', rates: [] };
  }
}

function saveSettings(settings: CurrencySettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

// Get the global display currency setting
export async function getDisplayCurrency(): Promise<CurrencyCode> {
  return getStoredSettings().displayCurrency;
}

// Get all currency rates
export async function getCurrencyRates(): Promise<CurrencyRate[]> {
  return getStoredSettings().rates;
}

// Get rate for a specific currency
export async function getCurrencyRate(targetCurrency: CurrencyCode): Promise<number> {
  if (targetCurrency === 'BRL') return 1;

  const settings = getStoredSettings();
  const rate = settings.rates.find(r => r.targetCurrency === targetCurrency);
  return rate?.rate || 1;
}

// Convert amount from BRL to target currency
export function convertFromBRL(amount: number, rate: number): number {
  return amount * rate;
}

// Format currency value
export function formatCurrency(amount: number, currency: CurrencyCode = 'BRL'): string {
  const currencyInfo = CURRENCIES[currency];
  
  // Moedas que precisam de formatação especial (Intl retorna código ISO ao invés de símbolo)
  const specialCurrencies: CurrencyCode[] = ['AOA', 'MZN'];
  
  if (specialCurrencies.includes(currency)) {
    // Formatação especial: formatar número com separadores e adicionar símbolo manualmente
    const formattedNumber = new Intl.NumberFormat(currencyInfo.locale, {
      minimumFractionDigits: currencyInfo.decimalPlaces,
      maximumFractionDigits: currencyInfo.decimalPlaces,
    }).format(amount);
    
    return `${formattedNumber} ${currencyInfo.symbol}`;
  }
  
  // Formatação padrão para moedas bem suportadas (BRL, USD, EUR)
  try {
    return new Intl.NumberFormat(currencyInfo.locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currencyInfo.decimalPlaces,
      maximumFractionDigits: currencyInfo.decimalPlaces,
    }).format(amount);
  } catch {
    // Fallback seguro com separadores de milhar
    const formattedNumber = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: currencyInfo.decimalPlaces,
      maximumFractionDigits: currencyInfo.decimalPlaces,
    }).format(amount);
    
    return `${currencyInfo.symbol} ${formattedNumber}`;
  }
}

// Update global display currency (admin only)
export async function updateDisplayCurrency(currency: CurrencyCode): Promise<boolean> {
  const settings = getStoredSettings();
  settings.displayCurrency = currency;
  saveSettings(settings);
  return true;
}

// Update currency rate (admin only)
export async function updateCurrencyRate(targetCurrency: CurrencyCode, rate: number): Promise<boolean> {
  const settings = getStoredSettings();
  const idx = settings.rates.findIndex(r => r.targetCurrency === targetCurrency);
  
  if (idx >= 0) {
    settings.rates[idx].rate = rate;
    settings.rates[idx].source = 'manual';
    settings.rates[idx].updatedAt = new Date().toISOString();
  } else {
    settings.rates.push({
      id: crypto.randomUUID(),
      baseCurrency: 'BRL',
      targetCurrency,
      rate,
      source: 'manual',
      updatedAt: new Date().toISOString(),
    });
  }
  
  saveSettings(settings);
  return true;
}
