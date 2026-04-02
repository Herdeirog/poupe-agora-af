import { useState, useEffect, useCallback } from 'react';
import { UserCategory, CategoryType } from '@/types/userCategory';
import * as storage from '@/services/userCategoryStorage';

export function useUserCategories(type?: CategoryType) {
  const [categories, setCategories] = useState<UserCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    const data = await storage.getCategories();
    // Filtrar por tipo localmente se necessário
    const filtered = type ? data.filter(c => c.type === type) : data;
    setCategories(filtered);
    setLoading(false);
  }, [type]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const createCategory = useCallback(async (data: Omit<UserCategory, 'id' | 'isDefault'>) => {
    const newCategory = await storage.createCategory(data);
    await loadCategories();
    return newCategory;
  }, [loadCategories]);

  const updateCategory = useCallback(async (id: string, data: Partial<UserCategory>) => {
    const updated = await storage.updateCategory(id, data);
    await loadCategories();
    return updated;
  }, [loadCategories]);

  const deleteCategory = useCallback(async (id: string) => {
    const success = await storage.deleteCategory(id);
    if (success) await loadCategories();
    return success;
  }, [loadCategories]);

  const getCategoryById = useCallback((id: string) => {
    // Busca do estado local ao invés de chamar storage (que é async)
    return categories.find(c => c.id === id);
  }, [categories]);

  return {
    categories,
    loading,
    createCategory,
    updateCategory,
    deleteCategory,
    getCategoryById,
    refresh: loadCategories,
  };
}
