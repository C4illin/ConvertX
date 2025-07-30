// API type definitions

export interface AuthenticatedUser {
  id: number;
  email: string;
}

export interface ApiContext {
  user: AuthenticatedUser | null;
}