import { useParams, useNavigate, Link } from 'react-router-dom';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useTransaction, useUserTransactions } from '@/hooks/useUserTransactions';
import { useUserCategories } from '@/hooks/useUserCategories';
import { AppBreadcrumb } from '@/components/app/AppBreadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { ArrowUpRight, ArrowDownRight, MessageCircle, Pencil, Trash2 } from 'lucide-react';

export default function AppTransactionDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { transaction, loading } = useTransaction(id!);
  const { deleteTransaction } = useUserTransactions();
  const { getCategoryById } = useUserCategories();
  const { toast } = useToast();
  const { formatCurrency } = useFormatCurrency();

  const handleDelete = () => {
    if (!transaction) return;
    
    deleteTransaction(transaction.id);
    toast({
      title: 'Sucesso',
      description: 'Transação excluída com sucesso',
    });
    navigate('/app/transactions');
  };

  // formatCurrency agora vem do hook useFormatCurrency

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  if (loading) {
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

  const category = getCategoryById(transaction.categoryId);

  return (
    <div className="space-y-6">
      <AppBreadcrumb items={[
        { label: 'Transações', href: '/app/transactions' },
        { label: transaction.description }
      ]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Detalhes da Transação</h1>
          <p className="text-muted-foreground">Visualize e gerencie a transação</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to={`/app/transactions/${transaction.id}/edit`}>
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
                <AlertDialogTitle>Excluir transação?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. A transação será permanentemente removida.
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

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Informações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Tipo</p>
                <Badge variant={transaction.type === 'income' ? 'default' : 'destructive'} className="mt-1">
                  {transaction.type === 'income' ? (
                    <><ArrowUpRight className="h-3 w-3 mr-1" />Receita</>
                  ) : (
                    <><ArrowDownRight className="h-3 w-3 mr-1" />Despesa</>
                  )}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor</p>
                <p className={`text-2xl font-bold ${transaction.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                  {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Categoria</p>
              <p className="font-medium">{category?.name || 'Sem categoria'}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Descrição</p>
              <p className="font-medium">{transaction.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Data</p>
                <p className="font-medium">{formatDate(transaction.date)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Origem</p>
                {transaction.origin === 'whatsapp' ? (
                  <Badge variant="outline">
                    <MessageCircle className="h-3 w-3 mr-1" />WhatsApp
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <Pencil className="h-3 w-3 mr-1" />Manual
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <div>
                <p className="text-sm text-muted-foreground">Criado em</p>
                <p className="text-sm">{formatDate(transaction.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Atualizado em</p>
                <p className="text-sm">{formatDate(transaction.updatedAt)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
