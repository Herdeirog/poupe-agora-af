export interface UserBudget {
  id: string;
  monthlyLimit: number;
  alertAt70: boolean;
  alertAt90: boolean;
  alertAt100: boolean;
  createdAt: string;
  updatedAt: string;
}

export const defaultBudget: Omit<UserBudget, 'id' | 'createdAt' | 'updatedAt'> = {
  monthlyLimit: 3000,
  alertAt70: true,
  alertAt90: true,
  alertAt100: true,
};
