
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useLocation } from 'react-router-dom';
import { LoadingScreen } from '@/components/ui/loading-screen';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
    const { user, loading } = useAuth(requireAdmin);
    const location = useLocation();

    if (loading) {
        return <LoadingScreen />;
    }

    if (!user) {
        console.warn('[ProtectedRoute] No user found, redirecting to /auth from', location.pathname);
        return <Navigate to="/auth" replace state={{ from: location }} />;
    }

    if (requireAdmin && !user.is_admin) {
        console.warn('[ProtectedRoute] Admin required but user is not admin, redirecting to /app/dashboard');
        return <Navigate to="/app/dashboard" replace />;
    }

    // Admin tentando acessar área de cliente - redireciona para admin
    if (!requireAdmin && user.is_admin) {
        console.warn('[ProtectedRoute] Admin trying to access client area, redirecting to /admin');
        return <Navigate to="/admin" replace />;
    }

    return <>{children}</>;
}
