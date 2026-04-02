import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface SkeletonProps {
  className?: string;
}

// Dashboard Stats Skeleton
export function StatsCardSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('glass-card p-6 rounded-xl', className)}>
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-32" />
        </div>
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatsCardSkeleton />
      <StatsCardSkeleton />
      <StatsCardSkeleton />
      <StatsCardSkeleton />
    </div>
  );
}

// Transaction List Skeleton
export function TransactionItemSkeleton() {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl glass-card">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="h-5 w-24" />
    </div>
  );
}

export function TransactionListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <TransactionItemSkeleton key={i} />
      ))}
    </div>
  );
}

// Score Card Skeleton
export function ScoreCardSkeleton() {
  return (
    <div className="glass-strong p-6 rounded-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="flex justify-center mb-4">
        <Skeleton className="h-32 w-32 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full" />
    </div>
  );
}

// Goal Card Skeleton
export function GoalCardSkeleton() {
  return (
    <div className="glass-card p-4 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-2 w-full rounded" />
      <Skeleton className="h-3 w-12 ml-auto" />
    </div>
  );
}

export function GoalListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <GoalCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Chart Skeleton
export function ChartSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('glass-strong p-6 rounded-2xl', className)}>
      <Skeleton className="h-5 w-40 mb-4" />
      <div className="flex items-end justify-between gap-2 h-40">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t"
            style={{ height: `${Math.random() * 60 + 40}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-6" />
        ))}
      </div>
    </div>
  );
}

// Budget Progress Skeleton
export function BudgetSkeleton() {
  return (
    <div className="glass-strong p-6 rounded-2xl">
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-3 w-full rounded mb-3" />
      <div className="flex justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

// Full Dashboard Skeleton
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <Skeleton className="h-8 w-40 mb-2" />
        <Skeleton className="h-4 w-60" />
      </div>

      <StatsSkeleton />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ScoreCardSkeleton />
        <BudgetSkeleton />
        <ChartSkeleton />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-strong p-6 rounded-2xl">
          <Skeleton className="h-5 w-40 mb-4" />
          <TransactionListSkeleton />
        </div>
        <div className="glass-strong p-6 rounded-2xl">
          <Skeleton className="h-5 w-32 mb-4" />
          <GoalListSkeleton />
        </div>
      </div>
    </div>
  );
}

// Page Loading Skeleton
export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
      <div className="glass-strong p-6 rounded-2xl">
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
