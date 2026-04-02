import { useState, useEffect, useCallback } from 'react';
import { UserBudget } from '@/types/userBudget';
import * as storage from '@/services/userBudgetStorage';

export function useBudget() {
    const [budget, setBudget] = useState<UserBudget | null>(null);
    const [loading, setLoading] = useState(true);

    const loadBudget = useCallback(async () => {
        setLoading(true);
        const data = await storage.getBudget();
        setBudget(data);
        setLoading(false);
    }, []);

    useEffect(() => {
        loadBudget();
    }, [loadBudget]);

    const updateBudget = useCallback(async (data: Partial<UserBudget>) => {
        const updated = await storage.updateBudget(data);
        if (updated) {
            setBudget(updated);
        }
        return updated;
    }, []);

    return {
        budget,
        loading,
        updateBudget,
        refresh: loadBudget,
    };
}
