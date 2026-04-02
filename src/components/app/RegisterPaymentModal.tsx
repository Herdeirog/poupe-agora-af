/**
 * Modal for registering a payment for recurring or installment commitments
 */

import { useState } from 'react';
import { format } from 'date-fns';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Check, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FinancialCommitment } from '@/types/financialCommitment';
import { cn } from '@/lib/utils';

interface RegisterPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commitment: FinancialCommitment | null;
  onConfirm: (commitmentId: string, paymentData: { paidAt: Date; amount: number }) => Promise<void>;
}

export function RegisterPaymentModal({
  open,
  onOpenChange,
  commitment,
  onConfirm,
}: RegisterPaymentModalProps) {
  const { formatCurrency, symbol } = useFormatCurrency();
  const [paidAt, setPaidAt] = useState<Date>(new Date());
  const [amount, setAmount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Reset form when modal opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && commitment) {
      setPaidAt(new Date());
      setAmount(commitment.amount?.toString() || '');
    }
    onOpenChange(newOpen);
  };

  const handleConfirm = async () => {
    if (!commitment) return;

    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    setIsSubmitting(true);
    try {
      await onConfirm(commitment.id, { paidAt, amount: parsedAmount });
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to register payment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!commitment) return null;

  // formatCurrency agora vem do hook useFormatCurrency

  const isInstallment = commitment.type === 'installment';
  const title = isInstallment
    ? `Pagar Parcela ${(commitment.currentInstallment || 0) + 1}/${commitment.totalInstallments}`
    : 'Registrar Pagamento';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {commitment.title}
            {commitment.amount && ` • Valor esperado: ${formatCurrency(commitment.amount)}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="payment-date">Data do Pagamento</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !paidAt && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {paidAt ? format(paidAt, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : 'Selecione a data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={paidAt}
                  onSelect={(date) => {
                    if (date) {
                      setPaidAt(date);
                      setCalendarOpen(false);
                    }
                  }}
                  locale={ptBR}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-amount">Valor Pago ({symbol})</Label>
            <Input
              id="payment-amount"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting || !amount}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Confirmar Pagamento
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
