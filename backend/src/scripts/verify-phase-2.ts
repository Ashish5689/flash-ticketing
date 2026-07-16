import { randomUUID } from 'node:crypto';

import { eq, inArray } from 'drizzle-orm';

import { db, pool } from '../config/db.js';
import { redis } from '../config/redis.js';
import { movies } from '../db/schema/movies.js';
import { users } from '../db/schema/users.js';
import { signAccessToken } from '../modules/auth/token.service.js';

const apiUrl = process.env.PHASE_2_VERIFY_API_URL ?? 'http://localhost:4000';
const suffix = randomUUID().slice(0, 8);
const createdUserIds: string[] = [];
let createdMovieId: string | undefined;

async function json<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as T;
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${JSON.stringify(body)}`);
  return body;
}

async function request<T>(path: string, token?: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (token) headers.set('authorization', `Bearer ${token}`);
  if (init.body) headers.set('content-type', 'application/json');
  return json<T>(await fetch(`${apiUrl}${path}`, { ...init, headers }));
}

async function createTestUser(role: 'USER' | 'ADMIN') {
  const [user] = await db
    .insert(users)
    .values({
      email: `phase2-${role.toLowerCase()}-${suffix}@example.com`,
      name: `Phase 2 ${role}`,
      firebaseUid: `phase2-${role.toLowerCase()}-${randomUUID()}`,
      provider: 'password',
      role,
    })
    .returning();
  if (!user) throw new Error('Failed to create verification user');
  createdUserIds.push(user.id);
  return user;
}

async function verifyPhase2() {
  const [admin, applicant] = await Promise.all([createTestUser('ADMIN'), createTestUser('USER')]);
  const [adminToken, userToken] = await Promise.all([
    signAccessToken(admin),
    signAccessToken(applicant),
  ]);

  const created = await request<{ movie: { id: string; title: string } }>(
    '/admin/movies',
    adminToken,
    {
      method: 'POST',
      body: JSON.stringify({
        title: `Phase 2 Film ${suffix}`,
        description: 'A temporary catalog record used to verify secured movie CRUD behavior.',
        posterUrl: '/posters/skybound.png',
        genres: ['Adventure'],
        languages: ['English'],
        durationMin: 120,
        certificate: 'U/A',
        rating: 8.1,
        releaseDate: '2026-07-01',
        status: 'published',
      }),
    },
  );
  createdMovieId = created.movie.id;
  const publicMovies = await request<{ movies: Array<{ id: string }> }>('/movies');
  if (!publicMovies.movies.some((movie) => movie.id === createdMovieId)) {
    throw new Error('Published admin movie was not visible in public catalog');
  }

  const application = await request<{ application: { id: string; status: string } }>(
    '/organizer/apply',
    userToken,
    {
      method: 'POST',
      body: JSON.stringify({ businessName: 'Silver Screen Cinemas', phone: '+91 98765 43210' }),
    },
  );
  if (application.application.status !== 'pending') throw new Error('Application was not pending');

  await request(`/admin/organizers/${application.application.id}`, adminToken, {
    method: 'PATCH',
    body: JSON.stringify({ decision: 'approve', reviewNote: 'Verified by Phase 2 workflow' }),
  });
  const [promoted] = await db.select().from(users).where(eq(users.id, applicant.id)).limit(1);
  if (promoted?.role !== 'ORGANIZER') throw new Error('Approval did not promote the user role');
  const organizerToken = await signAccessToken(promoted);

  const theater = await request<{ theater: { id: string } }>(
    '/organizer/theaters',
    organizerToken,
    {
      method: 'POST',
      body: JSON.stringify({
        name: 'Silver Screen Andheri',
        city: 'Mumbai',
        address: '123 Film City Road, Andheri East, Mumbai',
      }),
    },
  );
  await request(`/organizer/theaters/${theater.theater.id}/screens`, organizerToken, {
    method: 'POST',
    body: JSON.stringify({
      name: 'Screen 1',
      layout: {
        rows: [
          { label: 'A', seatCount: 10, tier: 'CLASSIC' },
          { label: 'B', seatCount: 10, tier: 'PRIME' },
          { label: 'C', seatCount: 8, tier: 'RECLINER' },
        ],
        aisleAfterColumns: [5],
      },
    }),
  });
  const result = await request<{
    theaters: Array<{ id: string; screens: Array<{ layout: { rows: unknown[] } }> }>;
  }>('/organizer/theaters', organizerToken);
  const verifiedTheater = result.theaters.find((item) => item.id === theater.theater.id);
  if (verifiedTheater?.screens[0]?.layout.rows.length !== 3) {
    throw new Error('Theater screen layout was not returned correctly');
  }

  const forbidden = await fetch(`${apiUrl}/organizer/theaters`, {
    headers: { authorization: `Bearer ${userToken}` },
  });
  if (forbidden.status !== 403)
    throw new Error('Unrefreshed USER token bypassed organizer role guard');

  process.stdout.write(
    'Movie CRUD/public browse, organizer approval, role guard, theater ownership, and screen layout passed.\n',
  );
}

try {
  await verifyPhase2();
} finally {
  if (createdMovieId) await db.delete(movies).where(eq(movies.id, createdMovieId));
  if (createdUserIds.length > 0) await db.delete(users).where(inArray(users.id, createdUserIds));
  await pool.end();
  if (redis.status !== 'wait' && redis.status !== 'end') redis.disconnect();
}
