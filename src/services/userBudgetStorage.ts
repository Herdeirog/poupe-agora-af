import { UserBudget, defaultBudget } from '@/types/userBudget';
import { supabase } from '@/lib/supabase';

// Helper to map DB budget to frontend type
function mapBudget(b: any): UserBudget {
    return {
        id: b.id,
        monthlyLimit: Number(b.monthly_limit),
        alertAt70: b.alert_at_70,
        alertAt90: b.alert_at_90,
        alertAt100: b.alert_at_100,
        createdAt: b.created_at,
        updatedAt: b.updated_at,
    };
}

export async function getBudget(): Promise<UserBudget | null> {
    const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .single();

    if (error) {
        // If no rows found, it's fine, return null (SetupWizard will handle or we create default)
        if (error.code !== 'PGRST116') {
            console.error('Error fetching budget:', error);
        }
        return null;
    }

    return mapBudget(data);
}

export async function createBudget(data: Partial<UserBudget>): Promise<UserBudget | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: newBudget, error } = await supabase
        .from('budgets')
        .insert({
            user_id: user.id,
            monthly_limit: data.monthlyLimit || defaultBudget.monthlyLimit,
            alert_at_70: data.alertAt70 ?? defaultBudget.alertAt70,
            alert_at_90: data.alertAt90 ?? defaultBudget.alertAt90,
            alert_at_100: data.alertAt100 ?? defaultBudget.alertAt100,
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating budget:', error);
        return null;
    }

    return mapBudget(newBudget);
}

export async function updateBudget(data: Partial<UserBudget>): Promise<UserBudget | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // First try to select to see if it exists
    const current = await getBudget();

    if (!current) {
        // If not exists, create it
        return createBudget(data);
    }

    const updates: any = {};
    if (data.monthlyLimit !== undefined) updates.monthly_limit = data.monthlyLimit;
    if (data.alertAt70 !== undefined) updates.alert_at_70 = data.alertAt70;
    if (data.alertAt90 !== undefined) updates.alert_at_90 = data.alertAt90;
    if (data.alertAt100 !== undefined) updates.alert_at_100 = data.alertAt100;

    updates.updated_at = new Date().toISOString();

    const { data: updated, error } = await supabase
        .from('budgets')
        .update(updates)
        .eq('user_id', user.id) // budgets are 1:1 with user usually
        .select()
        .single();

    if (error) {
        console.error('Error updating budget:', error);
        return null;
    }

    return mapBudget(updated);
}
