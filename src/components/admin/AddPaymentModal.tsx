import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { SubscriptionPayment } from "@/types/adminSubscription";
import { useFormatCurrency } from "@/hooks/useFormatCurrency";

interface AddPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (payment: Omit<SubscriptionPayment, "id">) => void;
}

export function AddPaymentModal({ open, onOpenChange, onSave }: AddPaymentModalProps) {
  const { symbol } = useFormatCurrency();
  const [date, setDate] = useState<Date>(new Date());
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Cartão de Crédito");
  const [status, setStatus] = useState<"pago" | "pendente" | "falha" | "estornado">("pago");
  const [observacao, setObservacao] = useState("");

  const handleSave = () => {
    if (!amount || parseFloat(amount) <= 0) return;

    onSave({
      date: date.toISOString(),
      amount: parseFloat(amount.replace(",", ".")),
      method,
      status,
      observacao: observacao || undefined,
    });

    // Reset form
    setDate(new Date());
    setAmount("");
    setMethod("Cartão de Crédito");
    setStatus("pago");
    setObservacao("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-white/[0.12] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Adicionar Pagamento Manual</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Data</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal glass-input",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : "Selecione uma data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 glass border-white/[0.12]" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Valor ({symbol})</Label>
            <Input
              type="text"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="glass-input"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Método de Pagamento</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="glass-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass border-white/[0.12]">
                <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                <SelectItem value="PIX">PIX</SelectItem>
                <SelectItem value="Boleto">Boleto</SelectItem>
                <SelectItem value="Transferência">Transferência</SelectItem>
                <SelectItem value="Outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
              <SelectTrigger className="glass-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass border-white/[0.12]">
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="falha">Falhou</SelectItem>
                <SelectItem value="estornado">Estornado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Observação (opcional)</Label>
            <Textarea
              placeholder="Adicione uma observação..."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              className="glass-input min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="glass-input">
            Cancelar
          </Button>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            Salvar Pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
