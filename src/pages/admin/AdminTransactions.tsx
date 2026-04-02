import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useFormatCurrency } from "@/hooks/useFormatCurrency";
import {
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAdminTransactions } from "@/hooks/useAdminTransactions";
import { TransactionType, TransactionStatus, TransactionCategory } from "@/types/adminTransaction";

const ITEMS_PER_PAGE = 10;

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

export default function AdminTransactions() {
  const navigate = useNavigate();
  const { transactions, metrics } = useAdminTransactions();
  const { formatCurrency } = useFormatCurrency();
  
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        t.userName.toLowerCase().includes(searchLower) ||
        t.description.toLowerCase().includes(searchLower);
      const matchesType = typeFilter === "all" || t.type === typeFilter;
      const matchesStatus = statusFilter === "all" || t.status === statusFilter;
      const matchesCategory = categoryFilter === "all" || t.category === categoryFilter;
      return matchesSearch && matchesType && matchesStatus && matchesCategory;
    });
  }, [transactions, search, typeFilter, statusFilter, categoryFilter]);

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTransactions.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTransactions, currentPage]);

  const handleFilterChange = (setter: (value: string) => void, value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  // formatCurrency agora vem do hook useFormatCurrency

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="text-sm text-muted-foreground">
        Admin / <span className="text-foreground">Transações</span>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Transações</h1>
        <p className="text-muted-foreground">
          Visualize todas as transações dos usuários
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="glass-strong p-4 shadow-premium animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="icon-circle icon-circle-info">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{metrics.total}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </div>
        </div>
        <div className="glass-strong p-4 shadow-premium animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center gap-3">
            <div className="icon-circle icon-circle-success">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{metrics.receitas}</p>
              <p className="text-sm text-muted-foreground">Receitas</p>
            </div>
          </div>
        </div>
        <div className="glass-strong p-4 shadow-premium animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center gap-3">
            <div className="icon-circle icon-circle-danger">
              <TrendingDown className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-destructive">{metrics.despesas}</p>
              <p className="text-sm text-muted-foreground">Despesas</p>
            </div>
          </div>
        </div>
        <div className="glass-strong p-4 shadow-premium animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center gap-3">
            <div className="icon-circle icon-circle-success">
              <ArrowUpDown className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{formatCurrency(metrics.totalReceitas - metrics.totalDespesas)}</p>
              <p className="text-sm text-muted-foreground">Saldo</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-strong p-4 shadow-premium animate-fade-in">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por usuário ou descrição..."
              value={search}
              onChange={(e) => handleFilterChange(setSearch, e.target.value)}
              className="pl-9 glass-input"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={typeFilter} onValueChange={(v) => handleFilterChange(setTypeFilter, v)}>
              <SelectTrigger className="w-[130px] glass-input">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent className="glass border-white/[0.12]">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="receita">Receita</SelectItem>
                <SelectItem value="despesa">Despesa</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => handleFilterChange(setStatusFilter, v)}>
              <SelectTrigger className="w-[140px] glass-input">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="glass border-white/[0.12]">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="confirmada">Confirmada</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={(v) => handleFilterChange(setCategoryFilter, v)}>
              <SelectTrigger className="w-[150px] glass-input">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent className="glass border-white/[0.12]">
                <SelectItem value="all">Todas</SelectItem>
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-strong overflow-hidden shadow-premium animate-fade-in">
        <Table>
          <TableHeader>
            <TableRow className="border-white/[0.06] hover:bg-transparent">
              <TableHead className="text-muted-foreground font-medium">Usuário</TableHead>
              <TableHead className="text-muted-foreground font-medium">Descrição</TableHead>
              <TableHead className="text-muted-foreground font-medium">Tipo</TableHead>
              <TableHead className="text-muted-foreground font-medium">Categoria</TableHead>
              <TableHead className="text-muted-foreground font-medium">Valor</TableHead>
              <TableHead className="text-muted-foreground font-medium">Status</TableHead>
              <TableHead className="text-muted-foreground font-medium">Data</TableHead>
              <TableHead className="text-muted-foreground font-medium text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTransactions.map((t) => (
              <TableRow
                key={t.id}
                className="border-white/[0.06] hover:bg-white/[0.02] cursor-pointer transition-colors"
                onClick={() => navigate(`/admin/transactions/${t.id}`)}
              >
                <TableCell>
                  <div>
                    <p className="font-medium text-foreground">{t.userName}</p>
                    <p className="text-xs text-muted-foreground">{t.userEmail}</p>
                  </div>
                </TableCell>
                <TableCell className="text-foreground">{t.description}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={typeMap[t.type].className}>
                    {typeMap[t.type].label}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{categoryLabels[t.category]}</TableCell>
                <TableCell className={t.type === 'receita' ? 'text-primary' : 'text-destructive'}>
                  {t.type === 'receita' ? '+' : '-'}{formatCurrency(t.amount)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusMap[t.status].className}>
                    {statusMap[t.status].label}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(t.date).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="hover:bg-white/[0.04]">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="glass border-white/[0.12]">
                      <DropdownMenuItem 
                        onClick={(e) => { e.stopPropagation(); navigate(`/admin/transactions/${t.id}`); }}
                        className="hover:bg-white/[0.04] cursor-pointer"
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Ver detalhes
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {paginatedTransactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  Nenhuma transação encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-white/[0.06] p-4">
          <p className="text-sm text-muted-foreground">
            Mostrando {paginatedTransactions.length} de {filteredTransactions.length} transações
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="glass-input hover:bg-white/[0.04]"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              Página {currentPage} de {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="glass-input hover:bg-white/[0.04]"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
