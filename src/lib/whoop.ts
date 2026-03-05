// =============================================================================
// Vitalis — WHOOP API Client
// =============================================================================

import clientPromise from "@/lib/db/client";
import type {
  WhoopTokens,
  WhoopRecovery,
  WhoopSleep,
  WhoopCycle,
  HealthReading,
} from "@/lib/types";

const WHOOP_BASE_URL = "https://api.prod.whoop.com/developer";
const WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";

// ---------------------------------------------------------------------------
// Token Management
// ---------------------------------------------------------------------------

/**
 * Fetch stored WHOOP tokens from the MongoDB accounts collection.
 * Returns null if no WHOOP account is linked for this user.
 */
export async function getWhoopTokens(
  userId: string
): Promise<WhoopTokens | null> {
  const client = await clientPromise;
  const db = client.db();

  const account = await db.collection("accounts").findOne({
    userId,
    provider: "whoop",
  });

  if (!account) return null;

  return {
    access_token: account.access_token,
    refresh_token: account.refresh_token,
    expires_at: account.expires_at,
    token_type: account.token_type ?? "Bearer",
    scope: account.scope ?? "",
  };
}

/**
 * Refresh an expired WHOOP access token using the refresh token.
 * Updates the stored tokens in MongoDB and returns the new tokens.
 */
export async function refreshWhoopToken(
  userId: string,
  refreshToken: string
): Promise<WhoopTokens> {
  const response = await fetch(WHOOP_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.WHOOP_CLIENT_ID ?? "",
      client_secret: process.env.WHOOP_CLIENT_SECRET ?? "",
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `WHOOP token refresh failed (${response.status}): ${body}`
    );
  }

  const data = await response.json();

  const tokens: WhoopTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
    token_type: data.token_type ?? "Bearer",
    scope: data.scope ?? "",
  };

  // Persist refreshed tokens
  const client = await clientPromise;
  const db = client.db();
  await db.collection("accounts").updateOne(
    { userId, provider: "whoop" },
    {
      $set: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expires_at,
        token_type: tokens.token_type,
        updated_at: new Date(),
      },
    }
  );

  return tokens;
}

// ---------------------------------------------------------------------------
// Authenticated Fetch
// ---------------------------------------------------------------------------

/**
 * Make an authenticated WHOOP API call. Automatically refreshes the token
 * if it has expired (or will expire within 60 seconds).
 */
