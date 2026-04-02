import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { Calendar as CalendarIcon, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  FinancialCommitment, 
  CommitmentType,
  RecurrenceFrequency 
} from '@/types/financialCommitment';
import { useUserCategories } from '@/hooks/useUserCategories';

interface CommitmentFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commitment?: FinancialCommitment | null;
  onSave: (commitment: Partial<FinancialCommitment>) => void;
  defaultDate?: Date;
}

export function CommitmentFormModal({ 
  open, 
  onOpenChange, 
  commitment, 
  onSave,
  defaultDate
}: CommitmentFormModalProps) {
  const { formatCurrency } = useFormatCurrency();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [time, setTime] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<CommitmentType>('unique');
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly');
  const [isIndefinite, setIsIndefinite] = useState(true);
  const [totalInstallments, setTotalInstallments] = useState('12');
  const [categoryId, setCategoryId] = useState<string>('none');

  const { categories, loading: categoriesLoading } = useUserCategories('expense');

  const isEditing = !!commitment;

  useEffect(() => {
    if (commitment) {
      setTitle(commitment.title);
      setDate(new Date(commitment.date));
      setTime(commitment.time || '');
      setAmount(commitment.amount?.toString() || '');
      setType(commitment.type);
      setFrequency(commitment.frequency || 'monthly');
      setIsIndefinite(commitment.isIndefinite ?? true);
      setTotalInstallments(commitment.totalInstallments?.toString() || '12');
      setCategoryId(commitment.categoryId || 'none');
    } else {
      // Reset form - use defaultDate if provided
      setTitle('');
      setDate(defaultDate || new Date());
      setTime('');
      setAmount('');
      setType('unique');
      setFrequency('monthly');
      setIsIndefinite(true);
      setTotalInstallments('12');
      setCategoryId('none');
    }
  }, [commitment, open, defaultDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newCommitment: Partial<FinancialCommitment> = {
      title,
      date: date ? format(date, 'yyyy-MM-dd') : '',
      time: time || undefined,
      amount: amount ? parseFloat(amount) : undefined,
      type,
      status: commitment?.status || 'pending',
      origin: commitment?.origin || 'manual',
      categoryId: categoryId && categoryId !== 'none' ? categoryId : undefined,
    };

    if (type === 'recurring') {
      newCommitment.frequency = frequency;
      newCommitment.isIndefinite = isIndefinite;
    }

    if (type === 'installment') {
      newCommitment.currentInstallment = commitment?.currentInstallment || 1;
      newCommitment.totalInstallments = parseInt(totalInstallments);
    }

    onSave(newCommitment);
    onOpenChange(false);
  };

  const installmentValue = amount && totalInstallments 
    ? parseFloat(amount) / parseInt(totalInstallments) 
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Compromisso' : 'Novo Compromisso Financeiro'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Altere os dados do compromisso financeiro.'
              : 'Preencha os dados para criar um novo compromisso.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              placeholder="Ex: Conta de Luz"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Categoria
            </Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem categoria</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <div className="flex items-center gap-2">
                      {category.icon && <span>{category.icon}</span>}
                      <span>{category.name}</span>
                      {category.color && (
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: category.color }}
                        />
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data Inicial *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'dd/MM/yyyy') : 'Selecione'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Horário (opcional)</Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Valor (opcional)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {/* Type */}
          <div className="space-y-3">
            <Label>Tipo de Compromisso</Label>
            <RadioGroup 
              value={type} 
              onValueChange={(value) => setType(value as CommitmentType)}
              className="grid grid-cols-3 gap-2"
            >
              <Label 
                htmlFor="type-unique"
                className={cn(
                  "flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-all",
                  type === 'unique' 
                    ? "border-primary bg-primary/10 text-primary" 
                    : "border-border hover:border-primary/50"
                )}
              >
                <RadioGroupItem value="unique" id="type-unique" className="sr-only" />
                <span className="text-sm font-medium">Único</span>
              </Label>
              
              <Label 
                htmlFor="type-recurring"
                className={cn(
                  "flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-all",
                  type === 'recurring' 
                    ? "border-primary bg-primary/10 text-primary" 
                    : "border-border hover:border-primary/50"
                )}
              >
                <RadioGroupItem value="recurring" id="type-recurring" className="sr-only" />
                <span className="text-sm font-medium">Recorrente</span>
              </Label>
              
              <Label 
                htmlFor="type-installment"
                className={cn(
                  "flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-all",
                  type === 'installment' 
                    ? "border-primary bg-primary/10 text-primary" 
                    : "border-border hover:border-primary/50"
                )}
              >
                <RadioGroupItem value="installment" id="type-installment" className="sr-only" />
                <span className="text-sm font-medium">Parcelado</span>
              </Label>
            </RadioGroup>
          </div>

          {/* Recurring options */}
          {type === 'recurring' && (
            <div className="space-y-4 p-4 rounded-lg bg-purple-500/5 border border-purple-500/20">
              <h4 className="text-sm font-medium text-purple-400">Configuração de Recorrência</h4>
              
              <div className="space-y-2">
                <Label>Frequência</Label>
                <Select value={frequency} onValueChange={(v) => setFrequency(v as RecurrenceFrequency)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo</Label>
                <RadioGroup 
                  value={isIndefinite ? 'indefinite' : 'finite'}
                  onValueChange={(v) => setIsIndefinite(v === 'indefinite')}
                  className="grid grid-cols-2 gap-2"
                >
                  <Label 
                    htmlFor="rec-indefinite"
                    className={cn(
                      "flex items-center justify-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all text-sm",
                      isIndefinite 
                        ? "border-purple-500 bg-purple-500/10 text-purple-400" 
                        : "border-border hover:border-purple-500/50"
                    )}
                  >
                    <RadioGroupItem value="indefinite" id="rec-indefinite" className="sr-only" />
                    Indeterminado
                  </Label>
                  
                  <Label 
                    htmlFor="rec-finite"
                    className={cn(
                      "flex items-center justify-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all text-sm",
                      !isIndefinite 
                        ? "border-purple-500 bg-purple-500/10 text-purple-400" 
                        : "border-border hover:border-purple-500/50"
                    )}
                  >
                    <RadioGroupItem value="finite" id="rec-finite" className="sr-only" />
                    Com fim
                  </Label>
                </RadioGroup>
              </div>
            </div>
          )}

          {/* Installment options */}
          {type === 'installment' && (
            <div className="space-y-4 p-4 rounded-lg bg-orange-500/5 border border-orange-500/20">
              <h4 className="text-sm font-medium text-orange-400">Configuração de Parcelas</h4>
              
              <div className="space-y-2">
                <Label htmlFor="installments">Número de Parcelas</Label>
                <Input
                  id="installments"
                  type="number"
                  min="2"
                  max="120"
                  value={totalInstallments}
                  onChange={(e) => setTotalInstallments(e.target.value)}
                />
              </div>

              {amount && totalInstallments && (
                <div className="flex flex-col gap-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">📋 Parcela:</span>
                    <span className="font-medium text-foreground">1 de {totalInstallments}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">💰 Valor por parcela:</span>
                    <span className="font-medium text-foreground">{formatCurrency(installmentValue)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!title || !date}>
              {isEditing ? 'Salvar Alterações' : 'Criar Compromisso'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
