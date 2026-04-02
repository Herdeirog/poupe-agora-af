import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTransaction, useUserTransactions } from '@/hooks/useUserTransactions';
import { useUserCategories } from '@/hooks/useUserCategories';
import { AppBreadcrumb } from '@/components/app/AppBreadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { suggestCategoryFromDescription } from '@/services/autoCategorizeService';
import { Loader2, Sparkles, ArrowLeft } from 'lucide-react';
import { validateCategoryIdSync } from '@/utils/categoryValidation';

export default function AppTransactionEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { transaction, loading: loadingTransaction } = useTransaction(id!);
  const { updateTransaction } = useUserTransactions();
  const { categories, getCategoryById } = useUserCategories();
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [suggestedCategory, setSuggestedCategory] = useState<{ id: string; confidence: string } | null>(null);

  const [formData, setFormData] = useState({
    amount: '',
    type: 'expense' as 'income' | 'expense',
    categoryId: '',
    description: '',
    date: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data when transaction loads
  useEffect(() => {
    if (transaction && !isInitialized) {
      setFormData({
        amount: transaction.amount.toString(),
        type: transaction.type,
        categoryId: transaction.categoryId,
        description: transaction.description,
        date: transaction.date,
      });
      setIsInitialized(true);
    }
  }, [transaction, isInitialized]);

  const filteredCategories = categories.filter(
    cat => cat.type === formData.type || cat.type === 'both'
  );

  // Auto-categorize based on description changes
  useEffect(() => {
    if (formData.description.length >= 3 && formData.type === 'expense' && isInitialized) {
      const suggestion = suggestCategoryFromDescription(formData.description);
      const category = getCategoryById(suggestion.categoryId);
      
      // Only show suggestion if it's different from current category
      if (category && 
          (category.type === formData.type || category.type === 'both') &&
          suggestion.categoryId !== formData.categoryId) {
        setSuggestedCategory({ id: suggestion.categoryId, confidence: suggestion.confidence });
      } else {
        setSuggestedCategory(null);
      }
    } else {
      setSuggestedCategory(null);
    }
  }, [formData.description, formData.type, formData.categoryId, getCategoryById, isInitialized]);

  const handleApplySuggestion = () => {
    if (suggestedCategory) {
      setFormData(prev => ({ ...prev, categoryId: suggestedCategory.id }));
      setSuggestedCategory(null);
      toast({
        title: 'Categoria aplicada',
        description: 'A categoria sugerida foi selecionada.',
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Informe um valor válido maior que zero';
    }

    if (!formData.categoryId) {
      newErrors.categoryId = 'Selecione uma categoria';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Informe uma descrição';
    } else if (formData.description.length < 3) {
      newErrors.description = 'A descrição deve ter pelo menos 3 caracteres';
    } else if (formData.description.length > 200) {
      newErrors.description = 'A descrição deve ter no máximo 200 caracteres';
    }

    if (!formData.date) {
      newErrors.date = 'Selecione uma data';
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

    // Validar categoria
    if (!validateCategoryIdSync(formData.categoryId, categories)) {
      toast({
        title: 'Erro',
        description: 'Categoria selecionada não é válida',
        variant: 'destructive',
      });
      return;
    }

    if (!transaction) return;

    setIsSubmitting(true);

    try {
      updateTransaction(transaction.id, {
        amount: parseFloat(formData.amount),
        type: formData.type,
        categoryId: formData.categoryId,
        description: formData.description.trim(),
        date: formData.date,
      });

      toast({
        title: 'Sucesso',
        description: 'Transação atualizada com sucesso',
      });

      navigate(`/app/transactions/${transaction.id}`);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a transação',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const suggestedCategoryData = suggestedCategory ? getCategoryById(suggestedCategory.id) : null;

  if (loadingTransaction) {
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
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="space-y-6">
        <AppBreadcrumb items={[
          { label: 'Transações', href: '/app/transactions' },
          { label: 'Não encontrada' }
        ]} />
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Transação não encontrada</p>
            <Button className="mt-4" onClick={() => navigate('/app/transactions')}>
              Voltar para transações
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AppBreadcrumb items={[
        { label: 'Transações', href: '/app/transactions' },
        { label: transaction.description, href: `/app/transactions/${transaction.id}` },
        { label: 'Editar' }
      ]} />

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/app/transactions/${transaction.id}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Editar Transação</h1>
          <p className="text-muted-foreground">Atualize os dados da transação</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Dados da Transação</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: 'income' | 'expense') => 
                    setFormData(prev => ({ ...prev, type: value, categoryId: '' }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Despesa</SelectItem>
                    <SelectItem value="income">Receita</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Valor *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={formData.amount}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, amount: e.target.value }));
                    setErrors(prev => ({ ...prev, amount: '' }));
                  }}
                  className={errors.amount ? 'border-red-500' : ''}
                />
                {errors.amount && <p className="text-xs text-red-500">{errors.amount}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição *</Label>
              <Textarea
                id="description"
                placeholder="Ex: Compra no supermercado"
                value={formData.description}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, description: e.target.value }));
                  setErrors(prev => ({ ...prev, description: '' }));
                }}
                className={errors.description ? 'border-red-500' : ''}
              />
              {errors.description && <p className="text-xs text-red-500">{errors.description}</p>}
              
              {/* Auto-categorization suggestion */}
              {suggestedCategory && suggestedCategoryData && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm flex-1">
                    Sugestão: <strong>{suggestedCategoryData.name}</strong>
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {suggestedCategory.confidence === 'high' ? 'Alta' : 'Média'} confiança
                  </Badge>
                  <Button type="button" size="sm" variant="secondary" onClick={handleApplySuggestion}>
                    Aplicar
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria *</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) => {
                  setFormData(prev => ({ ...prev, categoryId: value }));
                  setErrors(prev => ({ ...prev, categoryId: '' }));
                }}
              >
                <SelectTrigger className={errors.categoryId ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.categoryId && <p className="text-xs text-red-500">{errors.categoryId}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Data *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, date: e.target.value }));
                  setErrors(prev => ({ ...prev, date: '' }));
                }}
                className={errors.date ? 'border-red-500' : ''}
              />
              {errors.date && <p className="text-xs text-red-500">{errors.date}</p>}
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate(`/app/transactions/${transaction.id}`)} 
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
