export type GoalStatus = 'in_progress' | 'completed' | 'overdue';

export interface UserGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  categoryId?: string;
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
}

export interface GoalProgressEntry {
  id: string;
  goalId: string;
  amount: number;
  date: string;
  note?: string;
}
