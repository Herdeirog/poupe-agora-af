import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
// Auth Provider (centralizado - resolve bug de múltiplas instâncias)
import { AuthProvider } from "@/contexts/AuthContext";

// Branding Provider (white label - nome, logo, cores do Supabase)
import { BrandingProvider, useBrandingContext } from "@/contexts/BrandingContext";

// Currency Provider
import { CurrencyProvider } from "@/contexts/CurrencyContext";

// Trial Provider
import { TrialProvider } from "@/contexts/TrialContext";

// Error Boundary
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Auth Components
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Admin Pages
import { AdminLayout } from "@/components/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UsersPage from "./pages/admin/Users.tsx";
import AdminUserDetails from "./pages/admin/AdminUserDetails";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminSubscriptionDetails from "./pages/admin/AdminSubscriptionDetails";
import AdminSubscriptionsDashboard from "./pages/admin/AdminSubscriptionsDashboard";
import AdminTransactions from "./pages/admin/AdminTransactions";
import AdminTransactionDetails from "./pages/admin/AdminTransactionDetails";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminNotificationDetails from "./pages/admin/AdminNotificationDetails";
import AdminReports from "./pages/admin/AdminReports";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminFinance from "./pages/admin/AdminFinance";
import AdminFamilyPlans from "./pages/admin/AdminFamilyPlans";
import AdminAgents from "./pages/admin/AdminAgents";
import AdminAgentConfig from "./pages/admin/AdminAgentConfig";
import AdminAgentLogs from "./pages/admin/AdminAgentLogs";
import AdminQueueDebug from "./pages/admin/AdminQueueDebug";
import AdminEvolution from "./pages/admin/AdminEvolution";
import AdminAIMetrics from "./pages/admin/AdminAIMetrics";

// User App Pages
import AppLayout from "./pages/app/AppLayout";
import AppDashboard from "./pages/app/AppDashboard";
import AppTransactions from "./pages/app/AppTransactions";
import AppTransactionNew from "./pages/app/AppTransactionNew";
import AppTransactionEdit from "./pages/app/AppTransactionEdit";
import AppTransactionDetails from "./pages/app/AppTransactionDetails";
import AppGoals from "./pages/app/AppGoals";
import AppGoalNew from "./pages/app/AppGoalNew";
import AppGoalEdit from "./pages/app/AppGoalEdit";
import AppGoalDetails from "./pages/app/AppGoalDetails";
import AppProgressiveGoalNew from "./pages/app/AppProgressiveGoalNew";
import AppProgressiveGoalProgress from "./pages/app/AppProgressiveGoalProgress";
import AppCategories from "./pages/app/AppCategories";
import AppProfile from "./pages/app/AppProfile";
import AppProfileEdit from "./pages/app/AppProfileEdit";
import AppPlan from "./pages/app/AppPlan";
import AppSettings from "./pages/app/AppSettings";
import AppSupport from "./pages/app/AppSupport";
import AppCalendar from "./pages/app/AppCalendar";
import AppGoogleIntegration from "./pages/app/AppGoogleIntegration";
import AppIntegrations from "./pages/app/AppIntegrations";
import AppReports from "./pages/app/AppReports";
import AppReminders from "./pages/app/AppReminders";
import AppAgenda from "./pages/app/AppAgenda";

const queryClient = new QueryClient();

function FaviconUpdater() {
  const { faviconUrl } = useBrandingContext();

  useEffect(() => {
    if (faviconUrl) {
      let link = document.querySelector("link[rel='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = faviconUrl;
    }
  }, [faviconUrl]);

  return null;
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
      <BrandingProvider>
      <CurrencyProvider>
      <TrialProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <FaviconUpdater />
          <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />

            {/* Admin Routes - Protected for admins only */}
            <Route path="/admin" element={
              <ProtectedRoute requireAdmin={true}>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="users/:id" element={<AdminUserDetails />} />
              <Route path="family-plans" element={<AdminFamilyPlans />} />
              <Route path="subscriptions" element={<AdminSubscriptions />} />
              <Route path="subscriptions/dashboard" element={<AdminSubscriptionsDashboard />} />
              <Route path="subscriptions/:id" element={<AdminSubscriptionDetails />} />
              <Route path="transactions" element={<AdminTransactions />} />
              <Route path="transactions/:id" element={<AdminTransactionDetails />} />
              <Route path="notifications" element={<AdminNotifications />} />
              <Route path="notifications/:id" element={<AdminNotificationDetails />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="plans" element={<AdminFinance />} />
              <Route path="agents" element={<AdminAgents />} />
              <Route path="agents/logs" element={<AdminAgentLogs />} />
              <Route path="agents/:agentSlug" element={<AdminAgentConfig />} />
              <Route path="queue" element={<AdminQueueDebug />} />
              <Route path="evolution" element={<AdminEvolution />} />
              <Route path="ai-metrics" element={<AdminAIMetrics />} />
            </Route>

            {/* User App Routes - Protected for clients only */}
            <Route path="/app" element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }>
              <Route index element={<AppDashboard />} />
              <Route path="dashboard" element={<AppDashboard />} />
              <Route path="transactions" element={<AppTransactions />} />
              <Route path="transactions/new" element={<AppTransactionNew />} />
              <Route path="transactions/:id" element={<AppTransactionDetails />} />
              <Route path="transactions/:id/edit" element={<AppTransactionEdit />} />
              <Route path="reminders" element={<AppReminders />} />
              <Route path="agenda" element={<AppAgenda />} />
              <Route path="goals" element={<AppGoals />} />
              <Route path="goals/new" element={<AppGoalNew />} />
              <Route path="goals/progressive/new" element={<AppProgressiveGoalNew />} />
              <Route path="goals/progressive/:id" element={<AppProgressiveGoalProgress />} />
              <Route path="goals/:id" element={<AppGoalDetails />} />
              <Route path="goals/:id/edit" element={<AppGoalEdit />} />
              <Route path="categories" element={<AppCategories />} />
              <Route path="profile" element={<AppProfile />} />
              <Route path="profile/edit" element={<AppProfileEdit />} />
              <Route path="plan" element={<AppPlan />} />
              <Route path="settings" element={<AppSettings />} />
              <Route path="integrations" element={<AppIntegrations />} />
              <Route path="integrations/google" element={<AppGoogleIntegration />} />
              <Route path="support" element={<AppSupport />} />
              <Route path="calendar" element={<AppCalendar />} />
              <Route path="reports" element={<AppReports />} />
            </Route>

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </TrialProvider>
      </CurrencyProvider>
      </BrandingProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
