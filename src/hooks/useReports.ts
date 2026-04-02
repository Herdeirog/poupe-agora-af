import { useState, useCallback, useMemo } from 'react';
import { useUserTransactions } from './useUserTransactions';
import { useUserCategories } from './useUserCategories';
import * as reportService from '@/services/reportService';
import { FullReport, MonthlyReport, CategoryReport } from '@/services/reportService';

export function useReports() {
  const [loading, setLoading] = useState(false);
  const { transactions } = useUserTransactions();
  const { categories } = useUserCategories();

  const generateFullReport = useCallback((months: number = 12): FullReport => {
    setLoading(true);
    const report = reportService.generateFullReport(transactions, categories, months);
    setLoading(false);
    return report;
  }, [transactions, categories]);

  const getMonthlyReports = useCallback((months: number = 12): MonthlyReport[] => {
    return reportService.generateMonthlyReports(transactions, months);
  }, [transactions]);

  const getCategoryReport = useCallback((months: number = 1): CategoryReport[] => {
    return reportService.generateCategoryReport(transactions, categories, months);
  }, [transactions, categories]);

  const currentMonthReport = useMemo(() => {
    const reports = reportService.generateMonthlyReports(transactions, 1);
    return reports[0] || null;
  }, [transactions]);

  return {
    loading,
    generateFullReport,
    getMonthlyReports,
    getCategoryReport,
    currentMonthReport,
  };
}
