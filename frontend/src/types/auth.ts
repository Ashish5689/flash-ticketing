export type UserRole = 'USER' | 'ORGANIZER' | 'ADMIN';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: UserRole;
};

export type AuthSession = {
  accessToken: string;
  user: AuthUser;
};
