import type { ShowStatus } from './catalog';

export type OrganizerDashboard = {
  summary: { shows: number; sold: number; held: number; available: number; revenueCents: number };
  shows: Array<{
    id: string;
    startsAt: string;
    status: ShowStatus;
    movieTitle: string;
    theaterName: string;
    screenName: string;
    sold: number;
    held: number;
    available: number;
    revenueCents: number;
  }>;
};

export type PlatformDashboard = {
  users: { total: number; active: number; suspended: number; organizers: number };
  movies: number;
  theaters: number;
  shows: number;
  bookings: number;
  revenueCents: number;
  pendingOrganizers: number;
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ORGANIZER' | 'ADMIN';
  status: 'active' | 'suspended';
  provider: 'google' | 'password';
  createdAt: string;
};