export async function whoopFetch<T = unknown>(
  userId: string,
  endpoint: string
): Promise<T> {
  let tokens = await getWhoopTokens(userId);
  if (!tokens) {
    throw new Error("No WHOOP account linked for this user");
  }

  // Refresh if expired or expiring within 60 seconds
  const now = Math.floor(Date.now() / 1000);
  if (tokens.expires_at <= now + 60) {
    tokens = await refreshWhoopToken(userId, tokens.refresh_token);
  }

  const url = endpoint.startsWith("http")
    ? endpoint
    : `${WHOOP_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`WHOOP API error (${response.status}): ${body}`);
  }

  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Data Sync Functions
// ---------------------------------------------------------------------------

/**
 * Sync latest recovery data from WHOOP.
 * Returns the recovery record and a normalized HealthReading.
 */
export async function syncRecovery(
  userId: string
): Promise<{ raw: WhoopRecovery; reading: Partial<HealthReading> }> {
  const data = await whoopFetch<{ records: WhoopRecovery[] }>(
    userId,
    "/v2/recovery?limit=1"
  );

  const latest = data.records?.[0];
  if (!latest) {
    throw new Error("No recovery data available from WHOOP");
  }

  const reading: Partial<HealthReading> = {
    userId,
    source: "whoop",
    timestamp: new Date(latest.created_at),
    whoop_score_state: latest.score_state,
  };

  if (latest.score_state === "SCORED" && latest.score) {
    reading.recovery_score = latest.score.recovery_score;
    reading.resting_hr = latest.score.resting_heart_rate;
    reading.hrv_rmssd = latest.score.hrv_rmssd_milli;
    reading.spo2 = latest.score.spo2_percentage;
    reading.skin_temp = latest.score.skin_temp_celsius;
  }

  return { raw: latest, reading };
}

/**
 * Sync latest sleep data from WHOOP.
 * Returns the sleep record and a normalized HealthReading.
 */
export async function syncSleep(
  userId: string
): Promise<{ raw: WhoopSleep; reading: Partial<HealthReading> }> {
  const data = await whoopFetch<{ records: WhoopSleep[] }>(
    userId,
    "/v2/sleep?limit=1"
  );

  const latest = data.records?.[0];
  if (!latest) {
    throw new Error("No sleep data available from WHOOP");
  }

  const reading: Partial<HealthReading> = {
    userId,
    source: "whoop",
    timestamp: new Date(latest.created_at),
  };

  if (latest.score_state === "SCORED" && latest.score) {
    const stages = latest.score.stage_summary;
    const totalSleepMs =
      stages.total_light_sleep_time_milli +
      stages.total_slow_wave_sleep_time_milli +
      stages.total_rem_sleep_time_milli;

    reading.sleep_duration = Math.round(totalSleepMs / 60000);
    reading.sleep_efficiency = latest.score.sleep_efficiency_percentage;
    reading.respiratory_rate = latest.score.respiratory_rate;
    reading.sleep_onset = latest.start;
    reading.sleep_wake = latest.end;
    reading.sleep_stages = {
      light: Math.round(stages.total_light_sleep_time_milli / 60000),
      deep: Math.round(stages.total_slow_wave_sleep_time_milli / 60000),
      rem: Math.round(stages.total_rem_sleep_time_milli / 60000),
      awake: Math.round(stages.total_awake_time_milli / 60000),
    };
  }

  return { raw: latest, reading };
}

/**
 * Sync latest physiological cycle data from WHOOP.
 * Returns the cycle record and a normalized HealthReading.
 */
export async function syncCycle(
  userId: string
): Promise<{ raw: WhoopCycle; reading: Partial<HealthReading> }> {
  const data = await whoopFetch<{ records: WhoopCycle[] }>(
    userId,
    "/v2/cycle?limit=1"
  );

  const latest = data.records?.[0];
  if (!latest) {
    throw new Error("No cycle data available from WHOOP");
  }

  const reading: Partial<HealthReading> = {
    userId,
    source: "whoop",
    timestamp: new Date(latest.created_at),
  };

  if (latest.score_state === "SCORED" && latest.score) {
    reading.strain = latest.score.strain;
    reading.avg_hr = latest.score.average_heart_rate;
    reading.active_calories = Math.round(latest.score.kilojoule * 0.239006); // kJ to kcal
  }

  return { raw: latest, reading };
}

/**
 * Sync all WHOOP data types and merge into a single HealthReading.
 * Stores the merged reading in MongoDB.
 */
export async function syncAllWhoop(userId: string): Promise<HealthReading> {
  const [recovery, sleep, cycle] = await Promise.allSettled([
    syncRecovery(userId),
    syncSleep(userId),
    syncCycle(userId),
  ]);

  const today = new Date().toISOString().split("T")[0];
  const merged: HealthReading = {
    userId,
    date: today,
    source: "whoop",
    timestamp: new Date(),
  };

  // Merge recovery data
  if (recovery.status === "fulfilled") {
    Object.assign(merged, recovery.value.reading);
  }

  // Merge sleep data
  if (sleep.status === "fulfilled") {
    Object.assign(merged, sleep.value.reading);
  }

  // Merge cycle data
  if (cycle.status === "fulfilled") {
    Object.assign(merged, cycle.value.reading);
  }

  // Upsert into MongoDB
  const client = await clientPromise;
  const db = client.db();

  await db.collection("health_readings").updateOne(
    { userId, date: today, source: "whoop" },
    {
      $set: {
        ...merged,
        updated_at: new Date(),
      },
      $setOnInsert: {
        created_at: new Date(),
      },
    },
    { upsert: true }
  );

  return merged;
}
