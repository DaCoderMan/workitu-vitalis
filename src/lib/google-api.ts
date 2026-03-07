import { google } from "googleapis";
import { ObjectId } from "mongodb";
import { auth } from "@/lib/auth-config";
import clientPromise from "@/lib/db/client";

/**
 * Get the Google OAuth2 client for the current user.
 * Uses tokens stored by NextAuth in MongoDB accounts collection.
 */
export async function getGoogleClient() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const client = await clientPromise;
  const db = client.db();

  // MongoDBAdapter stores userId as ObjectId, session has it as string
  const uid = session.user.id;
  const userIdFilter = ObjectId.isValid(uid) ? new ObjectId(uid) : uid;

  const account = await db.collection("accounts").findOne({
    userId: userIdFilter,
    provider: "google",
  });

  if (!account?.access_token) return null;

  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
  });

  // Auto-refresh: when token refreshes, update MongoDB
  oauth2.on("tokens", async (tokens) => {
    const update: Record<string, unknown> = {};
    if (tokens.access_token) update.access_token = tokens.access_token;
    if (tokens.refresh_token) update.refresh_token = tokens.refresh_token;
    if (tokens.expiry_date) update.expires_at = Math.floor(tokens.expiry_date / 1000);

    if (Object.keys(update).length > 0) {
      const c = await clientPromise;
      await c.db().collection("accounts").updateOne(
        { userId: userIdFilter, provider: "google" },
        { $set: update }
      );
    }
  });

  return oauth2;
}

/** Google Drive (read-only) */
export async function getDriveClient() {
  const authClient = await getGoogleClient();
  if (!authClient) return null;
  return google.drive({ version: "v3", auth: authClient });
}

/** Gmail (read-only) */
export async function getGmailClient() {
  const authClient = await getGoogleClient();
  if (!authClient) return null;
  return google.gmail({ version: "v1", auth: authClient });
}

/** Google Calendar */
export async function getCalendarClient() {
  const authClient = await getGoogleClient();
  if (!authClient) return null;
  return google.calendar({ version: "v3", auth: authClient });
}
