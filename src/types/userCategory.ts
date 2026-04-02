export type CategoryType = 'income' | 'expense' | 'both';

export interface UserCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: CategoryType;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}
