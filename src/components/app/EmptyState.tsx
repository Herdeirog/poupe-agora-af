import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { LucideIcon, Plus, FileText, Target, TrendingUp, Calendar, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  variant?: 'default' | 'card' | 'inline';
  className?: string;
  children?: ReactNode;
}

const iconColors: Record<string, string> = {
  transactions: 'text-primary bg-primary/10',
  goals: 'text-user-info bg-user-info/10',
  reports: 'text-user-warning bg-user-warning/10',
  calendar: 'text-user-success bg-user-success/10',
  categories: 'text-user-accent bg-user-accent/10',
};

export function EmptyState({
  icon: Icon = FolderOpen,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  variant = 'default',
  className,
  children,
}: EmptyStateProps) {
  const content = (
    <div className={cn(
      'flex flex-col items-center justify-center text-center',
      variant === 'default' && 'py-12',
      variant === 'card' && 'py-8',
      variant === 'inline' && 'py-4',
      className
    )}>
      <div className={cn(
        'rounded-2xl flex items-center justify-center mb-4',
        variant === 'default' && 'w-20 h-20',
        variant === 'card' && 'w-16 h-16',
        variant === 'inline' && 'w-12 h-12',
        'bg-muted/50'
      )}>
        <Icon className={cn(
          'text-muted-foreground',
          variant === 'default' && 'w-10 h-10',
          variant === 'card' && 'w-8 h-8',
          variant === 'inline' && 'w-6 h-6',
        )} />
      </div>

      <h3 className={cn(
        'font-semibold text-foreground',
        variant === 'default' && 'text-lg',
        variant === 'card' && 'text-base',
        variant === 'inline' && 'text-sm',
      )}>
        {title}
      </h3>

      <p className={cn(
        'text-muted-foreground mt-1 max-w-sm',
        variant === 'default' && 'text-sm',
        variant === 'card' && 'text-sm',
        variant === 'inline' && 'text-xs',
      )}>
        {description}
      </p>

      {(actionLabel || children) && (
        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          {actionLabel && actionHref && (
            <Link to={actionHref}>
              <Button className="btn-premium">
                <Plus className="w-4 h-4 mr-2" />
                {actionLabel}
              </Button>
            </Link>
          )}
          {actionLabel && onAction && !actionHref && (
            <Button className="btn-premium" onClick={onAction}>
              <Plus className="w-4 h-4 mr-2" />
              {actionLabel}
            </Button>
          )}
          {children}
        </div>
      )}
    </div>
  );

  if (variant === 'card') {
    return (
      <div className="glass-card rounded-xl p-6">
        {content}
      </div>
    );
  }

  return content;
}

// Pre-configured empty states for common use cases
export function EmptyTransactions() {
  return (
    <EmptyState
      icon={FileText}
      title="Nenhuma transação encontrada"
      description="Comece a registrar suas receitas e despesas para acompanhar suas finanças."
      actionLabel="Adicionar transação"
      actionHref="/app/transactions/new"
    />
  );
}

export function EmptyGoals() {
  return (
    <EmptyState
      icon={Target}
      title="Nenhuma meta ativa"
      description="Defina metas financeiras para acompanhar seu progresso e alcançar seus objetivos."
      actionLabel="Criar meta"
      actionHref="/app/goals/new"
    />
  );
}

export function EmptyReports() {
  return (
    <EmptyState
      icon={TrendingUp}
      title="Dados insuficientes"
      description="Adicione mais transações para gerar relatórios detalhados das suas finanças."
      actionLabel="Adicionar transação"
      actionHref="/app/transactions/new"
    />
  );
}

export function EmptyCalendar() {
  return (
    <EmptyState
      icon={Calendar}
      title="Nenhum evento neste dia"
      description="Não há transações ou compromissos financeiros para a data selecionada."
      variant="inline"
    />
  );
}
