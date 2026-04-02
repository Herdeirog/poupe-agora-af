import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DailyMetrics {
  date: string;
  total_calls: number;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  avg_latency_ms: number;
}

interface AgentMetrics {
  agent_slug: string;
  total_calls: number;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  avg_latency_ms: number;
}

interface TopCall {
  id: string;
  agent_slug: string;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  latency_ms: number;
  created_at: string;
  status: string;
}

interface AIMetricsSummary {
  total_calls: number;
  total_tokens_in: number;
  total_tokens_out: number;
  total_cost_usd: number;
  avg_latency_ms: number;
}

export interface CostProjection {
  currentMonthCost: number;
  projectedMonthCost: number;
  dailyAverage: number;
  daysElapsed: number;
  daysRemaining: number;
  trend: "up" | "down" | "stable";
  percentChange: number;
}

// Pricing per 1M tokens (input/output)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-3.5-turbo": { input: 0.5, output: 1.5 },
  "google/gemini-2.5-flash": { input: 0.075, output: 0.3 },
  "google/gemini-2.5-flash-lite": { input: 0.0375, output: 0.15 },
};

function calculateCost(tokensIn: number, tokensOut: number, model = "gpt-4o-mini"): number {
  const price = MODEL_PRICING[model] || MODEL_PRICING["gpt-4o-mini"];
  return ((tokensIn * price.input) + (tokensOut * price.output)) / 1_000_000;
}

