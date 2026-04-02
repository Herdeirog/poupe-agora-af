import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminPlans from "./AdminPlans";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Search, Filter, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function AdminFinance() {
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Financeiro</h1>
                    <p className="text-slate-500 dark:text-slate-400">Gerencie planos, assinaturas e histórico de pagamentos.</p>
                </div>
            </div>

            <Tabs defaultValue="plans" className="w-full">
                <TabsList className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200 dark:border-slate-800 p-1 mb-8">
                    <TabsTrigger value="plans" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-white">Gestão de Planos</TabsTrigger>
                    <TabsTrigger value="payments" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-white">Histórico de Pagamentos</TabsTrigger>
                </TabsList>

                <TabsContent value="plans" className="space-y-4">
                    {/* Reutilizando componente existente */}
                    <AdminPlans />
                </TabsContent>

                <TabsContent value="payments">
                    {/* Conteúdo da Aba Pagamentos */}
                    <AdminPaymentsTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}

// Sub-componente para a aba de Pagamentos
function AdminPaymentsTab() {
    const [search, setSearch] = useState("");

    const payments: any[] = [];

    return (
        <div className="space-y-6">
            <Card className="border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                <CardHeader>
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <div>
                            <CardTitle>Histórico de Transações</CardTitle>
                            <CardDescription>Visualize todas as transações financeiras realizadas.</CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" className="gap-2">
                                <Filter className="h-4 w-4" /> Filtros
                            </Button>
                            <Button variant="outline" className="gap-2">
                                <Download className="h-4 w-4" /> Exportar
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Search Bar */}
                    <div className="mb-6 relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                        <Input
                            placeholder="Buscar transação por ID ou cliente..."
                            className="pl-10 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="text-center py-12">
                        <p className="text-muted-foreground">Histórico de pagamentos será implementado com integração de gateway de pagamento</p>
                        <p className="text-sm text-muted-foreground mt-2">Aguardando integração com Stripe/Mercado Pago</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
