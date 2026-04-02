import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserTransactions } from '@/hooks/useUserTransactions';
import { useUserCategories } from '@/hooks/useUserCategories';
import { AppBreadcrumb } from '@/components/app/AppBreadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { suggestCategoryFromDescription } from '@/services/autoCategorizeService';
import { Loader2, Sparkles } from 'lucide-react';
import { validateCategoryIdSync } from '@/utils/categoryValidation';

export default function AppTransactionNew() {
  const navigate = useNavigate();
  const { createTransaction } = useUserTransactions();
  const { categories, getCategoryById } = useUserCategories();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suggestedCategory, setSuggestedCategory] = useState<{ id: string; confidence: string } | null>(null);

  const [formData, setFormData] = useState({
    amount: '',
    type: 'expense' as 'income' | 'expense',
    categoryId: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const filteredCategories = categories.filter(
    cat => cat.type === formData.type || cat.type === 'both'
  );

  // Auto-categorize based on description
  useEffect(() => {
    if (formData.description.length >= 3 && formData.type === 'expense') {
      const suggestion = suggestCategoryFromDescription(formData.description);
      const category = getCategoryById(suggestion.categoryId);
      if (category && (category.type === formData.type || category.type === 'both')) {
        setSuggestedCategory({ id: suggestion.categoryId, confidence: suggestion.confidence });
      } else {
        setSuggestedCategory(null);
      }
    } else {
      setSuggestedCategory(null);
    }
  }, [formData.description, formData.type, getCategoryById]);

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

    setIsSubmitting(true);

    try {
      createTransaction({
        amount: parseFloat(formData.amount),
        type: formData.type,
        categoryId: formData.categoryId,
        description: formData.description.trim(),
        date: formData.date,
        origin: 'manual',
      });

      toast({
        title: 'Sucesso',
        description: 'Transação criada com sucesso',
      });

      navigate('/app/transactions');
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível criar a transação',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const suggestedCategoryData = suggestedCategory ? getCategoryById(suggestedCategory.id) : null;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <AppBreadcrumb items={[
        { label: 'Transações', href: '/app/transactions' },
        { label: 'Nova Transação' }
      ]} />

      <div>
        <h1 className="text-3xl font-bold">Nova Transação</h1>
        <p className="text-muted-foreground">Adicione uma nova receita ou despesa</p>
      </div>

      <Card>
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
              {suggestedCategory && suggestedCategoryData && !formData.categoryId && (
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
                {isSubmitting ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/app/transactions')} disabled={isSubmitting}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
