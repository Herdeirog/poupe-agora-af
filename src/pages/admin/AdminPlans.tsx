import { useState } from "react";
import { useFormatCurrency } from "@/hooks/useFormatCurrency";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Check, Loader2, MoreVertical, Edit, Trash2, Shield, ShieldAlert } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Plan {
    id: string;
    name: string;
    description: string | null;
    price: number;
    period: string;
    features: string[]; // JSONB stored as array
    active: boolean;
    popular: boolean;
    created_at?: string;
}

export default function AdminPlans() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { formatCurrency } = useFormatCurrency();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

    // States do formulário
    const [formData, setFormData] = useState<Partial<Plan>>({
        name: "",
        price: 0,
        period: "/mês",
        description: "",
        features: [],
        popular: false,
        active: true
    });
    const [featuresInput, setFeaturesInput] = useState("");


    // 1. Fetch Planos
    const { data: plans, isLoading } = useQuery({
        queryKey: ['admin-plans'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('plans')
                .select('*')
                .order('price', { ascending: true });

            if (error) {
                console.error("Erro ao buscar planos:", error);
                throw error;
            }
            return data as Plan[];
        },
        // Garantir que não quebre a tela se falhar
        retry: 1
    });

    // 2. Mutations
    const saveMutation = useMutation({
        mutationFn: async (plan: Partial<Plan>) => {
            // Garantir features array
            const payload = {
                ...plan,
                features: typeof plan.features === 'string'
                    ? (plan.features as string).split('\n').filter(Boolean) // Fallback se vier errado
                    : plan.features
            };

            if (editingPlan?.id) {
                const { error } = await supabase.from('plans').update(payload).eq('id', editingPlan.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('plans').insert(payload);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
            toast({ title: "Sucesso", description: "Plano salvo com sucesso." });
            handleCloseDialog();
        },
        onError: (error) => {
            console.error(error);
            toast({ title: "Erro", description: "Falha ao salvar plano.", variant: "destructive" });
        }
    });

    const toggleStatusMutation = useMutation({
        mutationFn: async ({ id, active }: { id: string, active: boolean }) => {
            const { error } = await supabase.from('plans').update({ active }).eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
            toast({ title: "Status atualizado", description: "A visibilidade do plano foi alterada." });
        }
    });

    // Handlers
    const handleOpenNew = () => {
        setEditingPlan(null);
        setFormData({ name: "", price: 0, period: "/mês", description: "", features: [], popular: false, active: true });
        setFeaturesInput("");
        setIsDialogOpen(true);
    };

    const handleOpenEdit = (plan: Plan) => {
        setEditingPlan(plan);
        setFormData(plan);
        setFeaturesInput(Array.isArray(plan.features) ? plan.features.join('\n') : '');
        setIsDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setEditingPlan(null);
    };

    const handleSave = () => {
        if (!formData.name || formData.price === undefined) {
            toast({ title: "Erro", description: "Preencha nome e preço.", variant: "destructive" });
            return;
        }

        // Processar features do textarea
        const processedFeatures = featuresInput.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        saveMutation.mutate({
            ...formData,
            features: processedFeatures
        });
    };

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-end items-center mb-6">
                <Button onClick={handleOpenNew} className="shadow-lg hover:shadow-xl transition-all">
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Plano
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {plans?.map((plan) => (
                    <Card key={plan.id} className={`flex flex-col relative transition-all duration-300 hover:border-primary/50 ${!plan.active ? 'opacity-75 grayscale-[0.5] border-dashed' : ''} ${plan.popular ? 'border-amber-500/50 shadow-md shadow-amber-500/10' : ''}`}>
                        {plan.popular && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-0">Mais Popular</Badge>
                            </div>
                        )}

                        <CardHeader>
                            <div className="flex justify-between items-start mb-2">
                                <Badge variant={plan.active ? 'default' : 'secondary'} className={plan.active ? 'bg-emerald-500 hover:bg-emerald-600' : ''}>
                                    {plan.active ? 'Ativo na Vitrine' : 'Oculto'}
                                </Badge>
                                <Switch
                                    checked={plan.active}
                                    onCheckedChange={(checked) => toggleStatusMutation.mutate({ id: plan.id, active: checked })}
                                />
                            </div>
                            <CardTitle className="text-xl flex justify-between items-center">
                                {plan.name}
                            </CardTitle>
                            <CardDescription className="line-clamp-2 min-h-[40px]">{plan.description || "Sem descrição definida"}</CardDescription>
                        </CardHeader>

                        <CardContent className="flex-1 space-y-4">
                            <div className="text-2xl font-bold">
                                {formatCurrency(plan.price)}
                                <span className="text-sm font-normal text-muted-foreground ml-1">{plan.period}</span>
                            </div>

                            <div className="space-y-2">
                                <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Recursos:</p>
                                <ul className="text-sm space-y-1">
                                    {plan.features?.slice(0, 4).map((f, i) => (
                                        <li key={i} className="flex items-start gap-2 text-muted-foreground">
                                            <Check className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                                            <span className="line-clamp-1">{f}</span>
                                        </li>
                                    ))}
                                    {(plan.features?.length || 0) > 4 && (
                                        <li className="text-xs text-muted-foreground pl-5">+ {plan.features.length - 4} outros recursos...</li>
                                    )}
                                </ul>
                            </div>
                        </CardContent>

                        <CardFooter className="pt-4 border-t bg-muted/20 flex gap-2">
                            <Button variant="outline" className="flex-1" onClick={() => handleOpenEdit(plan)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
                {(!plans || plans.length === 0) && (
                    <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                        Nenhum plano cadastrado. Clique em "Novo Plano" para começar.
                    </div>
                )}
            </div>

            {/* MODAL DE CRIAÇÃO/EDIÇÃO */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingPlan ? `Editar Plano: ${editingPlan.name}` : 'Criar Novo Plano'}</DialogTitle>
                        <DialogDescription>
                            Defina as informações do plano que aparecerão na página de vendas.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Nome do Plano</Label>
                                <Input
                                    placeholder="Ex: Start"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Preço</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={formData.price}
                                    onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Período</Label>
                                <Input
                                    placeholder="/mês, /ano"
                                    value={formData.period}
                                    onChange={e => setFormData({ ...formData, period: e.target.value })}
                                />
                            </div>
                            <div className="flex items-end pb-2">
                                <label className="flex items-center gap-2 cursor-pointer border p-2 rounded-md w-full bg-muted/10 hover:bg-muted/20">
                                    <Switch
                                        checked={formData.popular}
                                        onCheckedChange={c => setFormData({ ...formData, popular: c })}
                                    />
                                    <span className="text-sm font-medium">Destacar como Popular?</span>
                                </label>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Descrição Curta</Label>
                            <Input
                                placeholder="Uma frase de efeito..."
                                value={formData.description || ''}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Lista de Recursos (um por linha)</Label>
                            <Textarea
                                className="min-h-[120px] font-mono text-sm"
                                placeholder="- Acesso total&#10;- Suporte VIP&#10;- Sem anúncios"
                                value={featuresInput}
                                onChange={e => setFeaturesInput(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">Cada linha será um item com <Check className="inline h-3 w-3" /> na vitrine.</p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={saveMutation.isPending}>
                            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar Alterações
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
