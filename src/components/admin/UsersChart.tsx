import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";



export function UsersChart() {
  return (
    <div className="glass-strong p-6 shadow-premium animate-fade-in">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">Novos Usuários</h3>
        <p className="text-sm text-muted-foreground">Crescimento mensal de usuários</p>
      </div>
      <div className="h-[300px] flex items-center justify-center">
        <p className="text-muted-foreground text-center">Gráfico será implementado com dados reais do Supabase</p>
      </div>
    </div>
  );
}
