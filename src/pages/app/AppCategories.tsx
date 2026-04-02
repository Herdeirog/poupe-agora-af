import { useState } from 'react';
import { useUserCategories } from '@/hooks/useUserCategories';
import { AppBreadcrumb } from '@/components/app/AppBreadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2 } from 'lucide-react';

export default function AppCategories() {
  const { categories, createCategory, updateCategory, deleteCategory } = useUserCategories();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', icon: 'Tag', color: '#6b7280', type: 'expense' as 'income' | 'expense' | 'both' });

  const handleSubmit = () => {
    if (!formData.name) { toast({ title: 'Erro', description: 'Nome obrigatório', variant: 'destructive' }); return; }
    if (editingId) { updateCategory(editingId, formData); toast({ title: 'Categoria atualizada' }); }
    else { createCategory({ ...formData, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }); toast({ title: 'Categoria criada' }); }
    setDialogOpen(false); setEditingId(null); setFormData({ name: '', icon: 'Tag', color: '#6b7280', type: 'expense' });
  };

  const handleEdit = (cat: any) => { setEditingId(cat.id); setFormData({ name: cat.name, icon: cat.icon, color: cat.color, type: cat.type }); setDialogOpen(true); };
  const handleDelete = (id: string) => { if (deleteCategory(id)) toast({ title: 'Categoria excluída' }); else toast({ title: 'Erro', description: 'Categorias padrão não podem ser excluídas', variant: 'destructive' }); };

  return (
    <div className="space-y-6">
      <AppBreadcrumb items={[{ label: 'Categorias' }]} />
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold">Categorias</h1><p className="text-muted-foreground">Gerencie suas categorias</p></div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditingId(null); setFormData({ name: '', icon: 'Tag', color: '#6b7280', type: 'expense' }); } }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nova Categoria</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingId ? 'Editar' : 'Nova'} Categoria</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2"><Label>Nome</Label><Input value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Tipo</Label>
                <Select value={formData.type} onValueChange={(v: any) => setFormData(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="expense">Despesa</SelectItem><SelectItem value="income">Receita</SelectItem><SelectItem value="both">Ambos</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Cor</Label><Input type="color" value={formData.color} onChange={(e) => setFormData(p => ({ ...p, color: e.target.value }))} /></div>
              <Button onClick={handleSubmit} className="w-full">{editingId ? 'Salvar' : 'Criar'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Card><CardContent className="p-6"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <div key={cat.id} className="p-4 rounded-lg border flex items-center justify-between">
            <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }} /><div><p className="font-medium">{cat.name}</p><Badge variant="outline" className="text-xs">{cat.type === 'income' ? 'Receita' : cat.type === 'expense' ? 'Despesa' : 'Ambos'}</Badge></div></div>
            {!cat.isDefault && <div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => handleEdit(cat)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => handleDelete(cat.id)}><Trash2 className="h-4 w-4" /></Button></div>}
          </div>
        ))}
      </div></CardContent></Card>
    </div>
  );
}
