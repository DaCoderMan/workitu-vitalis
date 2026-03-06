// =============================================================================
// Vitalis — NextAuth Configuration
// =============================================================================

import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/db/client";
import crypto from "crypto";

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const testHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return hash === testHash;
}

/**
 * WHOOP OAuth2 provider — custom since next-auth doesn't ship one built-in.
 */
const WhoopProvider = {
  id: "whoop",
  name: "WHOOP",
  type: "oauth" as const,
  authorization: {
    url: "https://api.prod.whoop.com/oauth/oauth2/auth",
    params: {
      scope: "read:recovery read:sleep read:cycles read:workout read:profile read:body_measurement",
      response_type: "code",
    },
  },
  token: {
    url: "https://api.prod.whoop.com/oauth/oauth2/token",
  },
  userinfo: {
    url: "https://api.prod.whoop.com/developer/v1/user/profile/basic",
  },
  clientId: process.env.WHOOP_CLIENT_ID,
  clientSecret: process.env.WHOOP_CLIENT_SECRET,
  profile(profile: Record<string, unknown>) {
    return {
      id: String(profile.user_id),
      name: `${profile.first_name} ${profile.last_name}`,
      email: profile.email as string | undefined,
    };
  },
};

export const authConfig: NextAuthConfig = {
  adapter: MongoDBAdapter(clientPromise),

  session: {
    strategy: "jwt",
  },

  pages: {
    signIn: "/sign-in",
  },

  providers: [
    // -----------------------------------------------------------------------
    // Dev-only credentials provider (admin/admin)
    // -----------------------------------------------------------------------
    Credentials({
      name: "Login",
      credentials: {
        username: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.username as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        // Check hardcoded admin
        const adminUser = process.env.ADMIN_USER ?? "admin";
        const adminPass = process.env.ADMIN_PASSWORD ?? "admin";
        const adminEmail = process.env.ADMIN_EMAIL ?? "jonathanperlin@gmail.com";
        if (
          (email === adminUser || email === adminEmail) &&
          password === adminPass
        ) {
          return { id: "admin", name: "Admin", email: adminEmail };
        }

        // Check DB users
        try {
          const client = await clientPromise;
          const db = client.db();
          const user = await db.collection("users").findOne({ email });
          if (user && user.password && verifyPassword(password, user.password)) {
            return {
              id: user._id.toString(),
              name: user.name as string,
              email: user.email as string,
            };
          }
        } catch {
          // DB error — fall through
        }

        return null;
      },
    }),

    // -----------------------------------------------------------------------
    // WHOOP OAuth2
    // -----------------------------------------------------------------------
    WhoopProvider,
  ],

  callbacks: {
    /**
     * JWT callback — attach user ID and WHOOP tokens to the JWT.
     */
    async jwt({ token, user, account }) {
      // First sign-in: persist user ID
      if (user) {
        token.userId = user.id;
      }

      // WHOOP OAuth: persist tokens for API calls
      if (account?.provider === "whoop") {
        token.whoopAccessToken = account.access_token;
        token.whoopRefreshToken = account.refresh_token;
        token.whoopExpiresAt = account.expires_at;
      }

      return token;
    },

    /**
     * Session callback — expose user ID to the client.
     */
    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
};

/**
 * Initialize NextAuth and export handlers + auth function.
 * - `handlers` — { GET, POST } for the [...nextauth] route
 * - `auth` — server-side session getter
 * - `signIn` / `signOut` — server actions
 */
export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

export default authConfig;
