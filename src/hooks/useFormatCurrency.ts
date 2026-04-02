import { useCurrencyContext } from '@/contexts/CurrencyContext';

export function useFormatCurrency() {
  const { formatValue, currencyInfo, currentCurrency, loading, convertValue } = useCurrencyContext();
  
  // Formata número sem símbolo de moeda (para exibição compacta)
  const formatNumber = (amountInBRL: number): string => {
    const converted = convertValue(amountInBRL);
    return converted.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };
  
  return {
    formatCurrency: formatValue,
    formatNumber,
    symbol: currencyInfo.symbol,
    currency: currentCurrency,
    loading,
  };
}
