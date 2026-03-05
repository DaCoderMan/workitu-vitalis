// =============================================================================
// Vitalis — NextAuth Configuration
// =============================================================================

import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/db/client";

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
      name: "Dev Login",
      credentials: {
        username: { label: "Username", type: "text", placeholder: "admin" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (
          credentials?.username === "admin" &&
          credentials?.password === "admin"
        ) {
          return {
            id: "dev-admin",
            name: "Dev Admin",
            email: "admin@vitalis.local",
          };
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
