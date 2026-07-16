import type { User } from '../../db/schema/users.js';

export type PublicUser = Pick<User, 'id' | 'email' | 'name' | 'avatarUrl' | 'role'>;

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
  };
}
