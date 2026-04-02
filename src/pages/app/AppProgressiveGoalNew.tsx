import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useFormatCurrency } from "@/hooks/useFormatCurrency";
import { ArrowLeft, Target, TrendingUp, Calendar, Sparkles, PiggyBank, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { useProgressiveGoals } from "@/hooks/useProgressiveGoals";
import { cn } from "@/lib/utils";
import { PROGRESSIVE_GOAL_LIMITS } from "@/types/progressiveGoal";

const QUICK_WEEKS = [4, 12, 26, 40, 52] as const;

const AppProgressiveGoalNew = () => {
  const navigate = useNavigate();
  const { createGoal } = useProgressiveGoals();
  const { formatCurrency, symbol } = useFormatCurrency();
  const [goalName, setGoalName] = useState("");
  const [initialValueStr, setInitialValueStr] = useState("20");
  const [selectedWeeks, setSelectedWeeks] = useState<number>(PROGRESSIVE_GOAL_LIMITS.DEFAULT_WEEKS);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper para garantir que o valor de semanas está no range válido
  const clampWeeks = (value: number) => 
    Math.min(PROGRESSIVE_GOAL_LIMITS.MAX_WEEKS, Math.max(PROGRESSIVE_GOAL_LIMITS.MIN_WEEKS, value));

  // Converte para número apenas quando necessário
  const initialValue = Math.max(1, Number(initialValueStr) || 1);

  const calculations = useMemo(() => {
    const weeks = selectedWeeks;
    const lastWeekValue = initialValue * weeks;
    const totalEstimated = (initialValue * (weeks * (weeks + 1))) / 2;
    return {
      lastWeekValue,
      totalEstimated,
      weeks,
    };
  }, [initialValue, selectedWeeks]);

  // formatCurrency agora vem do hook useFormatCurrency

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!goalName.trim()) {
      toast.error("Por favor, insira o nome da meta");
      return;
    }

    if (initialValue < PROGRESSIVE_GOAL_LIMITS.MIN_INITIAL_VALUE) {
      toast.error(`O valor inicial deve ser pelo menos ${symbol} ${PROGRESSIVE_GOAL_LIMITS.MIN_INITIAL_VALUE}`);
      return;
    }

    // Validação de range de semanas
    if (selectedWeeks < PROGRESSIVE_GOAL_LIMITS.MIN_WEEKS || selectedWeeks > PROGRESSIVE_GOAL_LIMITS.MAX_WEEKS) {
      toast.error(`A duração deve estar entre ${PROGRESSIVE_GOAL_LIMITS.MIN_WEEKS} e ${PROGRESSIVE_GOAL_LIMITS.MAX_WEEKS} semanas`);
      return;
    }

    setIsSubmitting(true);
    
    try {
      const goal = await createGoal(goalName.trim(), initialValue, selectedWeeks);
      
      if (goal) {
        toast.success("Meta progressiva criada com sucesso!");
        navigate(`/app/goals/progressive/${goal.id}`);
      } else {
        toast.error("Erro ao criar meta. Tente novamente.");
      }
    } catch (error) {
      console.error("Error creating goal:", error);
      toast.error("Erro ao criar meta. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in overflow-x-hidden">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/app/goals">Metas</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Nova Meta Progressiva</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-start gap-3 sm:gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/app/goals")}
          className="shrink-0 mt-1"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Criar Meta Progressiva</h1>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Poupe semanalmente com valores que aumentam de forma automática.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card Principal */}
        <Card className="glass-strong border-border/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <CardTitle>Configurar Meta</CardTitle>
            </div>
            <CardDescription>
              Defina o nome e o valor inicial para começar sua jornada de poupança progressiva.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Nome da Meta */}
            <div className="space-y-2">
              <Label htmlFor="goalName" className="text-foreground">
                Nome da Meta
              </Label>
              <Input
                id="goalName"
                placeholder="Ex: Viagem, Reserva de Emergência"
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
                className="bg-background/50 border-border focus:border-primary"
                disabled={isSubmitting}
              />
            </div>

            {/* Valor Inicial Semanal */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="initialValue" className="text-foreground">
                  Valor inicial semanal
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Este é o valor que você poupará na primeira semana. 
                      A cada semana, o valor aumenta progressivamente.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                  {symbol}
                </span>
                <Input
                  id="initialValue"
                  type="number"
                  min={1}
                  value={initialValueStr}
                  onChange={(e) => setInitialValueStr(e.target.value)}
                  className="pl-10 bg-background/50 border-border focus:border-primary"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Duração - Slider */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <Label className="text-foreground">Duração da meta</Label>
              </div>
              
              {/* Display do valor selecionado */}
              <div className="text-center p-4 rounded-lg bg-primary/10 border border-primary/30">
                <p className="text-sm text-muted-foreground mb-1">Duração selecionada</p>
                <span className="text-4xl font-bold text-primary">{selectedWeeks}</span>
                <span className="text-lg text-primary ml-2">semanas</span>
                <p className="text-xs text-muted-foreground mt-2">
                  ≈ {Math.round(selectedWeeks / 4.3)} {Math.round(selectedWeeks / 4.3) === 1 ? 'mês' : 'meses'}
                </p>
              </div>
              
              {/* Slider de 1 a 52 - step=1 */}
              <div className="px-2 py-2">
                <Slider
                  value={[selectedWeeks]}
                  onValueChange={(val) => setSelectedWeeks(clampWeeks(val[0]))}
                  min={PROGRESSIVE_GOAL_LIMITS.MIN_WEEKS}
                  max={PROGRESSIVE_GOAL_LIMITS.MAX_WEEKS}
                  step={1}
                  disabled={isSubmitting}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-3">
                  <span>{PROGRESSIVE_GOAL_LIMITS.MIN_WEEKS} semana</span>
                  <span>{PROGRESSIVE_GOAL_LIMITS.MAX_WEEKS} semanas</span>
                </div>
              </div>
              
              {/* Atalhos rápidos */}
              <div className="flex flex-wrap gap-2 justify-center">
                {QUICK_WEEKS.map((weeks) => (
                  <Button
                    key={weeks}
                    type="button"
                    variant={selectedWeeks === weeks ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedWeeks(weeks)}
                    disabled={isSubmitting}
                    className="text-xs"
                  >
                    {weeks} sem
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card de Preview Educativo */}
        <Card className="glass-card border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Projeção da sua Meta</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Estatísticas */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-background/50 border border-border/50">
                <div className="p-2 rounded-full bg-primary/10">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Na semana {calculations.weeks} você estará poupando</p>
                  <p className="text-xl font-bold text-primary">
                    {formatCurrency(calculations.lastWeekValue)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-lg bg-background/50 border border-border/50">
                <div className="p-2 rounded-full bg-primary/10">
                  <PiggyBank className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total estimado ao final</p>
                  <p className="text-xl font-bold text-primary">
                    {formatCurrency(calculations.totalEstimated)}
                  </p>
                </div>
              </div>
            </div>

            {/* Explicação Educativa */}
            <div className="p-4 rounded-lg bg-background/30 border border-border/30">
              <p className="text-sm text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">Como funciona:</span> A cada semana, 
                o valor a poupar aumenta <span className="text-primary font-medium">{formatCurrency(initialValue)}</span>. 
                Isso cria um hábito gradual e sustentável de poupança, 
                permitindo que você se adapte progressivamente ao esforço financeiro.
              </p>
            </div>

            {/* Mini Timeline Visual */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Exemplo das primeiras semanas
              </p>
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {[1, 2, 3, 4, 5].map((week) => (
                  <div
                    key={week}
                    className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg bg-background/50 border border-border/50 shrink-0"
                  >
                    <span className="text-xs text-muted-foreground">Sem {week}</span>
                    <span className="text-sm font-semibold text-foreground">
                      {formatCurrency(initialValue * week)}
                    </span>
                  </div>
                ))}
                <div className="flex items-center gap-1 px-3 py-2 text-muted-foreground">
                  <span className="text-sm">...</span>
                </div>
                <div className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg bg-primary/10 border border-primary/30 shrink-0">
                  <span className="text-xs text-primary">Sem {calculations.weeks}</span>
                  <span className="text-sm font-semibold text-primary">
                    {formatCurrency(calculations.lastWeekValue)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ações */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/app/goals")}
            className="flex-1 sm:flex-none"
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            className="flex-1 sm:flex-none btn-premium"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Criar Meta
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AppProgressiveGoalNew;
