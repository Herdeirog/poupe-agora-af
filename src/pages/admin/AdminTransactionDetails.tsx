import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useFormatCurrency } from "@/hooks/useFormatCurrency";
import { ArrowLeft, RefreshCw, Clock, User, Tag, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminTransactions } from "@/hooks/useAdminTransactions";
import { AdminTransaction, TransactionType, TransactionStatus, TransactionCategory } from "@/types/adminTransaction";
import { toast } from "sonner";

const typeMap: Record<TransactionType, { label: string; className: string }> = {
  receita: { label: "Receita", className: "badge-ativo" },
  despesa: { label: "Despesa", className: "badge-cancelado" },
};

const statusMap: Record<TransactionStatus, { label: string; className: string }> = {
  confirmada: { label: "Confirmada", className: "badge-ativo" },
  pendente: { label: "Pendente", className: "badge-trial" },
  cancelada: { label: "Cancelada", className: "badge-cancelado" },
};

const categoryLabels: Record<TransactionCategory, string> = {
  salario: "Salário",
  freelance: "Freelance",
  investimentos: "Investimentos",
  alimentacao: "Alimentação",
  transporte: "Transporte",
  moradia: "Moradia",
  saude: "Saúde",
  educacao: "Educação",
  lazer: "Lazer",
  outros: "Outros",
};

export default function AdminTransactionDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getById, updateTransaction } = useAdminTransactions();
  const { formatCurrency } = useFormatCurrency();
  
  const [transaction, setTransaction] = useState<AdminTransaction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTransaction() {
      if (!id) return;
      setLoading(true);
      try {
        const data = await getById(id);
        setTransaction(data || null);
      } catch (error) {
        console.error('Error loading transaction:', error);
        setTransaction(null);
      } finally {
        setLoading(false);
      }
    }
    loadTransaction();
  }, [id, getById]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-muted-foreground">Transação não encontrada</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/admin/transactions")}>
          Voltar para lista
        </Button>
      </div>
    );
  }

  // formatCurrency agora vem do hook useFormatCurrency

  const handleReprocess = async () => {
    const newLog = {
      id: Math.random().toString(36).substring(2, 9),
      action: 'Reprocessamento',
      timestamp: new Date().toISOString(),
      details: 'Transação reprocessada manualmente pelo admin',
    };
    await updateTransaction(transaction.id, {
      logs: [...(transaction.logs || []), newLog],
    });
    setTransaction({
      ...transaction,
      logs: [...(transaction.logs || []), newLog],
    });
    toast.success("Transação reprocessada com sucesso!");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate("/admin/transactions")}
          className="hover:bg-white/[0.04]"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Detalhes da Transação</h1>
          <p className="text-muted-foreground">{transaction.description}</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90" onClick={handleReprocess}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Reprocessar
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Dados da Transação */}
        <div className="glass p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Dados da Transação</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-2">
                <Tag className="h-4 w-4" />
                ID
              </span>
              <span className="text-foreground font-mono text-sm">{transaction.id}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                Usuário
              </span>
              <span className="text-foreground">{transaction.userName || "-"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Tipo</span>
              <Badge variant="outline" className={typeMap[transaction.type]?.className || "badge-info"}>
                {typeMap[transaction.type]?.label || transaction.type}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Categoria</span>
              <span className="text-foreground">{categoryLabels[transaction.category] || transaction.category}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Valor
              </span>
              <span className={transaction.type === 'receita' ? 'text-primary text-xl font-bold' : 'text-destructive text-xl font-bold'}>
                {transaction.type === 'receita' ? '+' : '-'}{formatCurrency(transaction.amount)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Status</span>
              <Badge variant="outline" className={statusMap[transaction.status]?.className || "badge-info"}>
                {statusMap[transaction.status]?.label || transaction.status}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Origem</span>
              <span className="text-foreground capitalize">{transaction.origin || "-"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Data
              </span>
              <span className="text-foreground">
                {transaction.date ? `${new Date(transaction.date).toLocaleDateString("pt-BR")} às ${new Date(transaction.date).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}` : "-"}
              </span>
            </div>
          </div>
        </div>

        {/* Informações do Usuário */}
        <div className="glass p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Informações do Usuário</h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nome</span>
              <span className="text-foreground">{transaction.userName || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="text-foreground">{transaction.userEmail || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ID do Usuário</span>
              <span className="text-foreground font-mono text-sm">{transaction.userId || "-"}</span>
            </div>
            {transaction.userId && (
              <div className="pt-4">
                <Button 
                  variant="outline" 
                  className="w-full glass-input"
                  onClick={() => navigate(`/admin/users/${transaction.userId}`)}
                >
                  Ver perfil do usuário
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Logs */}
      <div className="glass overflow-hidden">
        <div className="p-6 border-b border-white/[0.08]">
          <h3 className="text-lg font-semibold text-foreground">Logs da Transação</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-white/[0.06] hover:bg-transparent">
              <TableHead className="text-muted-foreground">Data/Hora</TableHead>
              <TableHead className="text-muted-foreground">Ação</TableHead>
              <TableHead className="text-muted-foreground">Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transaction.logs && transaction.logs.length > 0 ? (
              transaction.logs.map((log) => (
                <TableRow key={log.id} className="border-white/[0.06] hover:bg-white/[0.02]">
                  <TableCell className="text-foreground">
                    {new Date(log.timestamp).toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-foreground">{log.action}</TableCell>
                  <TableCell className="text-muted-foreground">{log.details}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                  Nenhum log registrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
