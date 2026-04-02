import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGoal, useUserGoals } from '@/hooks/useUserGoals';
import { useUserCategories } from '@/hooks/useUserCategories';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { AppBreadcrumb } from '@/components/app/AppBreadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import { validateCategoryIdSync } from '@/utils/categoryValidation';

export default function AppGoalEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { goal, loading: loadingGoal } = useGoal(id!);
  const { updateGoal } = useUserGoals();
  const { categories } = useUserCategories();
  const { formatCurrency } = useFormatCurrency();
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetAmount: '',
    deadline: '',
    categoryId: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data when goal loads
  useEffect(() => {
    if (goal && !isInitialized) {
      setFormData({
        title: goal.title,
        description: '',
        targetAmount: goal.targetAmount.toString(),
        deadline: goal.deadline,
        categoryId: goal.categoryId || '',
      });
      setIsInitialized(true);
    }
  }, [goal, isInitialized]);

  // Filter categories for expense type (savings goals)
  const expenseCategories = categories.filter(
    cat => cat.type === 'expense' || cat.type === 'both'
  );

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Informe um título para a meta';
    } else if (formData.title.length < 3) {
      newErrors.title = 'O título deve ter pelo menos 3 caracteres';
    } else if (formData.title.length > 100) {
      newErrors.title = 'O título deve ter no máximo 100 caracteres';
    }

    if (!formData.targetAmount || parseFloat(formData.targetAmount) <= 0) {
      newErrors.targetAmount = 'Informe um valor alvo válido maior que zero';
    }

    if (!formData.deadline) {
      newErrors.deadline = 'Selecione uma data limite';
    } else {
      const deadlineDate = new Date(formData.deadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (deadlineDate < today) {
        newErrors.deadline = 'A data limite não pode ser no passado';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast({
        title: 'Erro de validação',
        description: 'Corrija os campos destacados',
        variant: 'destructive',
      });
      return;
    }

    // Validar categoria se informada
    if (formData.categoryId && !validateCategoryIdSync(formData.categoryId, categories)) {
      toast({
        title: 'Erro',
        description: 'Categoria selecionada não é válida',
        variant: 'destructive',
      });
      return;
    }

    if (!goal) return;

    setIsSubmitting(true);

    try {
      updateGoal(goal.id, {
        title: formData.title.trim(),
        targetAmount: parseFloat(formData.targetAmount),
        deadline: formData.deadline,
        categoryId: formData.categoryId || undefined,
      });

      toast({
        title: 'Sucesso',
        description: 'Meta atualizada com sucesso',
      });

      navigate(`/app/goals/${goal.id}`);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a meta',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate remaining amount
  const remainingAmount = goal 
    ? Math.max(0, parseFloat(formData.targetAmount || '0') - goal.currentAmount)
    : 0;

  if (loadingGoal) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-12 w-96" />
        <Card className="max-w-2xl">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="space-y-6">
        <AppBreadcrumb items={[
          { label: 'Metas', href: '/app/goals' },
          { label: 'Não encontrada' }
        ]} />
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Meta não encontrada</p>
            <Button className="mt-4" onClick={() => navigate('/app/goals')}>
              Voltar para metas
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AppBreadcrumb items={[
        { label: 'Metas', href: '/app/goals' },
        { label: goal.title, href: `/app/goals/${goal.id}` },
        { label: 'Editar' }
      ]} />

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/app/goals/${goal.id}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Editar Meta</h1>
          <p className="text-muted-foreground">Atualize os dados da meta financeira</p>
        </div>
      </div>

      {/* Current Progress Info */}
      <Card className="max-w-2xl bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Progresso atual: {formatCurrency(goal.currentAmount)}</p>
              <p className="text-xs text-muted-foreground">
                {goal.currentAmount > 0 
                  ? `Você já economizou ${((goal.currentAmount / goal.targetAmount) * 100).toFixed(1)}% da meta original`
                  : 'Nenhum progresso registrado ainda'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Dados da Meta</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título da Meta *</Label>
              <Input
                id="title"
                placeholder="Ex: Reserva de emergência"
                value={formData.title}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, title: e.target.value }));
                  setErrors(prev => ({ ...prev, title: '' }));
                }}
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="targetAmount">Valor Alvo *</Label>
                <Input
                  id="targetAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={formData.targetAmount}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, targetAmount: e.target.value }));
                    setErrors(prev => ({ ...prev, targetAmount: '' }));
                  }}
                  className={errors.targetAmount ? 'border-red-500' : ''}
                />
                {errors.targetAmount && <p className="text-xs text-red-500">{errors.targetAmount}</p>}
                {formData.targetAmount && parseFloat(formData.targetAmount) > 0 && goal.currentAmount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Faltam {formatCurrency(remainingAmount)} para completar
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadline">Data Limite *</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, deadline: e.target.value }));
                    setErrors(prev => ({ ...prev, deadline: '' }));
                  }}
                  className={errors.deadline ? 'border-red-500' : ''}
                />
                {errors.deadline && <p className="text-xs text-red-500">{errors.deadline}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria (opcional)</Label>
              <Select
                value={formData.categoryId || '__none__'}
                onValueChange={(value) => setFormData(prev => ({ ...prev, categoryId: value === '__none__' ? '' : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem categoria</SelectItem>
                  {expenseCategories.filter(cat => cat.id).map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Categorize sua meta para melhor organização
              </p>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate(`/app/goals/${goal.id}`)} 
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
