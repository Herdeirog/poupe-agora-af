import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useUserTransactions } from '@/hooks/useUserTransactions';
import { useUserCategories } from '@/hooks/useUserCategories';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { TransactionFilters, TransactionType } from '@/types/userTransaction';
import { AppBreadcrumb } from '@/components/app/AppBreadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, ArrowUpRight, ArrowDownRight, MessageCircle, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AppTransactions() {
  const [filters, setFilters] = useState<TransactionFilters>({});
  const { transactions } = useUserTransactions(filters);
  const { getCategoryById } = useUserCategories();
  const { formatCurrency } = useFormatCurrency();

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const handleFilterChange = (key: keyof TransactionFilters, value: string | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value,
    }));
  };

  return (
    <div className="space-y-6">
      <AppBreadcrumb items={[{ label: 'Transações' }]} />

      <div className="flex items-center justify-between fade-in">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Transações</h1>
          <p className="text-muted-foreground">Gerencie suas receitas e despesas</p>
        </div>
        <Link to="/app/transactions/new">
          <button className="btn-premium flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Adicionar
          </button>
        </Link>
      </div>

      {/* Filters */}
      <div className="glass-strong p-6 rounded-2xl fade-in-up">
        <h3 className="text-base font-semibold text-foreground mb-4">Filtros</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              className="pl-9 glass-input"
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value || undefined)}
            />
          </div>

          <Select
            value={filters.type || 'all'}
            onValueChange={(value) => handleFilterChange('type', value as TransactionType)}
          >
            <SelectTrigger className="glass-input">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="income">Receita</SelectItem>
              <SelectItem value="expense">Despesa</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="date"
            placeholder="Data inicial"
            className="glass-input"
            value={filters.startDate || ''}
            onChange={(e) => handleFilterChange('startDate', e.target.value || undefined)}
          />

          <Input
            type="date"
            placeholder="Data final"
            className="glass-input"
            value={filters.endDate || ''}
            onChange={(e) => handleFilterChange('endDate', e.target.value || undefined)}
          />
        </div>
      </div>

      {/* Mobile Cards View */}
      <div className="sm:hidden space-y-3 fade-in-up">
        {transactions.length === 0 ? (
          <div className="glass-card p-8 text-center text-muted-foreground">
            Nenhuma transação encontrada
          </div>
        ) : (
          transactions.map((tx) => {
            const category = getCategoryById(tx.categoryId);
            return (
              <Link key={tx.id} to={`/app/transactions/${tx.id}`}>
                <div className="glass-card p-4 rounded-xl space-y-3 hover:bg-muted/30 transition-colors active:scale-[0.98]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{tx.description}</p>
                      <p className="text-sm text-muted-foreground">{category?.name || 'Sem categoria'}</p>
                    </div>
                    <span className={cn(
                      'font-semibold text-lg whitespace-nowrap',
                      tx.type === 'income' ? 'value-highlight' : 'value-danger'
                    )}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{formatDate(tx.date)}</span>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'badge-premium inline-flex items-center gap-1 text-xs',
                        tx.type === 'income' ? 'badge-income' : 'badge-expense'
                      )}>
                        {tx.type === 'income' ? (
                          <><ArrowUpRight className="h-3 w-3" />Receita</>
                        ) : (
                          <><ArrowDownRight className="h-3 w-3" />Despesa</>
                        )}
                      </span>
                      {tx.origin === 'whatsapp' ? (
                        <span className="badge-premium badge-income inline-flex items-center gap-1 text-xs">
                          <MessageCircle className="h-3 w-3" />
                        </span>
                      ) : (
                        <span className="badge-premium badge-info inline-flex items-center gap-1 text-xs">
                          <Pencil className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block glass-strong rounded-2xl overflow-hidden fade-in-up">
        <div className="overflow-x-auto">
        <Table className="table-premium min-w-[800px]">
          <TableHeader>
            <TableRow className="border-b border-border/50 hover:bg-transparent">
              <TableHead className="text-muted-foreground font-semibold">Descrição</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Categoria</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Tipo</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Data</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Origem</TableHead>
              <TableHead className="text-right text-muted-foreground font-semibold">Valor</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  Nenhuma transação encontrada
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((tx) => {
                const category = getCategoryById(tx.categoryId);
                return (
                  <TableRow key={tx.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium text-foreground">{tx.description}</TableCell>
                    <TableCell className="text-muted-foreground">{category?.name || 'Sem categoria'}</TableCell>
                    <TableCell>
                      <span className={cn(
                        'badge-premium inline-flex items-center gap-1',
                        tx.type === 'income' ? 'badge-income' : 'badge-expense'
                      )}>
                        {tx.type === 'income' ? (
                          <><ArrowUpRight className="h-3 w-3" />Receita</>
                        ) : (
                          <><ArrowDownRight className="h-3 w-3" />Despesa</>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(tx.date)}</TableCell>
                    <TableCell>
                      {tx.origin === 'whatsapp' ? (
                        <span className="badge-premium badge-income inline-flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />WhatsApp
                        </span>
                      ) : (
                        <span className="badge-premium badge-info inline-flex items-center gap-1">
                          <Pencil className="h-3 w-3" />Manual
                        </span>
                      )}
                    </TableCell>
                    <TableCell className={cn(
                      'text-right font-semibold',
                      tx.type === 'income' ? 'value-highlight' : 'value-danger'
                    )}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </TableCell>
                    <TableCell>
                      <Link to={`/app/transactions/${tx.id}`}>
                        <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 hover:bg-primary/10">
                          Ver
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        </div>
      </div>
    </div>
  );
}
