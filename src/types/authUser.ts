export type UserRole = 'admin' | 'cliente';

export interface AuthUser {
  id: string;
  email: string;
  nome: string;
  tipo: 'admin' | 'cliente';
  avatar_url?: string;
}

export interface AuthSession {
  user: AuthUser;
  isAuthenticated: boolean;
}
