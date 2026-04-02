import { useState } from 'react';
import { Bell, Plus, Search, MessageCircle, Pencil, Trash2, Check, Clock, AlertTriangle, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppBreadcrumb } from '@/components/app/AppBreadcrumb';
import { Reminder, ReminderRecurrence, ReminderStatus, recurrenceLabels } from '@/types/userReminder';
import { useUserReminders } from '@/hooks/useUserReminders';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

const emptyReminder: Partial<Reminder> = {
  description: '',
  date: format(new Date(), 'yyyy-MM-dd'),
  amount: undefined,
  recurrence: 'monthly',
  status: 'active',
  origin: 'manual',
};

export default function AppReminders() {
  const { reminders, isLoading, stats, addReminder, editReminder, removeReminder, markComplete } = useUserReminders();
  const { formatCurrency } = useFormatCurrency();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [recurrenceFilter, setRecurrenceFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Partial<Reminder> | null>(null);
  const [reminderToDelete, setReminderToDelete] = useState<Reminder | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Filter reminders
  const filteredReminders = reminders.filter(r => {
    const matchesSearch = r.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesRecurrence = recurrenceFilter === 'all' || r.recurrence === recurrenceFilter;
    return matchesSearch && matchesStatus && matchesRecurrence;
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return format(date, 'dd/MM/yyyy', { locale: ptBR });
  };

  const formatNextExecution = (dateStr?: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr + 'T00:00:00');
    if (isToday(date)) return 'Hoje';
    if (isTomorrow(date)) return 'Amanhã';
    return format(date, 'dd/MM', { locale: ptBR });
  };

  const getStatusBadge = (status: ReminderStatus) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
            <Clock className="h-3 w-3 mr-1" />
            Ativo
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">
            <Check className="h-3 w-3 mr-1" />
            Concluído
          </Badge>
        );
      case 'overdue':
        return (
          <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Atrasado
          </Badge>
        );
    }
  };

  const getOriginBadge = (origin: 'whatsapp' | 'manual') => {
    if (origin === 'whatsapp') {
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
          <MessageCircle className="h-3 w-3 mr-1" />
          WhatsApp
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-slate-500/10 text-slate-400 border-slate-500/20">
        <Pencil className="h-3 w-3 mr-1" />
        Manual
      </Badge>
    );
  };

  const handleOpenModal = (reminder?: Reminder) => {
    if (reminder) {
      setEditingReminder({ ...reminder });
    } else {
      setEditingReminder({ ...emptyReminder });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingReminder(null);
  };

  const handleSaveReminder = async () => {
    if (!editingReminder?.description) {
      toast.error('Preencha a descrição do lembrete');
      return;
    }

    setIsSaving(true);
    try {
      if (editingReminder.id) {
        await editReminder(editingReminder.id, editingReminder);
        toast.success('Lembrete atualizado com sucesso!');
      } else {
        const newReminder = {
          description: editingReminder.description,
          date: editingReminder.date || format(new Date(), 'yyyy-MM-dd'),
          amount: editingReminder.amount,
          recurrence: editingReminder.recurrence || 'monthly',
          status: editingReminder.status || 'active',
          origin: 'manual' as const,
          nextExecution: editingReminder.recurrence !== 'once' ? editingReminder.date : undefined,
        };
        await addReminder(newReminder);
        toast.success('Lembrete criado com sucesso!');
      }
      handleCloseModal();
    } catch (e) {
      toast.error('Erro ao salvar lembrete');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (reminder: Reminder) => {
    setReminderToDelete(reminder);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (reminderToDelete) {
      await removeReminder(reminderToDelete.id);
      toast.success('Lembrete excluído com sucesso!');
    }
    setIsDeleteDialogOpen(false);
    setReminderToDelete(null);
  };

  const handleMarkComplete = async (reminder: Reminder) => {
    await markComplete(reminder.id);
    toast.success('Lembrete marcado como concluído!');
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <AppBreadcrumb
          items={[
            { label: 'Dashboard', href: '/app/dashboard' },
            { label: 'Lembretes' },
          ]}
        />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="glass-card">
              <CardContent className="p-4 flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <div>
                  <Skeleton className="h-6 w-8 mb-1" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <AppBreadcrumb
        items={[
          { label: 'Dashboard', href: '/app/dashboard' },
          { label: 'Lembretes' },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" />
            Lembretes Financeiros
          </h1>
          <p className="text-muted-foreground mt-1">
            Não esqueça de nenhum compromisso financeiro
          </p>
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Lembrete
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass-card border-emerald-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/10">
              <Clock className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.active}</p>
              <p className="text-sm text-muted-foreground">Ativos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-blue-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10">
              <Check className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.completed}</p>
              <p className="text-sm text-muted-foreground">Concluídos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-red-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-red-500/10">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.overdue}</p>
              <p className="text-sm text-muted-foreground">Atrasados</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar lembrete..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="completed">Concluídos</SelectItem>
                <SelectItem value="overdue">Atrasados</SelectItem>
              </SelectContent>
            </Select>
            <Select value={recurrenceFilter} onValueChange={setRecurrenceFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Recorrência" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="once">Única vez</SelectItem>
                <SelectItem value="daily">Diário</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="monthly">Mensal</SelectItem>
                <SelectItem value="yearly">Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Mobile Cards View */}
      <div className="sm:hidden space-y-3">
        {filteredReminders.length === 0 ? (
          <Card className="glass-card p-8 text-center text-muted-foreground">
            {reminders.length === 0 
              ? 'Nenhum lembrete cadastrado. Clique em "Novo Lembrete" para começar.'
              : 'Nenhum lembrete encontrado com os filtros aplicados'}
          </Card>
        ) : (
          filteredReminders.map((reminder) => (
            <Card key={reminder.id} className="glass-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{reminder.description}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(reminder.date)} • {recurrenceLabels[reminder.recurrence]}
                  </p>
                </div>
                {reminder.amount && (
                  <span className="font-semibold text-lg text-foreground whitespace-nowrap">
                    {formatCurrency(reminder.amount)}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                {getStatusBadge(reminder.status)}
                {getOriginBadge(reminder.origin)}
                {reminder.nextExecution && (
                  <Badge variant="outline" className="bg-muted/50 text-xs">
                    Próx: {formatNextExecution(reminder.nextExecution)}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center justify-end gap-1 pt-2 border-t border-border/30">
                {reminder.status === 'active' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 px-3 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                    onClick={() => handleMarkComplete(reminder)}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Concluir
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => handleOpenModal(reminder)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                  onClick={() => handleDeleteClick(reminder)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Desktop Table View */}
      <Card className="hidden sm:block glass-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead>Descrição</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Recorrência</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Próx. Execução</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReminders.map((reminder) => (
                  <TableRow key={reminder.id} className="border-border/50 hover:bg-muted/30">
                    <TableCell className="font-medium">{reminder.description}</TableCell>
                    <TableCell>{formatDate(reminder.date)}</TableCell>
                    <TableCell>
                      {reminder.amount ? formatCurrency(reminder.amount) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-muted/50">
                        {recurrenceLabels[reminder.recurrence]}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(reminder.status)}</TableCell>
                    <TableCell>{getOriginBadge(reminder.origin)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatNextExecution(reminder.nextExecution)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {reminder.status === 'active' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                            onClick={() => handleMarkComplete(reminder)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleOpenModal(reminder)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                          onClick={() => handleDeleteClick(reminder)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredReminders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      {reminders.length === 0 
                        ? 'Nenhum lembrete cadastrado. Clique em "Novo Lembrete" para começar.'
                        : 'Nenhum lembrete encontrado com os filtros aplicados'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingReminder?.id ? 'Editar Lembrete' : 'Novo Lembrete'}
            </DialogTitle>
            <DialogDescription>
              {editingReminder?.id
                ? 'Atualize as informações do lembrete'
                : 'Preencha as informações do novo lembrete'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="description">Descrição *</Label>
              <Input
                id="description"
                placeholder="Ex: Conta de luz"
                value={editingReminder?.description || ''}
                onChange={(e) =>
                  setEditingReminder((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Data *</Label>
                <Input
                  id="date"
                  type="date"
                  value={editingReminder?.date || ''}
                  onChange={(e) =>
                    setEditingReminder((prev) => ({ ...prev, date: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Valor (opcional)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={editingReminder?.amount || ''}
                  onChange={(e) =>
                    setEditingReminder((prev) => ({
                      ...prev,
                      amount: e.target.value ? parseFloat(e.target.value) : undefined,
                    }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="recurrence">Recorrência</Label>
                <Select
                  value={editingReminder?.recurrence || 'monthly'}
                  onValueChange={(value) =>
                    setEditingReminder((prev) => ({
                      ...prev,
                      recurrence: value as ReminderRecurrence,
                    }))
                  }
                >
                  <SelectTrigger id="recurrence">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once">Única vez</SelectItem>
                    <SelectItem value="daily">Diário</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={editingReminder?.status || 'active'}
                  onValueChange={(value) =>
                    setEditingReminder((prev) => ({
                      ...prev,
                      status: value as ReminderStatus,
                    }))
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="completed">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSaveReminder} disabled={isSaving}>
              {isSaving ? 'Salvando...' : editingReminder?.id ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lembrete</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o lembrete "{reminderToDelete?.description}"? Esta
              ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
