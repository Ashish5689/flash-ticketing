import { createClerkClient, verifyToken, type User as ClerkUser } from "@clerk/backend";
import { env } from "../../config/env";
import { unauthorized } from "../../shared/errors";
import type { AuthUser, Role } from "../../types";
import { upsertExternalUser } from "./auth.repo";

const clerkClient = env.CLERK_SECRET_KEY ? createClerkClient({ secretKey: env.CLERK_SECRET_KEY }) : null;
const organizerEmails = new Set(
  env.ORGANIZER_EMAILS.split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
);

export async function verifyClerkToken(token: string): Promise<AuthUser> {
  if (!env.CLERK_SECRET_KEY || !clerkClient) throw unauthorized("Clerk is not configured");
  const payload = await verifyToken(token, { secretKey: env.CLERK_SECRET_KEY });
  const clerkUser = await clerkClient.users.getUser(payload.sub);
  const email = readEmail(clerkUser);
  const name = readName(clerkUser, email);
  const role = resolveAppRole(clerkUser, email);
  const user = await upsertExternalUser({ email, name, role });
  return { id: user.id, email: user.email, role: user.role };
}

function readEmail(user: ClerkUser): string {
  const email = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress;
  if (!email) throw unauthorized("Clerk user is missing email");
  return email.toLowerCase();
}

function readName(user: ClerkUser, email: string): string {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return user.fullName ?? (fullName || user.username) ?? email.split("@")[0];
}

function resolveAppRole(user: ClerkUser, email: string): Role {
  const metadataRole =
    typeof user.publicMetadata.role === "string"
      ? user.publicMetadata.role.toLowerCase()
      : typeof user.privateMetadata.role === "string"
        ? user.privateMetadata.role.toLowerCase()
        : "";
  if (organizerEmails.has(email) || metadataRole === "admin" || metadataRole === "organizer") {
    return "organizer";
  }
  return "buyer";
}
