// useAuth agora é um wrapper leve sobre o AuthContext centralizado.
// Isso resolve o bug de múltiplas instâncias disparando initAuth() simultaneamente.
export { useAuthContext as useAuth } from '@/contexts/AuthContext';
