import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function StatsCard({ title, value, icon, description, trend, className }: StatsCardProps) {
  return (
    <div className={cn(
      'glass-strong p-6 rounded-2xl fade-in-up transition-all duration-300 hover:shadow-premium-hover',
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className={cn(
            'text-2xl font-bold mt-2 transition-colors',
            trend === 'up' && 'value-highlight',
            trend === 'down' && 'value-danger'
          )}>
            {value}
          </p>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {icon && (
          <div className={cn(
            'icon-circle',
            trend === 'up' && 'icon-circle-success',
            trend === 'down' && 'icon-circle-danger'
          )}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
