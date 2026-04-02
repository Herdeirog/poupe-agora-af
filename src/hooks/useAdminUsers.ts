import { useState, useEffect, useCallback, useMemo } from "react";
import { AdminUser } from "@/types/adminUser";
import {
  getAdminUsers,
  getAdminUserById,
  updateAdminUser as updateUser,
  deleteAdminUser as deleteUser,
} from "@/services/adminUserStorage";

const PLAN_PRICES = {
  gratuito: 0,
  free: 0,
  mensal: 97,
  monthly: 97,
  anual: 970,
  annual: 970,
  premium: 197,
};

export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdminUsers();
      setUsers(data);
    } catch (error) {
      console.error('Error loading admin users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const getUserById = useCallback(async (id: string): Promise<AdminUser | null> => {
    const user = await getAdminUserById(id);
    return user || null;
  }, []);

  const createUser = useCallback(async (userData: Omit<AdminUser, "id">) => {
    // Note: The actual user creation should be done via Supabase Auth
    // This is a placeholder that refreshes the user list
    await refreshUsers();
    return null; // Return null as we can't create users directly here
  }, [refreshUsers]);

  const updateUserData = useCallback(async (userId: string, data: Partial<AdminUser>) => {
    await updateUser(userId, data);
    await refreshUsers();
  }, [refreshUsers]);

  const deleteUserData = useCallback(async (userId: string) => {
    await deleteUser(userId);
    await refreshUsers();
  }, [refreshUsers]);

  const toggleUserAccess = useCallback((userId: string) => {
    // Note: This function is deprecated as access control should be handled via Supabase RLS
    // Keeping for compatibility but it won't actually update anything
    return true;
  }, []);

  const toggleUserStatus = useCallback(async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const newStatus = user.status === 'ativo' || user.status === 'active' ? 'inativo' : 'ativo';
    await updateUserData(userId, { status: newStatus });
  }, [users, updateUserData]);

  // Métricas calculadas
  const metrics = useMemo(() => {
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.status === 'ativo' || u.status === 'active').length;
    const activeSubscriptions = users.filter(
      u => u.plan && u.plan !== 'gratuito' && u.plan !== 'free' && (u.status === 'ativo' || u.status === 'active')
    ).length;
    const monthlyRevenue = users
      .filter(u => u.status === 'ativo' || u.status === 'active')
      .reduce((acc, u) => {
        const plan = u.plan || 'gratuito';
        return acc + (PLAN_PRICES[plan as keyof typeof PLAN_PRICES] || 0);
      }, 0);
    const usersInTrial = users.filter(u => u.status === 'trial').length;
    const blockedUsers = users.filter(u => u.status === 'suspended' || u.status === 'suspenso').length;

    return {
      totalUsers,
      activeUsers,
      activeSubscriptions,
      monthlyRevenue,
      usersInTrial,
      blockedUsers,
    };
  }, [users]);

  // Últimos 5 usuários
  const recentUsers = useMemo(() => {
    return [...users]
      .sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime())
      .slice(0, 5);
  }, [users]);

  return {
    users,
    loading,
    refreshUsers,
    getUserById,
    createUser,
    updateUser: updateUserData,
    deleteUser: deleteUserData,
    toggleUserAccess,
    toggleUserStatus,
    metrics,
    recentUsers,
  };
}
