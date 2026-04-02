import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useGoal, useUserGoals } from '@/hooks/useUserGoals';
import { useUserCategories } from '@/hooks/useUserCategories';
import { AppBreadcrumb } from '@/components/app/AppBreadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, AlertCircle, Clock, Pencil, Trash2, Plus, Loader2 } from 'lucide-react';

export default function AppGoalDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { goal, progress, loading, refresh } = useGoal(id!);
  const { deleteGoal, addProgress } = useUserGoals();
  const { getCategoryById } = useUserCategories();
  const { toast } = useToast();
  const { formatCurrency } = useFormatCurrency();

  const [progressAmount, setProgressAmount] = useState('');
  const [progressNote, setProgressNote] = useState('');
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [isAddingProgress, setIsAddingProgress] = useState(false);
  const [progressError, setProgressError] = useState('');

  const handleDelete = () => {
    if (!goal) return;
    deleteGoal(goal.id);
    toast({ title: 'Sucesso', description: 'Meta excluída' });
    navigate('/app/goals');
  };

  const handleAddProgress = async () => {
    if (!goal) return;

    // Validate
    if (!progressAmount || parseFloat(progressAmount) <= 0) {
      setProgressError('Informe um valor válido maior que zero');
      return;
    }

    setIsAddingProgress(true);
    setProgressError('');

    try {
      addProgress(goal.id, parseFloat(progressAmount), progressNote || undefined);
      toast({ title: 'Sucesso', description: 'Progresso adicionado' });
      setProgressAmount('');
      setProgressNote('');
      setProgressDialogOpen(false);
      refresh();
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível adicionar o progresso', variant: 'destructive' });
    } finally {
      setIsAddingProgress(false);
    }
  };

  // formatCurrency agora vem do hook useFormatCurrency

  const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-BR');
  const formatDateTime = (date: string) => new Date(date).toLocaleString('pt-BR');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Concluída</Badge>;
      case 'overdue':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Atrasada</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Em progresso</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-12 w-96" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="space-y-6">
        <AppBreadcrumb items={[{ label: 'Metas', href: '/app/goals' }, { label: 'Não encontrada' }]} />
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Meta não encontrada</p>
            <Button className="mt-4" onClick={() => navigate('/app/goals')}>Voltar para metas</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progressPercent = (goal.currentAmount / goal.targetAmount) * 100;
  const category = goal.categoryId ? getCategoryById(goal.categoryId) : null;
  const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);

  return (
    <div className="space-y-6">
      <AppBreadcrumb items={[{ label: 'Metas', href: '/app/goals' }, { label: goal.title }]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{goal.title}</h1>
          <p className="text-muted-foreground">Detalhes e progresso da meta</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={progressDialogOpen} onOpenChange={setProgressDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={goal.status === 'completed'}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Progresso
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Progresso</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Meta: {goal.title}</p>
                  <p className="text-sm">Faltam <strong>{formatCurrency(remainingAmount)}</strong> para completar</p>
                </div>
                <div className="space-y-2">
                  <Label>Valor *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={progressAmount}
                    onChange={(e) => {
                      setProgressAmount(e.target.value);
                      setProgressError('');
                    }}
                    className={progressError ? 'border-red-500' : ''}
                  />
                  {progressError && <p className="text-xs text-red-500">{progressError}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Nota (opcional)</Label>
                  <Input
                    placeholder="Ex: Depósito mensal"
                    value={progressNote}
                    onChange={(e) => setProgressNote(e.target.value)}
                  />
                </div>
                <Button onClick={handleAddProgress} className="w-full" disabled={isAddingProgress}>
                  {isAddingProgress && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isAddingProgress ? 'Adicionando...' : 'Adicionar'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" asChild>
            <Link to={`/app/goals/${goal.id}/edit`}>
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </Link>
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir meta?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. A meta e todo seu histórico de progresso serão permanentemente removidos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Informações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                {getStatusBadge(goal.status)}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Progresso</p>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between">
                    <span className="font-semibold">{formatCurrency(goal.currentAmount)}</span>
                    <span className="text-muted-foreground">{formatCurrency(goal.targetAmount)}</span>
                  </div>
                  <Progress value={Math.min(progressPercent, 100)} className="h-3" />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{progressPercent.toFixed(1)}% concluído</span>
                    {remainingAmount > 0 && (
                      <span className="text-muted-foreground">Faltam {formatCurrency(remainingAmount)}</span>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data Limite</p>
                <p className="font-medium">{formatDate(goal.deadline)}</p>
              </div>
              {category && (
                <div>
                  <p className="text-sm text-muted-foreground">Categoria</p>
                  <p className="font-medium">{category.name}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Criada em</p>
                  <p className="text-sm">{formatDate(goal.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Atualizada em</p>
                  <p className="text-sm">{formatDate(goal.updatedAt)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Histórico de Progresso</CardTitle>
          </CardHeader>
          <CardContent>
            {progress.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">Nenhum progresso registrado</p>
                <Button variant="outline" onClick={() => setProgressDialogOpen(true)} disabled={goal.status === 'completed'}>
                  <Plus className="h-4 w-4 mr-2" />
                  Registrar primeiro progresso
                </Button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {progress.map((entry) => (
                  <div key={entry.id} className="p-3 rounded-lg bg-muted/50">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-green-500">+{formatCurrency(entry.amount)}</p>
                        {entry.note && <p className="text-sm text-muted-foreground mt-1">{entry.note}</p>}
                      </div>
                      <p className="text-xs text-muted-foreground">{formatDateTime(entry.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
