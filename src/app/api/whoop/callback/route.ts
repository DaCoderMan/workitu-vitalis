// =============================================================================
// WHOOP OAuth Callback — Exchange authorization code for tokens
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/get-user";
import clientPromise from "@/lib/db/client";

const WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      console.error("[WHOOP Callback] OAuth error:", error);
      return NextResponse.redirect(
        new URL("/settings?error=whoop_auth_failed", request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/settings?error=missing_code", request.url)
      );
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch(WHOOP_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: process.env.WHOOP_CLIENT_ID!,
        client_secret: process.env.WHOOP_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/whoop/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      console.error("[WHOOP Callback] Token exchange failed:", errorBody);
      return NextResponse.redirect(
        new URL("/settings?error=token_exchange_failed", request.url)
      );
    }

    const tokens = await tokenResponse.json();

    // Store tokens in MongoDB accounts collection
    const client = await clientPromise;
    const db = client.db();

    await db.collection("accounts").updateOne(
      {
        userId: userId,
        provider: "whoop",
      },
      {
        $set: {
          userId: userId,
          provider: "whoop",
          type: "oauth",
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: Math.floor(Date.now() / 1000) + tokens.expires_in,
          token_type: tokens.token_type,
          scope: tokens.scope,
          updated_at: new Date(),
        },
        $setOnInsert: {
          created_at: new Date(),
        },
      },
      { upsert: true }
    );

    return NextResponse.redirect(
      new URL("/settings?success=whoop_connected", request.url)
    );
  } catch (error) {
    console.error("[WHOOP Callback] Unexpected error:", error);
    return NextResponse.redirect(
      new URL("/settings?error=unexpected_error", request.url)
    );
  }
}
