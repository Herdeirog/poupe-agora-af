import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserGoals } from '@/hooks/useUserGoals';
import { useUserCategories } from '@/hooks/useUserCategories';
import { AppBreadcrumb } from '@/components/app/AppBreadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { validateCategoryIdSync } from '@/utils/categoryValidation';

export default function AppGoalNew() {
  const navigate = useNavigate();
  const { createGoal } = useUserGoals();
  const { categories } = useUserCategories();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    targetAmount: '',
    deadline: '',
    categoryId: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.targetAmount || !formData.deadline) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios',
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

    createGoal({
      title: formData.title,
      targetAmount: parseFloat(formData.targetAmount),
      deadline: formData.deadline,
      categoryId: formData.categoryId || undefined,
    });

    toast({
      title: 'Sucesso',
      description: 'Meta criada com sucesso',
    });

    navigate('/app/goals');
  };

  return (
    <div className="space-y-6">
      <AppBreadcrumb items={[
        { label: 'Metas', href: '/app/goals' },
        { label: 'Nova Meta' }
      ]} />

      <div>
        <h1 className="text-3xl font-bold">Nova Meta</h1>
        <p className="text-muted-foreground">Defina um novo objetivo financeiro</p>
      </div>

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
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="targetAmount">Valor Desejado *</Label>
                <Input
                  id="targetAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={formData.targetAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, targetAmount: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadline">Data Limite *</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                />
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
                  <SelectItem value="__none__">Nenhuma</SelectItem>
                  {categories.filter(cat => cat.id).map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit">Criar Meta</Button>
              <Button type="button" variant="outline" onClick={() => navigate('/app/goals')}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
