import { supabase } from '@/lib/supabase';

/**
 * Validates a category ID asynchronously by checking the database
 */
export async function validateCategoryId(
  categoryId: string | undefined | null
): Promise<{ valid: boolean; error?: string }> {
  // Empty/null categoryId is valid (optional field)
  if (!categoryId || categoryId === '' || categoryId === '__none__') {
    return { valid: true };
  }

  // Check UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(categoryId)) {
    return { valid: false, error: 'ID de categoria inválido' };
  }

  // Check database existence
  const { data, error } = await supabase
    .from('categories')
    .select('id')
    .eq('id', categoryId)
    .single();

  if (error || !data) {
    return { valid: false, error: 'Categoria não encontrada' };
  }

  return { valid: true };
}

/**
 * Validates a category ID synchronously against a list of available categories
 * Use this for client-side validation when you already have the categories loaded
 */
export function validateCategoryIdSync(
  categoryId: string | undefined | null,
  availableCategories: { id: string }[]
): boolean {
  // Empty/null categoryId is valid (optional field)
  if (!categoryId || categoryId === '' || categoryId === '__none__') {
    return true;
  }

  // Check UUID format first
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(categoryId)) {
    return false;
  }

  // Check if category exists in the available list
  return availableCategories.some(cat => cat.id === categoryId);
}

/**
 * Checks if a string is a valid UUID format
 */
export function isValidUUID(id: string | undefined | null): boolean {
  if (!id) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}
