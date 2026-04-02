import { UserCategory } from '@/types/userCategory';
import { supabase } from '@/lib/supabase';

// Helper to map DB category to frontend type
function mapCategory(c: any): UserCategory {
  return {
    id: c.id,
    name: c.name,
    icon: c.icon || '',
    color: c.color || '',
    type: c.type || 'expense',
    isDefault: c.user_id === null, // If user_id is null, it's a system (default) category
    createdAt: c.created_at,
    updatedAt: c.updated_at || c.created_at,
  };
}

export async function getCategories(): Promise<UserCategory[]> {
  // Select user categories + default categories (where user_id is NULL)
  // RLS policies "Users view system categories and own categories" handles the filtering automatically
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }

  return (data || []).map(mapCategory);
}

export async function getCategoryById(id: string): Promise<UserCategory | undefined> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return undefined;

  return mapCategory(data);
}

export async function createCategory(data: Omit<UserCategory, 'id' | 'isDefault' | 'createdAt' | 'updatedAt'>): Promise<UserCategory | null> {
  // Validate User Auth explicitly
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('User not authenticated, cannot create category.');
    return null;
  }

  const { data: newCategory, error } = await supabase
    .from('categories')
    .insert({
      user_id: user.id, // Explicitly linking to auth user
      name: data.name,
      icon: data.icon,
      color: data.color,
      type: data.type,
      is_default: false
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating category:', error);
    return null;
  }

  return mapCategory(newCategory);
}

export async function updateCategory(id: string, data: Partial<UserCategory>): Promise<UserCategory | null> {
  // First check if it exists and is editable (not default)
  // We can just try to update; if RLS prevents it (because it's user_id=null), Supabase will return 0 rows or error.
  // However, checking isDefault locally is also good UX logic.

  const updates: any = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.icon !== undefined) updates.icon = data.icon;
  if (data.color !== undefined) updates.color = data.color;
  if (data.type !== undefined) updates.type = data.type;

  updates.updated_at = new Date().toISOString();

  // RLS "Users manage own categories" ensures we can only update our own rows (user_id = auth.uid())
  // System categories (user_id = null) won't match the policy for UPDATE.
  const { data: updated, error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    // Expected error if trying to update a system category that user doesn't own
    console.error('Error updating category (or permission denied):', error);
    return null;
  }

  return mapCategory(updated);
}

export async function deleteCategory(id: string): Promise<boolean> {
  // RLS "Users manage own categories" ensures we can only delete our own rows.
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting category:', error);
    return false;
  }
  return true;
}

// Deprecated
export function seedCategories(): void { }
