import { useState, useEffect } from "react";
import { Save, RefreshCw, Edit2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  CurrencyCode, 
  CurrencyRate, 
  CURRENCIES, 
  CURRENCY_CODES 
} from "@/types/currency";
import { 
  getDisplayCurrency, 
  getCurrencyRates, 
  updateDisplayCurrency, 
  updateCurrencyRate,
  formatCurrency 
} from "@/services/currencyService";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function CurrencySettingsTab() {
  const { currentCurrency, refetch: refreshGlobalCurrency } = useCurrencyContext();
  const [displayCurrency, setDisplayCurrency] = useState<CurrencyCode>(currentCurrency);
  const [rates, setRates] = useState<CurrencyRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingRate, setEditingRate] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Sincronizar estado local com contexto global
  useEffect(() => {
    setDisplayCurrency(currentCurrency);
  }, [currentCurrency]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [currency, ratesData] = await Promise.all([
        getDisplayCurrency(),
        getCurrencyRates(),
      ]);
      setDisplayCurrency(currency);
      setRates(ratesData);
    } catch (error) {
      console.error('Error loading currency data:', error);
      toast.error('Erro ao carregar dados de moeda');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCurrency = async () => {
    setSaving(true);
    try {
      const success = await updateDisplayCurrency(displayCurrency);
      if (success) {
        // Propagar para todo o sistema via contexto global
        await refreshGlobalCurrency();
        toast.success('Moeda de exibição atualizada para todo o sistema!');
      } else {
        toast.error('Erro ao atualizar moeda');
      }
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleStartEditRate = (rate: CurrencyRate) => {
    setEditingRate(rate.targetCurrency);
    setEditValue(rate.rate.toString());
  };

  const handleCancelEditRate = () => {
    setEditingRate(null);
    setEditValue('');
  };

  const handleSaveRate = async (targetCurrency: CurrencyCode) => {
    const newRate = parseFloat(editValue);
    if (isNaN(newRate) || newRate <= 0) {
      toast.error('Taxa inválida');
      return;
    }

    try {
      const success = await updateCurrencyRate(targetCurrency, newRate);
      if (success) {
        setRates(prev => prev.map(r => 
          r.targetCurrency === targetCurrency 
            ? { ...r, rate: newRate, updatedAt: new Date().toISOString() }
            : r
        ));
        toast.success(`Taxa ${targetCurrency} atualizada!`);
        setEditingRate(null);
        setEditValue('');
      } else {
        toast.error('Erro ao atualizar taxa');
      }
    } catch (error) {
      toast.error('Erro ao salvar taxa');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Preview calculation
  const previewAmount = 1000; // R$ 1.000,00
  const selectedRate = rates.find(r => r.targetCurrency === displayCurrency)?.rate || 1;
  const convertedPreview = previewAmount * selectedRate;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Global Currency Selector */}
      <div className="glass-strong p-6 shadow-premium animate-fade-in">
        <h3 className="text-lg font-semibold text-foreground mb-6">Moeda de Exibição Global</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Selecione a moeda que será usada para exibir todos os valores no sistema.
          Os dados continuam salvos em BRL e são convertidos apenas na exibição.
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-foreground">Moeda Atual</Label>
            <Select 
              value={displayCurrency} 
              onValueChange={(value) => setDisplayCurrency(value as CurrencyCode)}
            >
              <SelectTrigger className="glass-input">
                <SelectValue placeholder="Selecione uma moeda" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCY_CODES.map((code) => (
                  <SelectItem key={code} value={code}>
                    <span className="flex items-center gap-2">
                      <span className="text-lg">{CURRENCIES[code].flag}</span>
                      <span>{code}</span>
                      <span className="text-muted-foreground">- {CURRENCIES[code].name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Preview de Conversão</Label>
            <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.08]">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {formatCurrency(previewAmount, 'BRL')}
                </span>
                <span className="text-primary mx-2">→</span>
                <span className="font-semibold text-foreground">
                  {formatCurrency(convertedPreview, displayCurrency)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-6">
          <Button 
            className="bg-primary hover:bg-primary/90" 
            onClick={handleSaveCurrency}
            disabled={saving}
          >
            {saving ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar Moeda
          </Button>
        </div>
      </div>

      {/* Currency Rates Table */}
      <div className="glass-strong p-6 shadow-premium animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Taxas de Câmbio</h3>
            <p className="text-sm text-muted-foreground">
              Configure as taxas de conversão de BRL para outras moedas
            </p>
          </div>
          <Button variant="outline" className="glass-input" onClick={loadData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
        </div>

        <div className="rounded-lg border border-white/[0.08] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.08] hover:bg-transparent">
                <TableHead className="text-foreground">Moeda</TableHead>
                <TableHead className="text-foreground">Taxa (1 BRL =)</TableHead>
                <TableHead className="text-foreground">Exemplo</TableHead>
                <TableHead className="text-foreground">Última Atualização</TableHead>
                <TableHead className="text-foreground text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.filter(r => r.targetCurrency !== 'BRL').map((rate) => (
                <TableRow key={rate.id} className="border-white/[0.08]">
                  <TableCell>
                    <span className="flex items-center gap-2">
                      <span className="text-lg">{CURRENCIES[rate.targetCurrency].flag}</span>
                      <span className="font-medium">{rate.targetCurrency}</span>
                      <span className="text-muted-foreground text-sm">
                        ({CURRENCIES[rate.targetCurrency].symbol})
                      </span>
                    </span>
                  </TableCell>
                  <TableCell>
                    {editingRate === rate.targetCurrency ? (
                      <Input
                        type="number"
                        step="0.0001"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="glass-input w-32"
                        autoFocus
                      />
                    ) : (
                      <span className="font-mono">{rate.rate.toFixed(4)}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatCurrency(100, 'BRL')} = {formatCurrency(100 * rate.rate, rate.targetCurrency)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(rate.updatedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    {editingRate === rate.targetCurrency ? (
                      <div className="flex justify-end gap-1">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="h-8 w-8 p-0 text-primary hover:text-primary"
                          onClick={() => handleSaveRate(rate.targetCurrency)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={handleCancelEditRate}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => handleStartEditRate(rate)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <p className="text-xs text-muted-foreground mt-4">
          💡 As taxas são aplicadas apenas na exibição. Todos os valores são armazenados em BRL no banco de dados.
        </p>
      </div>
    </div>
  );
}
