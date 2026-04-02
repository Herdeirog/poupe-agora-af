import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ClientRouteProps {
  children: React.ReactNode;
}

export function ClientRoute({ children }: ClientRouteProps) {
  const { isAuthenticated, isCliente, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (!isCliente) {
    // Admin trying to access client area - redirect to admin panel
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}