export function useAIMetrics(days = 7) {
  // Fetch summary metrics
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["ai-metrics-summary", days],
    queryFn: async (): Promise<AIMetricsSummary> => {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data, error } = await supabase
        .from("agent_runs")
        .select("tokens_in, tokens_out, latency_ms, status")
        .gte("created_at", since.toISOString())
        .eq("status", "ok");

      if (error) throw error;

      const runs = data || [];
      const totalCalls = runs.length;
      const totalTokensIn = runs.reduce((acc, r) => acc + (r.tokens_in || 0), 0);
      const totalTokensOut = runs.reduce((acc, r) => acc + (r.tokens_out || 0), 0);
      const totalCost = calculateCost(totalTokensIn, totalTokensOut);
      const avgLatency = runs.length > 0
        ? runs.reduce((acc, r) => acc + (r.latency_ms || 0), 0) / runs.length
        : 0;

      return {
        total_calls: totalCalls,
        total_tokens_in: totalTokensIn,
        total_tokens_out: totalTokensOut,
        total_cost_usd: totalCost,
        avg_latency_ms: avgLatency,
      };
    },
  });

  // Fetch daily metrics
  const { data: dailyMetrics, isLoading: dailyLoading } = useQuery({
    queryKey: ["ai-metrics-daily", days],
    queryFn: async (): Promise<DailyMetrics[]> => {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data, error } = await supabase
        .from("agent_runs")
        .select("created_at, tokens_in, tokens_out, latency_ms")
        .gte("created_at", since.toISOString())
        .eq("status", "ok")
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Group by day
      const byDay = new Map<string, { tokens_in: number; tokens_out: number; latency: number[]; count: number }>();
      
      (data || []).forEach(run => {
        const date = run.created_at?.split("T")[0] || "";
        if (!byDay.has(date)) {
          byDay.set(date, { tokens_in: 0, tokens_out: 0, latency: [], count: 0 });
        }
        const day = byDay.get(date)!;
        day.tokens_in += run.tokens_in || 0;
        day.tokens_out += run.tokens_out || 0;
        day.latency.push(run.latency_ms || 0);
        day.count++;
      });

      return Array.from(byDay.entries()).map(([date, data]) => ({
        date,
        total_calls: data.count,
        tokens_in: data.tokens_in,
        tokens_out: data.tokens_out,
        cost_usd: calculateCost(data.tokens_in, data.tokens_out),
        avg_latency_ms: data.latency.length > 0
          ? data.latency.reduce((a, b) => a + b, 0) / data.latency.length
          : 0,
      }));
    },
  });

  // Fetch by agent
  const { data: agentMetrics, isLoading: agentLoading } = useQuery({
    queryKey: ["ai-metrics-agents", days],
    queryFn: async (): Promise<AgentMetrics[]> => {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data, error } = await supabase
        .from("agent_runs")
        .select("agent_slug, tokens_in, tokens_out, latency_ms")
        .gte("created_at", since.toISOString())
        .eq("status", "ok");

      if (error) throw error;

      // Group by agent
      const byAgent = new Map<string, { tokens_in: number; tokens_out: number; latency: number[]; count: number }>();
      
      (data || []).forEach(run => {
        const slug = run.agent_slug || "unknown";
        if (!byAgent.has(slug)) {
          byAgent.set(slug, { tokens_in: 0, tokens_out: 0, latency: [], count: 0 });
        }
        const agent = byAgent.get(slug)!;
        agent.tokens_in += run.tokens_in || 0;
        agent.tokens_out += run.tokens_out || 0;
        agent.latency.push(run.latency_ms || 0);
        agent.count++;
      });

      return Array.from(byAgent.entries())
        .map(([slug, data]) => ({
          agent_slug: slug,
          total_calls: data.count,
          tokens_in: data.tokens_in,
          tokens_out: data.tokens_out,
          cost_usd: calculateCost(data.tokens_in, data.tokens_out),
          avg_latency_ms: data.latency.length > 0
            ? data.latency.reduce((a, b) => a + b, 0) / data.latency.length
            : 0,
        }))
        .sort((a, b) => b.total_calls - a.total_calls);
    },
  });

  // Fetch top expensive calls
  const { data: topCalls, isLoading: topLoading } = useQuery({
    queryKey: ["ai-metrics-top-calls", days],
    queryFn: async (): Promise<TopCall[]> => {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data, error } = await supabase
        .from("agent_runs")
        .select("id, agent_slug, tokens_in, tokens_out, latency_ms, created_at, status")
        .gte("created_at", since.toISOString())
        .eq("status", "ok")
        .not("tokens_in", "is", null)
        .order("tokens_out", { ascending: false })
        .limit(10);

      if (error) throw error;

      return (data || []).map(run => ({
        id: run.id,
        agent_slug: run.agent_slug || "unknown",
        tokens_in: run.tokens_in || 0,
        tokens_out: run.tokens_out || 0,
        cost_usd: calculateCost(run.tokens_in || 0, run.tokens_out || 0),
        latency_ms: run.latency_ms || 0,
        created_at: run.created_at || "",
        status: run.status,
      }));
    },
  });

  // Fetch cost projection for current month
  const { data: projection, isLoading: projectionLoading } = useQuery({
    queryKey: ["ai-metrics-projection"],
    queryFn: async (): Promise<CostProjection> => {
      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const daysElapsed = now.getDate();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const daysRemaining = daysInMonth - daysElapsed;

      const { data, error } = await supabase
        .from("agent_runs")
        .select("tokens_in, tokens_out, created_at")
        .gte("created_at", firstOfMonth.toISOString())
        .eq("status", "ok");

      if (error) throw error;

      const runs = data || [];
      const totalTokensIn = runs.reduce((acc, r) => acc + (r.tokens_in || 0), 0);
      const totalTokensOut = runs.reduce((acc, r) => acc + (r.tokens_out || 0), 0);
      const currentCost = calculateCost(totalTokensIn, totalTokensOut);

      const dailyAverage = currentCost / (daysElapsed || 1);
      const projectedCost = currentCost + (dailyAverage * daysRemaining);

      // Calculate trend comparing first vs second half of the period
      const midpoint = Math.floor(runs.length / 2);
      const firstHalf = runs.slice(0, midpoint);
      const secondHalf = runs.slice(midpoint);

      const firstHalfCost = calculateCost(
        firstHalf.reduce((acc, r) => acc + (r.tokens_in || 0), 0),
        firstHalf.reduce((acc, r) => acc + (r.tokens_out || 0), 0)
      );
      const secondHalfCost = calculateCost(
        secondHalf.reduce((acc, r) => acc + (r.tokens_in || 0), 0),
        secondHalf.reduce((acc, r) => acc + (r.tokens_out || 0), 0)
      );

      const percentChange = firstHalfCost > 0
        ? ((secondHalfCost - firstHalfCost) / firstHalfCost) * 100
        : 0;

      const trend = percentChange > 5 ? "up" : percentChange < -5 ? "down" : "stable";

      return {
        currentMonthCost: currentCost,
        projectedMonthCost: projectedCost,
        dailyAverage,
        daysElapsed,
        daysRemaining,
        trend,
        percentChange,
      };
    },
  });

  return {
    summary: summary || {
      total_calls: 0,
      total_tokens_in: 0,
      total_tokens_out: 0,
      total_cost_usd: 0,
      avg_latency_ms: 0,
    },
    dailyMetrics: dailyMetrics || [],
    agentMetrics: agentMetrics || [],
    topCalls: topCalls || [],
    projection: projection || {
      currentMonthCost: 0,
      projectedMonthCost: 0,
      dailyAverage: 0,
      daysElapsed: 0,
      daysRemaining: 0,
      trend: "stable" as const,
      percentChange: 0,
    },
    isLoading: summaryLoading || dailyLoading || agentLoading || topLoading || projectionLoading,
  };
}
