import type { AdminUser, OrganizerDashboard, PlatformDashboard } from '../types/analytics';
import { apiRequest } from './api';

function queryString(params: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

export function getOrganizerDashboard() {
  return apiRequest<OrganizerDashboard>('/organizer/stats');
}

export function getPlatformDashboard() {
  return apiRequest<PlatformDashboard>('/admin/stats');
}

export async function getAdminUsers(filters: { q?: string; role?: string; status?: string } = {}) {
  return (await apiRequest<{ users: AdminUser[] }>(`/admin/users${queryString(filters)}`)).users;
}

export async function updateAdminUserStatus(id: string, status: AdminUser['status']) {
  return (
    await apiRequest<{ user: AdminUser }>(`/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
  ).user;
}
