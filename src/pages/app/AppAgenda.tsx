import { useState, useMemo, useEffect } from 'react';
import { format, addDays, startOfWeek, endOfWeek, isSameDay, isToday, isTomorrow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  AlertTriangle,
  Wallet,
  X,
  Filter,
  CreditCard,
  BarChart3,
  Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { CommitmentCard } from '@/components/app/CommitmentCard';
import { CommitmentFormModal } from '@/components/app/CommitmentFormModal';
import { RecurringCommitmentsTab } from '@/components/app/RecurringCommitmentsTab';
import { MonthlySummaryTab } from '@/components/app/MonthlySummaryTab';
import { ActiveRemindersPanel } from '@/components/app/ActiveRemindersPanel';
import { useFinancialCommitments } from '@/hooks/useFinancialCommitments';
import { useCommitmentNotifications } from '@/hooks/useCommitmentNotifications';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { 
  FinancialCommitment, 
  CommitmentStatus,
  CommitmentType 
} from '@/types/financialCommitment';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';

export default function AppAgenda() {
  const [mainTab, setMainTab] = useState<'schedule' | 'recurring' | 'summary' | 'reminders'>('schedule');
  const [view, setView] = useState<'day' | 'week'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCommitment, setEditingCommitment] = useState<FinancialCommitment | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<CommitmentStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<CommitmentType | 'all'>('all');

  // Currency hook
  const { formatCurrency } = useFormatCurrency();
  const { 
    commitments, 
    loading, 
    createCommitment: createCommitmentApi,
    updateCommitment: updateCommitmentApi,
    deleteCommitment: deleteCommitmentApi,
    markAsCompleted,
    registerPayment,
  } = useFinancialCommitments();

  // Notifications
  const { 
    overdueCount, 
    dueTodayCount, 
    dueSoonCount,
    hasNotifications 
  } = useCommitmentNotifications(commitments);

  // Toast notification on load (once per session)
  useEffect(() => {
    const notified = sessionStorage.getItem('commitment_notified');
    if (notified || loading || commitments.length === 0) return;
    
    if (overdueCount > 0) {
      toast.warning(`Você tem ${overdueCount} compromisso(s) atrasado(s)!`, {
        description: 'Verifique sua agenda financeira',
        action: {
          label: 'Ver',
          onClick: () => setStatusFilter('overdue')
        }
      });
      sessionStorage.setItem('commitment_notified', 'true');
    } else if (dueTodayCount > 0) {
      toast.info(`${dueTodayCount} compromisso(s) vencem hoje`, {
        description: 'Não esqueça de pagar!'
      });
      sessionStorage.setItem('commitment_notified', 'true');
    }
  }, [loading, commitments.length, overdueCount, dueTodayCount]);

  // Calcular período exibido
  const displayPeriod = useMemo(() => {
    if (view === 'day') {
      return format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR });
    }
    const start = startOfWeek(currentDate, { weekStartsOn: 0 });
    const end = endOfWeek(currentDate, { weekStartsOn: 0 });
    return `${format(start, 'd')} - ${format(end, "d 'de' MMMM, yyyy", { locale: ptBR })}`;
  }, [currentDate, view]);

  // Filtrar compromissos
  const filteredCommitments = useMemo(() => {
    let result = commitments;
    
    // Filtrar por período
    if (view === 'day') {
      result = result.filter(c => isSameDay(parseISO(c.date), currentDate));
    } else {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      const end = endOfWeek(currentDate, { weekStartsOn: 0 });
      result = result.filter(c => {
        const date = parseISO(c.date);
        return date >= start && date <= end;
      });
    }

    // Filtrar por status
    if (statusFilter !== 'all') {
      result = result.filter(c => c.status === statusFilter);
    }

    // Filtrar por tipo
    if (typeFilter !== 'all') {
      result = result.filter(c => c.type === typeFilter);
    }

    return result;
  }, [commitments, currentDate, view, statusFilter, typeFilter]);

  // Agrupar por data
  const groupedCommitments = useMemo(() => {
    const groups: Record<string, FinancialCommitment[]> = {};
    filteredCommitments.forEach(c => {
      const key = c.date;
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredCommitments]);

  // Estatísticas
  const stats = useMemo(() => {
    const pending = filteredCommitments.filter(c => c.status === 'pending').length;
    const overdue = filteredCommitments.filter(c => c.status === 'overdue').length;
    const totalToPay = filteredCommitments
      .filter(c => c.status !== 'completed')
      .reduce((sum, c) => sum + (c.amount || 0), 0);
    return { pending, overdue, totalToPay };
  }, [filteredCommitments]);

  const hasActiveFilters = statusFilter !== 'all' || typeFilter !== 'all';

  // Navegação
  const navigateDate = (direction: 'prev' | 'next') => {
    const days = view === 'day' ? 1 : 7;
    setCurrentDate(prev => 
      direction === 'next' 
        ? addDays(prev, days) 
        : addDays(prev, -days)
    );
  };

  const goToToday = () => setCurrentDate(new Date());

  // Swipe gesture for mobile navigation
  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: () => navigateDate('next'),
    onSwipeRight: () => navigateDate('prev'),
    threshold: 75,
  });

  const clearFilters = () => {
    setStatusFilter('all');
    setTypeFilter('all');
  };

  // Ações
  const handleMarkComplete = async (id: string) => {
    await markAsCompleted(id);
    toast.success('Compromisso marcado como pago!');
  };

  const handleEdit = (commitment: FinancialCommitment) => {
    setEditingCommitment(commitment);
    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (deletingId) {
      await deleteCommitmentApi(deletingId);
      toast.success('Compromisso excluído!');
    }
    setDeleteDialogOpen(false);
    setDeletingId(null);
  };

  const handleSave = async (data: Partial<FinancialCommitment>) => {
    if (editingCommitment) {
      await updateCommitmentApi(editingCommitment.id, data);
      toast.success('Compromisso atualizado!');
    } else {
      const commitmentDate = data.date || format(new Date(), 'yyyy-MM-dd');
      await createCommitmentApi({
        title: data.title || '',
        date: commitmentDate,
        time: data.time,
        amount: data.amount,
        type: data.type || 'unique',
        status: 'pending',
        origin: 'manual',
        frequency: data.frequency,
        isIndefinite: data.isIndefinite,
        currentInstallment: data.currentInstallment,
        totalInstallments: data.totalInstallments,
      });
      
      // Auto-navigate to the commitment date so it's visible
      const createdDate = parseISO(commitmentDate);
      const formattedDate = format(createdDate, "dd/MM", { locale: ptBR });
      
      // Check if the created date is within current view
      const start = view === 'day' ? currentDate : startOfWeek(currentDate, { weekStartsOn: 0 });
      const end = view === 'day' ? currentDate : endOfWeek(currentDate, { weekStartsOn: 0 });
      const isInCurrentView = view === 'day' 
        ? isSameDay(createdDate, currentDate)
        : createdDate >= start && createdDate <= end;
      
      if (!isInCurrentView) {
        // Navigate to the commitment date
        setCurrentDate(createdDate);
        toast.success(`Compromisso criado para ${formattedDate}!`, {
          description: 'Navegamos para a data do compromisso.',
        });
      } else {
        toast.success('Compromisso criado!', {
          description: `Vencimento: ${formattedDate}`,
        });
      }
    }
    setEditingCommitment(null);
  };

  const openNewModal = () => {
    setEditingCommitment(null);
    setModalOpen(true);
  };

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Hoje';
    if (isTomorrow(date)) return 'Amanhã';
    return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
  };

  if (loading) {
    return (
      <div className="space-y-6 fade-in">
        <div className="flex justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Notification Banner */}
      {hasNotifications && (overdueCount > 0 || dueTodayCount > 0) && (
        <div className={`glass-card p-4 rounded-xl border-l-4 ${
          overdueCount > 0 
            ? 'border-red-500 bg-red-500/10' 
            : 'border-yellow-500 bg-yellow-500/10'
        }`}>
          <div className="flex items-center gap-3">
            <AlertTriangle className={`h-5 w-5 ${
              overdueCount > 0 ? 'text-red-500' : 'text-yellow-500'
            }`} />
            <div className="flex-1">
              <p className="font-medium text-foreground">
                {overdueCount > 0 
                  ? `Atenção! ${overdueCount} compromisso(s) atrasado(s)`
                  : `${dueTodayCount} compromisso(s) vencem hoje`
                }
              </p>
              {dueSoonCount > 0 && (
                <p className="text-sm text-muted-foreground">
                  E {dueSoonCount} vencendo nos próximos 3 dias
                </p>
              )}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setMainTab('schedule');
                setStatusFilter(overdueCount > 0 ? 'overdue' : 'pending');
              }}
            >
              Ver {overdueCount > 0 ? 'atrasados' : 'pendentes'}
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agenda Financeira</h1>
          <p className="text-muted-foreground">Organize seus compromissos e pagamentos</p>
        </div>
        <Button onClick={openNewModal} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Compromisso
        </Button>
      </div>

      {/* Main Tabs */}
      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as 'schedule' | 'recurring' | 'summary' | 'reminders')}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="schedule" className="gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Agenda</span>
            <span className="sm:hidden">Agenda</span>
          </TabsTrigger>
          <TabsTrigger value="recurring" className="gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Recorrentes</span>
            <span className="sm:hidden">Recorrentes</span>
          </TabsTrigger>
          <TabsTrigger value="summary" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Resumo</span>
            <span className="sm:hidden">Resumo</span>
          </TabsTrigger>
          <TabsTrigger value="reminders" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Lembretes</span>
            <span className="sm:hidden">Lembretes</span>
          </TabsTrigger>
        </TabsList>

        {/* Schedule Tab */}
        <TabsContent value="schedule" className="mt-6 space-y-6" {...swipeHandlers}>
          {/* Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* View toggle */}
            <Tabs value={view} onValueChange={(v) => setView(v as 'day' | 'week')}>
              <TabsList>
                <TabsTrigger value="day">Dia</TabsTrigger>
                <TabsTrigger value="week">Semana</TabsTrigger>
              </TabsList>
            </Tabs>

        {/* Date navigation */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigateDate('prev')}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="font-medium text-foreground min-w-[140px] sm:min-w-[200px] text-center capitalize text-sm sm:text-base">
            {displayPeriod}
          </span>
          <Button variant="ghost" size="icon" onClick={() => navigateDate('next')}>
            <ChevronRight className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Hoje
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 rounded-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            Filtros
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 gap-1">
              <X className="h-3 w-3" />
              Limpar filtros
            </Button>
          )}
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Status Filter */}
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-2">Status</p>
            <ToggleGroup 
              type="single" 
              value={statusFilter} 
              onValueChange={(v) => v && setStatusFilter(v as CommitmentStatus | 'all')}
              className="justify-start flex-wrap"
            >
              <ToggleGroupItem value="all" size="sm">Todos</ToggleGroupItem>
              <ToggleGroupItem value="pending" size="sm" className="gap-1">
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                Pendentes
              </ToggleGroupItem>
              <ToggleGroupItem value="overdue" size="sm" className="gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                Atrasados
              </ToggleGroupItem>
              <ToggleGroupItem value="completed" size="sm" className="gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                Concluídos
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Type Filter */}
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-2">Tipo</p>
            <ToggleGroup 
              type="single" 
              value={typeFilter} 
              onValueChange={(v) => v && setTypeFilter(v as CommitmentType | 'all')}
              className="justify-start flex-wrap"
            >
              <ToggleGroupItem value="all" size="sm">Todos</ToggleGroupItem>
              <ToggleGroupItem value="unique" size="sm">Únicos</ToggleGroupItem>
              <ToggleGroupItem value="recurring" size="sm">Recorrentes</ToggleGroupItem>
              <ToggleGroupItem value="installment" size="sm">Parcelados</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-4 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <Clock className="h-5 w-5 text-yellow-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
            <p className="text-sm text-muted-foreground">Pendentes</p>
          </div>
        </div>

        <div className="glass-card p-4 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.totalToPay)}</p>
            <p className="text-sm text-muted-foreground">A pagar</p>
          </div>
        </div>

        <div className="glass-card p-4 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.overdue}</p>
            <p className="text-sm text-muted-foreground">Atrasados</p>
          </div>
        </div>
      </div>

      {/* Commitments list */}
      <div className="space-y-6">
        {groupedCommitments.length === 0 ? (
          <div className="glass-card p-8 rounded-xl text-center">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {hasActiveFilters ? 'Nenhum resultado' : 'Nenhum compromisso'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {hasActiveFilters 
                ? 'Nenhum compromisso encontrado com os filtros selecionados.'
                : 'Não há compromissos financeiros para este período.'
              }
            </p>
            
            {/* Indicator for commitments outside current period */}
            {!hasActiveFilters && commitments.length > 0 && (
              <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-sm text-blue-400 mb-2">
                  📅 Existem <strong>{commitments.length}</strong> compromisso(s) em outras datas
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Find the next upcoming commitment
                    const today = new Date();
                    const futureCommitments = commitments
                      .filter(c => parseISO(c.date) >= today)
                      .sort((a, b) => a.date.localeCompare(b.date));
                    
                    if (futureCommitments.length > 0) {
                      setCurrentDate(parseISO(futureCommitments[0].date));
                    } else {
                      // If no future commitments, go to the most recent one
                      const sorted = [...commitments].sort((a, b) => b.date.localeCompare(a.date));
                      if (sorted.length > 0) {
                        setCurrentDate(parseISO(sorted[0].date));
                      }
                    }
                  }}
                  className="gap-2"
                >
                  <ChevronRight className="h-4 w-4" />
                  Ir para próximo compromisso
                </Button>
              </div>
            )}
            
            {hasActiveFilters ? (
              <Button onClick={clearFilters} variant="outline">
                Limpar filtros
              </Button>
            ) : (
              <Button onClick={openNewModal} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Criar Compromisso
              </Button>
            )}
          </div>
        ) : (
          groupedCommitments.map(([date, items]) => (
            <div key={date} className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                📅 {getDateLabel(date)}
              </h3>
              <div className="space-y-2">
                {items.map(commitment => (
                  <CommitmentCard
                    key={commitment.id}
                    commitment={commitment}
                    onMarkComplete={handleMarkComplete}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          ))
        )}
        </div>
        </TabsContent>

        <TabsContent value="recurring" className="mt-6">
          <RecurringCommitmentsTab
            commitments={commitments}
            onMarkComplete={handleMarkComplete}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onRegisterPayment={registerPayment}
          />
        </TabsContent>

        <TabsContent value="summary" className="mt-6">
          <MonthlySummaryTab />
        </TabsContent>

        <TabsContent value="reminders" className="mt-6">
          <ActiveRemindersPanel />
        </TabsContent>
      </Tabs>

      {/* Modal */}
      <CommitmentFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        commitment={editingCommitment}
        onSave={handleSave}
        defaultDate={currentDate}
      />

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir compromisso?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O compromisso será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
