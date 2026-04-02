import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { AppSidebar } from '@/components/app/AppSidebar';
import { AppTopbar } from '@/components/app/AppTopbar';
import { OnboardingProvider } from '@/components/onboarding/OnboardingProvider';
import { BottomNavigation } from '@/components/app/BottomNavigation';

export default function AppLayout() {
  const location = useLocation();

  console.log('[AppLayout] Rendering, path:', location.pathname);

  // Redirect /app to /app/dashboard
  if (location.pathname === '/app' || location.pathname === '/app/') {
    console.log('[AppLayout] Redirecting /app to /app/dashboard');
    return <Navigate to="/app/dashboard" replace />;
  }

  console.log('[AppLayout] Rendering main layout');

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col">
        <AppTopbar />
        <main className="flex-1 p-3 sm:p-4 lg:p-6 pb-20 lg:pb-6 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* Bottom Navigation for Mobile */}
      <BottomNavigation />

      {/* Onboarding components */}
      <OnboardingProvider />
    </div>
  );
}
