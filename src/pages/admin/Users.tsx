
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import {
    Users, CheckCircle, XCircle, Clock, TrendingUp, TrendingDown,
    Search, Download, Plus, Eye, Edit, Smartphone,
    CreditCard, Gift, Pause, Play, Trash2, MoreVertical, Calendar,
    UserPlus, Check, AlertCircle, Save, Shield, ChevronLeft, ChevronRight, X, Loader2, AlertTriangle, Link2, ExternalLink, RefreshCw, PowerOff
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { UserFormModal } from '@/components/admin/UserFormModal';

// --- Tipos ---
type UserStatus = 'Ativo' | 'Trial' | 'Inativo' | 'Suspenso';
type UserPlan = 'Gratuito' | 'Básico' | 'Premium' | 'Elite';
type UserType = 'Usuário' | 'Admin';

interface AppUser {
    id: string;
    name: string;
    email: string;
    phone: string;
    plan: UserPlan;
    status: UserStatus;
    createdAt: string; // ISO date string
    type: UserType;
    avatarUrl?: string;
    // Extras para o modal de detalhes
    expirationDate?: string;
    customerId?: string;
    subscriptionId?: string;
    transactionsCount?: number;
    assistantQueries?: number;
    lastActivity?: string;
}

// Interfaces do Supabase para tipagem
interface SupabaseProfile {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    whatsapp: string;
    tipo: string;
    created_at: string;
    active: boolean;
}

interface SupabaseSubscription {
    plan: string;
    status: string;
    trial_ends_at: string;
}

// Função de busca
const fetchUsers = async (): Promise<AppUser[]> => {
    // 1. Buscar Perfis
    const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

    if (profilesError) throw profilesError;

    // 2. Buscar Roles para determinar tipo de usuário
    const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

    if (rolesError) {
        console.warn('Erro ao buscar roles:', rolesError);
    }

    // 3. Buscar Assinaturas
    const { data: subscriptions, error: subsError } = await supabase
        .from('subscriptions')
        .select('*');

    if (subsError) {
        console.warn('Erro ao buscar assinaturas:', subsError);
    }

    // 4. Buscar contagem de transações por usuário
    const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('user_id');

    if (txError) {
        console.warn('Erro ao buscar transações:', txError);
    }

    // Agrupar contagem de transações por user_id
    const txCountMap: Record<string, number> = {};
    (transactions || []).forEach((tx: any) => {
        txCountMap[tx.user_id] = (txCountMap[tx.user_id] || 0) + 1;
    });

    // 5. Mapear dados dos perfis
    return (profiles || []).map((profile: any) => {
        const userRole = roles?.find((r: any) => r.user_id === profile.id);
        const subscription = subscriptions?.find((s: any) => s.user_id === profile.id);

        // Mapear Status - profile.ativo=false significa conta suspensa
        let status: UserStatus = 'Ativo';
        if (profile.ativo === false) status = 'Suspenso';
        else if (subscription?.status === 'trial') status = 'Trial';
        else if (subscription?.status === 'suspensa') status = 'Suspenso';
        else if (subscription?.status === 'inativo' || subscription?.status === 'canceled') status = 'Inativo';

        // Mapear Plano
        let plan: UserPlan = 'Gratuito';
        if (subscription?.plan) {
            const p = subscription.plan.toLowerCase();
            if (p === 'mensal' || p === 'trimestral' || p === 'semestral') plan = 'Básico';
            else if (p === 'anual') plan = 'Premium';
            else if (p === 'vitalicio' || p === 'premium') plan = 'Elite';
        }

        return {
            id: profile.id,
            name: profile.full_name || 'Usuário Sem Nome',
            email: profile.email || 'sem@email.com',
            phone: profile.whatsapp || profile.telefone || '',
            plan: plan,
            status: status,
            createdAt: profile.created_at,
            type: userRole?.role === 'admin' ? 'Admin' : 'Usuário',
            avatarUrl: profile.avatar_url,
            transactionsCount: txCountMap[profile.id] || 0,
            subscriptionId: subscription?.id,
            expirationDate: subscription?.current_period_end || subscription?.trial_ends_at,
            assistantQueries: 0,
            lastActivity: profile.updated_at || profile.created_at
        };
    });
};

// --- Funções Auxiliares CSV ---
const convertToCSV = (data: AppUser[]): string => {
    // Headers com acentos e formatação correta
    const headers = [
        'ID',
        'Nome',
        'Email',
        'WhatsApp',
        'Plano',
        'Status',
        'Tipo',
        'Data de Cadastro',
        'Data de Expiração',
        'Customer ID',
        'Assinatura ID',
        'Transações',
        'Consultas IA',
        'Última Atividade'
    ];

    // Mapeamento dos dados
    const rows = data.map(user => [
        user.id,
        user.name,
        user.email,
        user.phone,
        user.plan,
        user.status,
        user.type,
        new Date(user.createdAt).toLocaleDateString('pt-BR'),
        user.expirationDate ? new Date(user.expirationDate).toLocaleDateString('pt-BR') : '',
        user.customerId || '',
        user.subscriptionId || '',
        user.transactionsCount || 0,
        user.assistantQueries || 0,
        user.lastActivity ? new Date(user.lastActivity).toLocaleDateString('pt-BR') : ''
    ]);

    // Combinar headers + rows, garantindo escape de aspas
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    return csvContent;
};

const downloadCSV = (csvContent: string, filename: string) => {
    // Adicionar BOM UTF-8 para suporte correto a acentos no Excel
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
};

// Função auxiliar de data
const checkDateFilter = (dataCadastro: string, filter: string): boolean => {
    if (filter === "all") return true;

    const now = new Date();
    const cadastro = new Date(dataCadastro);
    const diffMs = now.getTime() - cadastro.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    switch (filter) {
        case "today": return diffDays <= 1;
        case "7days": return diffDays <= 7;
        case "30days": return diffDays <= 30;
        default: return true;
    }
};

export default function UsersPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { formatCurrency } = useFormatCurrency();

    // Query para buscar planos disponíveis
    const { data: availablePlans = [] } = useQuery({
        queryKey: ['plans-list'],
        queryFn: async () => {
            const { data } = await supabase.from('plans').select('id, name').eq('active', true);
            return data || [];
        },
        staleTime: 1000 * 60 * 60,
    });

    // Mutation para alterar plano
    const changePlanMutation = useMutation({
        mutationFn: async ({ userId, planName }: { userId: string, planName: string }) => {
            const { data: existingSub } = await supabase
                .from('subscriptions')
                .select('id')
                .eq('user_id', userId)
                .single();

            const payload = {
                user_id: userId,
                status: 'active',
                plan: planName,
                updated_at: new Date().toISOString()
            };

            if (existingSub) {
                const { error } = await supabase.from('subscriptions').update(payload).eq('id', existingSub.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('subscriptions').insert(payload);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            setIsChangePlanOpen(false);
            toast({ title: "Plano atualizado", description: "O plano do usuário foi alterado com sucesso.", className: "bg-emerald-500 text-white" });
        },
        onError: (err) => {
            console.error(err);
            toast({ title: "Erro", description: "Falha ao atualizar plano.", variant: "destructive" });
        }
    });

    // Query para buscar usuários
    const { data: users = [], isLoading, error } = useQuery({
        queryKey: ['admin-users'],
        queryFn: fetchUsers,
        staleTime: 1000 * 60 * 5, // 5 minutos de cache
    });

    // Estados de Filtro
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Debounce manual
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [planFilter, setPlanFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [dateFilter, setDateFilter] = useState<string>('all');
    const [isExporting, setIsExporting] = useState(false);

    // Paginação
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const tableRef = useRef<HTMLDivElement>(null);

    // Estados de Modal e Seleção
    const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);

    // Modais abertos
    const [isNewUserOpen, setIsNewUserOpen] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);

    // Novo Estado para Troca de Plano
    const [isChangePlanOpen, setIsChangePlanOpen] = useState(false);
    const [selectedPlanId, setSelectedPlanId] = useState<string>('');
    const [isWhatsappOpen, setIsWhatsappOpen] = useState(false);
    const [isTrialOpen, setIsTrialOpen] = useState(false);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const [isSuspendOpen, setIsSuspendOpen] = useState(false);
    const [isSuspending, setIsSuspending] = useState(false);
    
    // Estados para formulários
    const [newWhatsapp, setNewWhatsapp] = useState('');
    const [isWhatsappSaving, setIsWhatsappSaving] = useState(false);
    const [trialDuration, setTrialDuration] = useState('7');
    const [trialPlan, setTrialPlan] = useState('Premium');
    const [isTrialSaving, setIsTrialSaving] = useState(false);
    const [editFormData, setEditFormData] = useState({
        name: '',
        email: '',
        phone: '',
        plan: 'Gratuito' as UserPlan,
        status: 'Ativo' as UserStatus,
        isAdmin: false
    });
    const [isEditSaving, setIsEditSaving] = useState(false);

    // Resetar página quando filtros mudam
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch, statusFilter, planFilter, typeFilter, dateFilter]);

    // Filtros e Busca
    const filteredUsers = useMemo(() => {
        let result = users; // AGORA USA DADOS DO SUPABASE

        // 1. Busca textual
        if (debouncedSearch) {
            const query = debouncedSearch.toLowerCase();
            result = result.filter(user =>
                user.name.toLowerCase().includes(query) ||
                user.email.toLowerCase().includes(query) ||
                user.phone.replace(/\D/g, '').includes(query.replace(/\D/g, ''))
            );
        }

        // 2. Filtro de Status
        if (statusFilter !== 'all') {
            result = result.filter(user => user.status === statusFilter);
        }

        // 3. Filtro de Plano
        if (planFilter !== 'all') {
            result = result.filter(user => user.plan === planFilter);
        }

        // 4. Filtro de Tipo
        if (typeFilter !== 'all') {
            result = result.filter(user => user.type === typeFilter);
        }

        // 5. Filtro de Data
        if (dateFilter !== 'all') {
            result = result.filter(user => checkDateFilter(user.createdAt, dateFilter));
        }

        return result;
    }, [users, debouncedSearch, statusFilter, planFilter, typeFilter, dateFilter]);

    // Métricas dinâmicas com base no filtro
    const metrics = useMemo(() => {
        return {
            total: filteredUsers.length,
            active: filteredUsers.filter(u => u.status === 'Ativo').length,
            trial: filteredUsers.filter(u => u.status === 'Trial').length,
            inactive: filteredUsers.filter(u => ['Inativo', 'Suspenso'].includes(u.status)).length,
        };
    }, [filteredUsers]);

    // Resetar paginação quando filtros mudam
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch, statusFilter, planFilter, typeFilter, dateFilter]);

    // Calcular total de páginas
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

    // Ajustar página se exceder o total (ex: filtragem reduz itens)
    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        }
    }, [totalPages, currentPage]);

    const activeFiltersCount = [
        statusFilter !== "all",
        planFilter !== "all",
        typeFilter !== "all",
        dateFilter !== "all",
        searchQuery !== ""
    ].filter(Boolean).length;

    const clearAllFilters = () => {
        setSearchQuery('');
        setStatusFilter('all');
        setPlanFilter('all');
        setTypeFilter('all');
        setDateFilter('all');
    };

    // --- Lógica de Paginação ---
    const paginatedUsers = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredUsers.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredUsers, currentPage]);

    // --- Navegação ---
    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage);
        tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // Atalhos de teclado
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            // Apenas se não estiver focado em inputs
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

            if (e.key === 'ArrowLeft' && currentPage > 1) {
                handlePageChange(currentPage - 1);
            } else if (e.key === 'ArrowRight' && currentPage < totalPages) {
                handlePageChange(currentPage + 1);
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [currentPage, totalPages]);

    // Índices para exibição
    const startIndexDisplay = (currentPage - 1) * itemsPerPage + 1;
    const endIndexDisplay = Math.min(currentPage * itemsPerPage, filteredUsers.length);

    // --- Handlers de Ação ---
    const handleUserCreated = () => {
        queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;
        
        setIsEditSaving(true);
        try {
            // Atualizar profile
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    full_name: editFormData.name,
                    email: editFormData.email,
                    whatsapp: editFormData.phone.replace(/\D/g, ''),
                    updated_at: new Date().toISOString()
                })
                .eq('id', selectedUser.id);
            
            if (profileError) throw profileError;
            
            // Atualizar role de admin se necessário
            const wasAdmin = selectedUser.type === 'Admin';
            const isNowAdmin = editFormData.isAdmin;
            
            if (wasAdmin !== isNowAdmin) {
                if (isNowAdmin) {
                    // Adicionar role admin
                    const { error: roleError } = await supabase
                        .from('user_roles')
                        .insert({ user_id: selectedUser.id, role: 'admin' });
                    if (roleError && !roleError.message.includes('duplicate')) throw roleError;
                } else {
                    // Remover role admin
                    const { error: roleError } = await supabase
                        .from('user_roles')
                        .delete()
                        .eq('user_id', selectedUser.id)
                        .eq('role', 'admin');
                    if (roleError) throw roleError;
                }
            }
            
            // Atualizar subscription se plano/status mudou
            const { data: existingSub } = await supabase
                .from('subscriptions')
                .select('id')
                .eq('user_id', selectedUser.id)
                .single();
            
            const planMap: Record<UserPlan, string> = {
                'Gratuito': 'gratuito',
                'Básico': 'mensal',
                'Premium': 'anual',
                'Elite': 'vitalicio'
            };
            
            const statusMap: Record<UserStatus, string> = {
                'Ativo': 'active',
                'Trial': 'trial',
                'Inativo': 'inativo',
                'Suspenso': 'suspensa'
            };
            
            const subData = {
                plan: planMap[editFormData.plan],
                status: statusMap[editFormData.status],
                updated_at: new Date().toISOString()
            };
            
            if (existingSub) {
                await supabase.from('subscriptions').update(subData).eq('id', existingSub.id);
            } else if (editFormData.plan !== 'Gratuito') {
                await supabase.from('subscriptions').insert({
                    user_id: selectedUser.id,
                    user_email: selectedUser.email,
                    ...subData
                });
            }
            
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            setIsEditOpen(false);
            toast({
                title: "Informações atualizadas",
                description: `Dados de ${editFormData.name} salvos com sucesso.`,
                className: "bg-emerald-500 text-white"
            });
        } catch (error: any) {
            console.error('Erro ao atualizar usuário:', error);
            toast({
                title: "Erro ao atualizar",
                description: error.message || "Tente novamente",
                variant: "destructive"
            });
        } finally {
            setIsEditSaving(false);
        }
    };

    const handleChangeWhatsapp = async () => {
        if (!selectedUser || !newWhatsapp.trim()) {
            toast({ title: "Erro", description: "Informe o novo número de WhatsApp", variant: "destructive" });
            return;
        }
        
        setIsWhatsappSaving(true);
        try {
            const cleanNumber = newWhatsapp.replace(/\D/g, '');
            
            const { error } = await supabase
                .from('profiles')
                .update({ 
                    whatsapp: cleanNumber,
                    updated_at: new Date().toISOString()
                })
                .eq('id', selectedUser.id);
            
            if (error) throw error;
            
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            setIsWhatsappOpen(false);
            setNewWhatsapp('');
            toast({
                title: "WhatsApp alterado com sucesso",
                description: `Número atualizado para ${cleanNumber}`,
                className: "bg-emerald-500 text-white"
            });
        } catch (error: any) {
            console.error('Erro ao alterar WhatsApp:', error);
            toast({
                title: "Erro ao alterar WhatsApp",
                description: error.message || "Tente novamente",
                variant: "destructive"
            });
        } finally {
            setIsWhatsappSaving(false);
        }
    };

    const handleReleaseTrial = async () => {
        if (!selectedUser) return;
        
        setIsTrialSaving(true);
        try {
            const durationDays = parseInt(trialDuration);
            const trialEndsAt = new Date();
            trialEndsAt.setDate(trialEndsAt.getDate() + durationDays);
            
            // Verificar se já existe subscription
            const { data: existingSub } = await supabase
                .from('subscriptions')
                .select('id')
                .eq('user_id', selectedUser.id)
                .single();
            
            const subscriptionData = {
                user_id: selectedUser.id,
                status: 'trial',
                plan: trialPlan.toLowerCase(),
                start_date: new Date().toISOString().split('T')[0],
                end_date: trialEndsAt.toISOString().split('T')[0],
                updated_at: new Date().toISOString()
            };
            
            if (existingSub) {
                const { error } = await supabase
                    .from('subscriptions')
                    .update(subscriptionData)
                    .eq('id', existingSub.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('subscriptions')
                    .insert({
                        ...subscriptionData,
                        user_email: selectedUser.email
                    });
                if (error) throw error;
            }
            
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            setIsTrialOpen(false);
            toast({
                title: "Trial liberado com sucesso!",
                description: `${selectedUser.name} tem acesso ${trialPlan} por ${durationDays} dias.`,
                className: "bg-emerald-500 text-white"
            });
        } catch (error: any) {
            console.error('Erro ao liberar trial:', error);
            toast({
                title: "Erro ao liberar trial",
                description: error.message || "Tente novamente",
                variant: "destructive"
            });
        } finally {
            setIsTrialSaving(false);
        }
    };

    const handleSuspendUser = async () => {
        if (!selectedUser) return;
        
        setIsSuspending(true);
        try {
            const isCurrentlySuspended = selectedUser.status === 'Suspenso';
            const newAtivoValue = isCurrentlySuspended; // Se suspenso, reativar (ativo=true). Se ativo, suspender (ativo=false).
            
            const { error } = await supabase
                .from('profiles')
                .update({ 
                    ativo: newAtivoValue,
                    updated_at: new Date().toISOString()
                })
                .eq('id', selectedUser.id);

            if (error) throw error;

            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            setIsSuspendOpen(false);
            
            toast({
                title: isCurrentlySuspended ? "Conta reativada" : "Conta suspensa",
                description: isCurrentlySuspended 
                    ? `${selectedUser.name} teve o acesso restaurado.`
                    : `${selectedUser.name} teve o acesso bloqueado.`,
                className: isCurrentlySuspended ? "bg-emerald-500 text-white" : undefined,
            });
        } catch (error) {
            console.error('Erro ao suspender/reativar:', error);
            toast({
                title: "Erro",
                description: "Não foi possível alterar o status da conta.",
                variant: "destructive",
            });
        } finally {
            setIsSuspending(false);
        }
    };

    const [isDeleting, setIsDeleting] = useState(false);

    const handleDeleteUser = async () => {
        if (!selectedUser) return;
        
        setIsDeleting(true);
        try {
            const { data, error } = await supabase.functions.invoke("admin-delete-user", {
                body: { userId: selectedUser.id }
            });

            if (error) {
                throw new Error(error.message);
            }

            if (!data?.success) {
                throw new Error(data?.error || "Erro ao excluir usuário");
            }

            toast({
                title: "Usuário excluído",
                description: `${selectedUser.name} foi removido permanentemente do sistema.`,
            });
            
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        } catch (err: any) {
            console.error("Delete error:", err);
            toast({
                title: "Erro ao excluir",
                description: err.message || "Não foi possível excluir o usuário.",
                variant: "destructive"
            });
        } finally {
            setIsDeleting(false);
            setIsDeleteAlertOpen(false);
            setSelectedUser(null);
        }
    };

    const handleExportCSV = async () => {
        try {
            setIsExporting(true);

            // Simular um pequeno delay para feedback visual (opcional, só para parecer que está processando)
            await new Promise(resolve => setTimeout(resolve, 800));

            const dataToExport = filteredUsers;

            if (dataToExport.length === 0) {
                toast({
                    title: "Erro na exportação",
                    description: "Nenhum usuário para exportar com os filtros atuais.",
                    variant: "destructive"
                });
                return;
            }

            // Gerar CSV
            const csvContent = convertToCSV(dataToExport);

            // Nome do arquivo com data atual
            const today = new Date().toISOString().split('T')[0];
            const filename = `usuarios_poupeagora_${today}.csv`;

            // Download
            downloadCSV(csvContent, filename);

            // Contar filtros ativos para o feedback
            let activeFiltersCount = 0;
            if (searchQuery) activeFiltersCount++;
            if (statusFilter !== 'all') activeFiltersCount++;
            if (planFilter !== 'all') activeFiltersCount++;
            if (typeFilter !== 'all') activeFiltersCount++;
            if (dateFilter !== 'all') activeFiltersCount++;

            // Feedback
            toast({
                title: "Sucesso!",
                description: `${dataToExport.length} usuário(s) exportado(s). ${activeFiltersCount > 0 ? `(Filtros aplicados: ${activeFiltersCount})` : ''}`,
                className: "bg-green-600 text-white border-none"
            });

        } catch (error) {
            console.error('Erro ao exportar CSV:', error);
            toast({
                title: "Erro ao exportar",
                description: "Ocorreu um erro ao gerar o arquivo CSV. Tente novamente.",
                variant: "destructive"
            });
        } finally {
            setIsExporting(false);
        }
    };

    const getStatusBadge = (status: UserStatus) => {
        switch (status) {
            case 'Ativo': return <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20">🟢 Ativo</Badge>;
            case 'Trial': return <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/20">🟡 Trial</Badge>;
            case 'Inativo': return <Badge className="bg-slate-500/10 text-slate-500 hover:bg-slate-500/20 border-slate-500/20">🔴 Inativo</Badge>;
            case 'Suspenso': return <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20">⚫ Suspenso</Badge>;
        }
    };

    return (
        <div className="space-y-8 animate-fade-in bg-slate-50 dark:bg-slate-950 min-h-screen">

            {/* 1. HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Usuários</h1>
                        <p className="text-slate-500 dark:text-slate-400">Gestão completa de usuários do Poupe Agora</p>
                    </div>

                    {/* Badge de Filtros Ativos */}
                    {activeFiltersCount > 0 && (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Badge variant="secondary" className="cursor-pointer hover:bg-slate-200 transition-colors">
                                    {activeFiltersCount} filtro{activeFiltersCount > 1 ? 's' : ''} ativo{activeFiltersCount > 1 ? 's' : ''}
                                </Badge>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-3" align="start">
                                <div className="space-y-2">
                                    <p className="font-semibold text-xs uppercase tracking-wider text-slate-500 mb-2">Filtros Ativos:</p>
                                    {searchQuery && <div className="text-sm flex items-center gap-2"><Search className="w-3 h-3" /> Busca: <span className="font-medium">"{searchQuery}"</span></div>}
                                    {statusFilter !== "all" && <div className="text-sm flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-primary" /> Status: <span className="font-medium">{statusFilter}</span></div>}
                                    {planFilter !== "all" && <div className="text-sm flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-primary" /> Plano: <span className="font-medium">{planFilter}</span></div>}
                                    {typeFilter !== "all" && <div className="text-sm flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-primary" /> Tipo: <span className="font-medium">{typeFilter}</span></div>}
                                    {dateFilter !== "all" && <div className="text-sm flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-primary" /> Data: <span className="font-medium">{dateFilter}</span></div>}
                                    <Button size="sm" variant="ghost" onClick={clearAllFilters} className="w-full mt-2 h-8 text-red-500 hover:text-red-600 hover:bg-red-50">
                                        Limpar Tudo
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                    )}
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={handleExportCSV}
                        disabled={filteredUsers.length === 0 || isExporting}
                    >
                        {isExporting ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Exportando...
                            </>
                        ) : (
                            <>
                                <Download className="h-4 w-4" />
                                Exportar CSV
                            </>
                        )}
                    </Button>
                    <Button className="gap-2 bg-primary hover:bg-primary/90" onClick={() => setIsNewUserOpen(true)}>
                        <Plus className="h-4 w-4" />
                        Novo Usuário
                    </Button>
                </div>
            </div>

            {/* 2. METRICS CARDS DINÂMICOS */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="backdrop-blur-sm bg-white/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:scale-105 transition-all duration-300">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="h-4 w-4 text-primary" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.total}</div>
                        <p className="text-xs text-slate-500 mt-1">Exibindo conforme filtros</p>
                    </CardContent>
                </Card>

                <Card className="backdrop-blur-sm bg-white/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:scale-105 transition-all duration-300">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.active}</div>
                    </CardContent>
                </Card>

                <Card className="backdrop-blur-sm bg-white/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:scale-105 transition-all duration-300">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Em Trial</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                            <Clock className="h-4 w-4 text-amber-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.trial}</div>
                    </CardContent>
                </Card>

                <Card className="backdrop-blur-sm bg-white/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:scale-105 transition-all duration-300">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Inativos</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-red-500/10 flex items-center justify-center">
                            <XCircle className="h-4 w-4 text-red-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.inactive}</div>
                    </CardContent>
                </Card>
            </div>

            {/* 3. SEARCH & FILTERS */}
            <Card className="backdrop-blur-sm bg-white/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
                <CardContent className="p-4 flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                        <Input
                            placeholder="Buscar por nome, e-mail ou telefone..."
                            className="pl-9 bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:bg-white transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[140px] bg-white/50 dark:bg-slate-800/50">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Status: Todos</SelectItem>
                                <SelectItem value="Ativo">Ativos</SelectItem>
                                <SelectItem value="Trial">Trial</SelectItem>
                                <SelectItem value="Inativo">Inativos</SelectItem>
                                <SelectItem value="Suspenso">Suspensos</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={planFilter} onValueChange={setPlanFilter}>
                            <SelectTrigger className="w-[140px] bg-white/50 dark:bg-slate-800/50">
                                <SelectValue placeholder="Plano" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Plano: Todos</SelectItem>
                                <SelectItem value="Gratuito">Gratuito</SelectItem>
                                <SelectItem value="Básico">Básico</SelectItem>
                                <SelectItem value="Premium">Premium</SelectItem>
                                <SelectItem value="Elite">Elite</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="w-[140px] bg-white/50 dark:bg-slate-800/50">
                                <SelectValue placeholder="Tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tipo: Todos</SelectItem>
                                <SelectItem value="Usuário">Usuário</SelectItem>
                                <SelectItem value="Admin">Admin</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={dateFilter} onValueChange={setDateFilter}>
                            <SelectTrigger className="w-[140px] bg-white/50 dark:bg-slate-800/50">
                                <SelectValue placeholder="Data" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Data: Todas</SelectItem>
                                <SelectItem value="today">Hoje</SelectItem>
                                <SelectItem value="7days">Últimos 7 dias</SelectItem>
                                <SelectItem value="30days">Últimos 30 dias</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* 4. TABLE */}
            <div ref={tableRef} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead>Usuário</TableHead>
                                <TableHead>Telefone</TableHead>
                                <TableHead>Plano</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Cadastro</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {/* LOADING STATE */}
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-64">
                                        <div className="flex flex-col items-center justify-center py-8">
                                            <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                                            <p className="text-slate-500 font-medium">Carregando usuários...</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredUsers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-64 text-center">
                                        <div className="flex flex-col items-center justify-center py-8">
                                            <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                                <Search className="w-8 h-8 text-slate-400" />
                                            </div>
                                            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                                                Nenhum usuário encontrado
                                            </h3>
                                            <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-sm">
                                                Não encontramos nenhum registro com os filtros atuais. Tente buscar por outros termos ou limpar os filtros.
                                            </p>
                                            <Button variant="outline" onClick={clearAllFilters}>
                                                Limpar Filtros
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedUsers.map((user) => (
                                    <TableRow key={user.id} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9 border border-primary/20 bg-primary/10">
                                                    <AvatarImage src={user.avatarUrl} />
                                                    <AvatarFallback className="text-primary font-medium">
                                                        {user.name.substring(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="font-medium">{user.name}</div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400">{user.email}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono text-sm">{user.phone}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="border-slate-300 dark:border-slate-700 font-normal">
                                                {user.plan}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{getStatusBadge(user.status)}</TableCell>
                                        <TableCell className="text-slate-500 dark:text-slate-400">
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            {user.type === 'Admin' && (
                                                <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-none">
                                                    <Shield className="w-3 h-3 mr-1" />
                                                    Admin
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-[180px]">
                                                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => { setSelectedUser(user); setIsDetailsOpen(true); }}>
                                                        <Eye className="mr-2 h-4 w-4" /> Ver Detalhes
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => { setSelectedUser(user); setIsEditOpen(true); }}>
                                                        <Edit className="mr-2 h-4 w-4" /> Editar Info
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => { setSelectedUser(user); setIsWhatsappOpen(true); }}>
                                                        <Smartphone className="mr-2 h-4 w-4" /> Trocar WhatsApp
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => { setSelectedUser(user); setIsChangePlanOpen(true); setSelectedPlanId(''); }}>
                                                        <CreditCard className="mr-2 h-4 w-4" /> Alterar Plano
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => { setSelectedUser(user); setIsTrialOpen(true); }}>
                                                        <Gift className="mr-2 h-4 w-4" /> Liberar Trial
                                                    </DropdownMenuItem>
                                                    {user.status === 'Suspenso' ? (
                                                        <DropdownMenuItem 
                                                            className="text-emerald-600"
                                                            onClick={() => { setSelectedUser(user); setIsSuspendOpen(true); }}
                                                        >
                                                            <Play className="mr-2 h-4 w-4" /> Reativar Conta
                                                        </DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem 
                                                            className="text-amber-600"
                                                            onClick={() => { setSelectedUser(user); setIsSuspendOpen(true); }}
                                                        >
                                                            <Pause className="mr-2 h-4 w-4" /> Suspender
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => { setSelectedUser(user); setIsDeleteAlertOpen(true); }}>
                                                        <Trash2 className="mr-2 h-4 w-4" /> Excluir Conta
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* PAGINATION */}
                {filteredUsers.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-slate-200 dark:border-slate-800 gap-4">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Mostrando {filteredUsers.length > 0 ? startIndexDisplay : 0} a {endIndexDisplay} de {filteredUsers.length} usuários
                        </p>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                Anterior
                            </Button>

                            <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-500 dark:text-slate-400 hidden sm:inline">Página</span>
                                <Select
                                    value={currentPage.toString()}
                                    onValueChange={(value) => handlePageChange(Number(value))}
                                >
                                    <SelectTrigger className="w-16 h-8 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                            <SelectItem key={page} value={page.toString()}>
                                                {page}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <span className="text-sm text-slate-500 dark:text-slate-400 hidden sm:inline">de {totalPages}</span>
                            </div>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages || totalPages === 0}
                            >
                                Próxima
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* --- MODAIS (Mantidos iguais) --- */}

            {/* Modal Novo Usuário - Usando componente real */}
            <UserFormModal 
                open={isNewUserOpen} 
                onOpenChange={setIsNewUserOpen}
                onSave={() => {}}
                onUserCreated={handleUserCreated}
            />

            {/* Modal Trocar WhatsApp */}
            <Dialog open={isWhatsappOpen} onOpenChange={(open) => { setIsWhatsappOpen(open); if (!open) setNewWhatsapp(''); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Trocar WhatsApp</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <Card className="bg-slate-50 dark:bg-slate-900 border-none shadow-inner">
                            <CardContent className="p-4 space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-sm text-slate-500">Usuário</span>
                                    <span className="font-medium">{selectedUser?.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-slate-500">WhatsApp Atual</span>
                                    <span className="font-mono">{selectedUser?.phone || 'Não informado'}</span>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="space-y-2">
                            <Label>Novo Número WhatsApp *</Label>
                            <Input 
                                placeholder="5511999998888" 
                                value={newWhatsapp}
                                onChange={(e) => setNewWhatsapp(e.target.value.replace(/\D/g, ''))}
                            />
                            <p className="text-xs text-muted-foreground">Número com código do país, sem espaços ou símbolos</p>
                        </div>

                        <div className="bg-amber-500/10 p-3 rounded-md flex gap-2 border border-amber-500/20">
                            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                            <p className="text-sm text-amber-600 dark:text-amber-500">
                                O número será atualizado imediatamente no sistema.
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsWhatsappOpen(false)} disabled={isWhatsappSaving}>Cancelar</Button>
                        <Button onClick={handleChangeWhatsapp} disabled={isWhatsappSaving || !newWhatsapp.trim()}>
                            {isWhatsappSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                            Confirmar Troca
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 7. MODAL LIBERAR TRIAL */}
            <Dialog open={isTrialOpen} onOpenChange={(open) => { setIsTrialOpen(open); if (!open) { setTrialDuration('7'); setTrialPlan('Premium'); } }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Liberar Trial Premium</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="text-sm text-slate-600 dark:text-slate-300">
                            Liberando acesso temporário para <strong>{selectedUser?.name}</strong> ({selectedUser?.email}).
                        </div>

                        <div className="grid gap-2">
                            <Label>Duração do Trial *</Label>
                            <Select value={trialDuration} onValueChange={setTrialDuration}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="3">3 dias</SelectItem>
                                    <SelectItem value="7">7 dias</SelectItem>
                                    <SelectItem value="14">14 dias</SelectItem>
                                    <SelectItem value="30">30 dias</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label>Plano durante o Trial</Label>
                            <Select value={trialPlan} onValueChange={setTrialPlan}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Básico">Básico</SelectItem>
                                    <SelectItem value="Premium">Premium</SelectItem>
                                    <SelectItem value="Elite">Elite</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center space-x-2 mt-2">
                            <Checkbox id="notifyTrial" defaultChecked />
                            <label htmlFor="notifyTrial" className="text-sm font-medium leading-none">
                                Notificar usuário por email e WhatsApp
                            </label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsTrialOpen(false)} disabled={isTrialSaving}>Cancelar</Button>
                        <Button onClick={handleReleaseTrial} className="bg-primary hover:bg-primary/90" disabled={isTrialSaving}>
                            {isTrialSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Gift className="mr-2 h-4 w-4" />}
                            Liberar Trial
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 8. MODAL EDITAR */}
            <Dialog open={isEditOpen} onOpenChange={(open) => {
                setIsEditOpen(open);
                if (open && selectedUser) {
                    setEditFormData({
                        name: selectedUser.name,
                        email: selectedUser.email,
                        phone: selectedUser.phone,
                        plan: selectedUser.plan,
                        status: selectedUser.status,
                        isAdmin: selectedUser.type === 'Admin'
                    });
                }
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Informações</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleUpdateUser} className="space-y-4 py-2">
                        <div className="grid gap-2">
                            <Label>Nome Completo</Label>
                            <Input 
                                value={editFormData.name} 
                                onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Email</Label>
                            <Input 
                                value={editFormData.email}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>WhatsApp</Label>
                            <Input 
                                value={editFormData.phone}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, phone: e.target.value }))}
                                placeholder="5511999998888"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Plano</Label>
                                <Select value={editFormData.plan} onValueChange={(v) => setEditFormData(prev => ({ ...prev, plan: v as UserPlan }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Gratuito">Gratuito</SelectItem>
                                        <SelectItem value="Básico">Básico</SelectItem>
                                        <SelectItem value="Premium">Premium</SelectItem>
                                        <SelectItem value="Elite">Elite</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Status</Label>
                                <Select value={editFormData.status} onValueChange={(v) => setEditFormData(prev => ({ ...prev, status: v as UserStatus }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Ativo">Ativo</SelectItem>
                                        <SelectItem value="Trial">Trial</SelectItem>
                                        <SelectItem value="Inativo">Inativo</SelectItem>
                                        <SelectItem value="Suspenso">Suspenso</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2 pt-2">
                            <Checkbox 
                                id="isAdminEdit" 
                                checked={editFormData.isAdmin}
                                onCheckedChange={(checked) => setEditFormData(prev => ({ ...prev, isAdmin: !!checked }))}
                            />
                            <label htmlFor="isAdminEdit" className="text-sm font-medium leading-none">
                                Usuário administrador
                            </label>
                        </div>
                        <DialogFooter className="mt-4">
                            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} disabled={isEditSaving}>Cancelar</Button>
                            <Button type="submit" disabled={isEditSaving}>
                                {isEditSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Salvar Alterações
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* 9. MODAL DETALHES */}
            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent className="max-w-[700px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                                <AvatarFallback>{selectedUser?.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            Detalhes do Usuário: {selectedUser?.name}
                        </DialogTitle>
                    </DialogHeader>

                    <Tabs defaultValue="geral" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="geral">Informações Gerais</TabsTrigger>
                            <TabsTrigger value="integracoes">Integrações</TabsTrigger>
                            <TabsTrigger value="historico">Histórico</TabsTrigger>
                        </TabsList>

                        <TabsContent value="geral" className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <Label className="text-slate-500 text-xs uppercase tracking-wider">ID do Usuário</Label>
                                    <div className="font-mono text-sm">{selectedUser?.id}</div>
                                </div>
                                <div>
                                    <Label className="text-slate-500 text-xs uppercase tracking-wider">Data Cadastro</Label>
                                    <div>{selectedUser && new Date(selectedUser.createdAt).toLocaleString()}</div>
                                </div>
                                <div>
                                    <Label className="text-slate-500 text-xs uppercase tracking-wider">Email</Label>
                                    <div>{selectedUser?.email}</div>
                                </div>
                                <div>
                                    <Label className="text-slate-500 text-xs uppercase tracking-wider">Whatsapp</Label>
                                    <div>{selectedUser?.phone}</div>
                                </div>
                                <div>
                                    <Label className="text-slate-500 text-xs uppercase tracking-wider">Plano Atual</Label>
                                    <div className="font-medium">{selectedUser?.plan}</div>
                                </div>
                                <div>
                                    <Label className="text-slate-500 text-xs uppercase tracking-wider">Status</Label>
                                    <div className="font-medium">{selectedUser?.status}</div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="integracoes" className="space-y-4 py-4">
                            <Card className="border-slate-200 dark:border-slate-800">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-base font-medium">Google Agenda</CardTitle>
                                                <DialogDescription className="text-xs">
                                                    Status da integração do usuário com o Google Agenda
                                                </DialogDescription>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
                                            <CheckCircle className="w-3 h-3 mr-1" />
                                            Conectado
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <Label className="text-slate-500 text-xs uppercase">Email Conectado</Label>
                                            <div className="font-medium text-slate-900 dark:text-slate-100 mt-1">
                                                usuario@gmail.com
                                            </div>
                                        </div>
                                        <div>
                                            <Label className="text-slate-500 text-xs uppercase">Conectado em</Label>
                                            <div className="font-medium text-slate-900 dark:text-slate-100 mt-1">
                                                12/03/2025 às 14:30
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-xs h-8"
                                            onClick={() => toast({ title: "Teste enviado!", description: "Lembrete de teste enviado para o WhatsApp do usuário.", className: "bg-emerald-500 text-white" })}
                                        >
                                            <RefreshCw className="w-3 h-3 mr-2" />
                                            Reenviar Teste
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-xs h-8 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                            onClick={() => toast({ title: "Desconectado", description: "A integração foi desconectada forçadamente.", variant: "destructive" })}
                                        >
                                            <PowerOff className="w-3 h-3 mr-2" />
                                            Forçar Desconexão
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-slate-200 dark:border-slate-800 opacity-60">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                                <Smartphone className="h-5 w-5 text-slate-500" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-base font-medium">Outras Integrações</CardTitle>
                                                <DialogDescription className="text-xs">
                                                    Em breve novas integrações disponíveis
                                                </DialogDescription>
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                            </Card>
                        </TabsContent>

                        <TabsContent value="historico" className="py-4">
                            <div className="space-y-4">
                                <div className="flex gap-3">
                                    <div className="min-w-[120px] text-sm text-slate-500">{selectedUser && new Date(selectedUser.lastActivity || '').toLocaleDateString()}</div>
                                    <div className="flex-1 text-sm border-l-2 border-slate-200 ml-2 pl-4 pb-2">
                                        <p className="font-medium">Última Atividade</p>
                                        <p className="text-slate-500">Acesso via aplicativo mobile</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="min-w-[120px] text-sm text-slate-500">{selectedUser && new Date(selectedUser.createdAt).toLocaleDateString()}</div>
                                    <div className="flex-1 text-sm border-l-2 border-emerald-200 ml-2 pl-4 pb-2">
                                        <p className="font-medium">Cadastro Realizado</p>
                                        <p className="text-slate-500">Novo usuário registrado no sistema</p>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="stats" className="py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <Card>
                                    <CardHeader className="pb-2"><CardTitle className="text-sm">Transações</CardTitle></CardHeader>
                                    <CardContent><div className="text-2xl font-bold">{selectedUser?.transactionsCount || 0}</div></CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-2"><CardTitle className="text-sm">Consultas IA</CardTitle></CardHeader>
                                    <CardContent><div className="text-2xl font-bold">{selectedUser?.assistantQueries || 0}</div></CardContent>
                                </Card>
                            </div>
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>

            {/* MODAL ALTERAR PLANO */}
            <Dialog open={isChangePlanOpen} onOpenChange={setIsChangePlanOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Alterar Plano de Acesso</DialogTitle>
                        <DialogDescription>
                            Selecione o novo plano para <strong>{selectedUser?.name}</strong>. A alteração será refletida imediatamente.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label>Plano Atual</Label>
                            <Input value={selectedUser?.plan} disabled className="bg-slate-100 dark:bg-slate-800" />
                        </div>
                        <div className="space-y-2">
                            <Label>Novo Plano</Label>
                            <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione um plano..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {availablePlans.map((plan: any) => (
                                        <SelectItem key={plan.id} value={plan.id + '|' + plan.name}>
                                            {plan.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-slate-500">Selecione um dos planos ativos no sistema.</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsChangePlanOpen(false)}>Cancelar</Button>
                        <Button
                            onClick={() => {
                                const [id, name] = selectedPlanId.split('|');
                                if (selectedUser && name) {
                                    changePlanMutation.mutate({
                                        userId: selectedUser.id,
                                        planName: name
                                    });
                                } else {
                                    toast({ title: "Selecione um plano", variant: "destructive" });
                                }
                            }}
                            disabled={changePlanMutation.isPending}
                        >
                            {changePlanMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar Alteração
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 10. ALERT EXCLUIR CONTA */}
            <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <div className="flex items-center gap-2 text-red-600 mb-2">
                            <AlertTriangle className="h-6 w-6" />
                            <AlertDialogTitle>Excluir Conta de Usuário</AlertDialogTitle>
                        </div>
                        <AlertDialogDescription>
                            Tem certeza que deseja excluir <strong>{selectedUser?.name}</strong>? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-md border border-red-200 dark:border-red-900 mt-2">
                            <p className="text-sm text-red-700 dark:text-red-400 font-medium">
                                ⚠️ Todos os dados financeiros, transações e lembretes serão permanentemente excluídos.
                            </p>
                        </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleDeleteUser} 
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Excluindo...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Excluir Permanentemente
                                </>
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* 11. ALERT SUSPENDER/REATIVAR CONTA */}
            <AlertDialog open={isSuspendOpen} onOpenChange={setIsSuspendOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <div className={`flex items-center gap-2 mb-2 ${selectedUser?.status === 'Suspenso' ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {selectedUser?.status === 'Suspenso' ? (
                                <Play className="h-6 w-6" />
                            ) : (
                                <Pause className="h-6 w-6" />
                            )}
                            <AlertDialogTitle>
                                {selectedUser?.status === 'Suspenso' ? 'Reativar Conta' : 'Suspender Conta'}
                            </AlertDialogTitle>
                        </div>
                        <AlertDialogDescription>
                            {selectedUser?.status === 'Suspenso' 
                                ? <>Deseja reativar o acesso de <strong>{selectedUser?.name}</strong>? O usuário poderá acessar o sistema novamente.</>
                                : <>Deseja suspender a conta de <strong>{selectedUser?.name}</strong>? O usuário não conseguirá fazer login enquanto a conta estiver suspensa.</>
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSuspending}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleSuspendUser} 
                            className={selectedUser?.status === 'Suspenso' 
                                ? "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-600" 
                                : "bg-amber-600 hover:bg-amber-700 focus:ring-amber-600"
                            }
                            disabled={isSuspending}
                        >
                            {isSuspending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {selectedUser?.status === 'Suspenso' ? 'Reativando...' : 'Suspendendo...'}
                                </>
                            ) : (
                                <>
                                    {selectedUser?.status === 'Suspenso' ? (
                                        <><Play className="mr-2 h-4 w-4" /> Reativar</>
                                    ) : (
                                        <><Pause className="mr-2 h-4 w-4" /> Suspender</>
                                    )}
                                </>
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </div>
    );
}
