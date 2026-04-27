import { supabase } from "@/integrations/supabase/client";
import { CurrencyCode, CurrencyRate, CURRENCIES } from "@/types/currency";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const STORAGE_KEY = "currency_settings";

interface CurrencySettings {
  displayCurrency: CurrencyCode;
  rates: CurrencyRate[];
}

const defaults: CurrencySettings = {
  displayCurrency: "BRL",
  rates: [],
};

// ── Supabase persistence ─────────────────────────────────────────────────────

async function loadFromDB(): Promise<CurrencySettings> {
  try {
    const { data, error } = await db
      .from("global_settings")
      .select("value")
      .eq("key", STORAGE_KEY)
      .maybeSingle();

    if (error) {
      console.error("[currencyService] Error loading from DB:", error);
      return defaults;
    }

    if (data?.value) {
      return { ...defaults, ...(data.value as CurrencySettings) };
    }

    return defaults;
  } catch (err) {
    console.error("[currencyService] Unexpected error loading:", err);
    return defaults;
  }
}

async function saveToDB(settings: CurrencySettings): Promise<void> {
  const { error } = await db
    .from("global_settings")
    .upsert({ key: STORAGE_KEY, value: settings }, { onConflict: "key" });

  if (error) {
    console.error("[currencyService] Error saving to DB:", error);
    throw new Error(error.message || "Erro ao salvar configurações de moeda.");
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function getDisplayCurrency(): Promise<CurrencyCode> {
  const settings = await loadFromDB();
  return settings.displayCurrency;
}

export async function getCurrencyRates(): Promise<CurrencyRate[]> {
  const settings = await loadFromDB();
  return settings.rates;
}

export async function getCurrencyRate(targetCurrency: CurrencyCode): Promise<number> {
  if (targetCurrency === "BRL") return 1;
  const settings = await loadFromDB();
  const rate = settings.rates.find((r) => r.targetCurrency === targetCurrency);
  return rate?.rate || 1;
}

export function convertFromBRL(amount: number, rate: number): number {
  return amount * rate;
}

export function formatCurrency(amount: number, currency: CurrencyCode = "BRL"): string {
  const currencyInfo = CURRENCIES[currency];
  const specialCurrencies: CurrencyCode[] = ["AOA", "MZN"];

  if (specialCurrencies.includes(currency)) {
    const formattedNumber = new Intl.NumberFormat(currencyInfo.locale, {
      minimumFractionDigits: currencyInfo.decimalPlaces,
      maximumFractionDigits: currencyInfo.decimalPlaces,
    }).format(amount);
    return `${formattedNumber} ${currencyInfo.symbol}`;
  }

  try {
    return new Intl.NumberFormat(currencyInfo.locale, {
      style: "currency",
      currency: currency,
      minimumFractionDigits: currencyInfo.decimalPlaces,
      maximumFractionDigits: currencyInfo.decimalPlaces,
    }).format(amount);
  } catch {
    const formattedNumber = new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: currencyInfo.decimalPlaces,
      maximumFractionDigits: currencyInfo.decimalPlaces,
    }).format(amount);
    return `${currencyInfo.symbol} ${formattedNumber}`;
  }
}

export async function updateDisplayCurrency(currency: CurrencyCode): Promise<boolean> {
  try {
    const current = await loadFromDB();
    await saveToDB({ ...current, displayCurrency: currency });
    return true;
  } catch {
    return false;
  }
}

export async function updateCurrencyRate(targetCurrency: CurrencyCode, rate: number): Promise<boolean> {
  try {
    const settings = await loadFromDB();
    const idx = settings.rates.findIndex((r) => r.targetCurrency === targetCurrency);

    if (idx >= 0) {
      settings.rates[idx].rate = rate;
      settings.rates[idx].source = "manual";
      settings.rates[idx].updatedAt = new Date().toISOString();
    } else {
      settings.rates.push({
        id: crypto.randomUUID(),
        baseCurrency: "BRL",
        targetCurrency,
        rate,
        source: "manual",
        updatedAt: new Date().toISOString(),
      });
    }

    await saveToDB(settings);
    return true;
  } catch {
    return false;
  }
}
