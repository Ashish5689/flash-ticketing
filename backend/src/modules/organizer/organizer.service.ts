import { and, asc, eq } from 'drizzle-orm';
import type { z } from 'zod';

import { db } from '../../config/db.js';
import { organizerProfiles } from '../../db/schema/organizers.js';
import { users } from '../../db/schema/users.js';
import { AppError } from '../../shared/errors.js';
import type {
  organizerApplicationSchema,
  organizerListQuerySchema,
  organizerReviewSchema,
} from './organizer.schemas.js';

type ApplicationInput = z.infer<typeof organizerApplicationSchema>;
type ApplicationQuery = z.infer<typeof organizerListQuerySchema>;
type ReviewInput = z.infer<typeof organizerReviewSchema>;

export async function getApplicationForUser(userId: string) {
  const [profile] = await db
    .select()
    .from(organizerProfiles)
    .where(eq(organizerProfiles.userId, userId))
    .limit(1);
  return profile ?? null;
}

export async function submitOrganizerApplication(userId: string, input: ApplicationInput) {
  const existing = await getApplicationForUser(userId);
  if (existing?.status === 'pending') {
    throw new AppError(409, 'APPLICATION_PENDING', 'An organizer application is already pending');
  }
  if (existing?.status === 'approved') {
    throw new AppError(409, 'ALREADY_ORGANIZER', 'This account is already an organizer');
  }
  if (existing) {
    const [resubmitted] = await db
      .update(organizerProfiles)
      .set({
        ...input,
        status: 'pending',
        reviewNote: null,
        reviewedAt: null,
        reviewedBy: null,
        updatedAt: new Date(),
      })
      .where(eq(organizerProfiles.id, existing.id))
      .returning();
    if (!resubmitted) throw new Error('Failed to resubmit organizer application');
    return resubmitted;
  }

  const [profile] = await db
    .insert(organizerProfiles)
    .values({ userId, ...input })
    .returning();
  if (!profile) throw new Error('Failed to submit organizer application');
  return profile;
}

export function listOrganizerApplications(query: ApplicationQuery) {
  return db
    .select({
      id: organizerProfiles.id,
      userId: organizerProfiles.userId,
      businessName: organizerProfiles.businessName,
      phone: organizerProfiles.phone,
      documents: organizerProfiles.documents,
      status: organizerProfiles.status,
      reviewNote: organizerProfiles.reviewNote,
      createdAt: organizerProfiles.createdAt,
      updatedAt: organizerProfiles.updatedAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(organizerProfiles)
    .innerJoin(users, eq(organizerProfiles.userId, users.id))
    .where(query.status ? eq(organizerProfiles.status, query.status) : undefined)
    .orderBy(asc(organizerProfiles.createdAt));
}

export async function reviewOrganizerApplication(
  applicationId: string,
  adminId: string,
  input: ReviewInput,
) {
  return db.transaction(async (transaction) => {
    const nextStatus = input.decision === 'approve' ? 'approved' : 'rejected';
    const [profile] = await transaction
      .update(organizerProfiles)
      .set({
        status: nextStatus,
        reviewNote: input.reviewNote ?? null,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(organizerProfiles.id, applicationId), eq(organizerProfiles.status, 'pending')))
      .returning();

    if (!profile) {
      const [existing] = await transaction
        .select({ status: organizerProfiles.status })
        .from(organizerProfiles)
        .where(eq(organizerProfiles.id, applicationId))
        .limit(1);
      if (!existing) {
        throw new AppError(404, 'APPLICATION_NOT_FOUND', 'Organizer application was not found');
      }
      throw new AppError(409, 'APPLICATION_REVIEWED', 'Organizer application was already reviewed');
    }

    if (input.decision === 'approve') {
      await transaction
        .update(users)
        .set({ role: 'ORGANIZER' })
        .where(eq(users.id, profile.userId));
    }
    return profile;
  });
}
