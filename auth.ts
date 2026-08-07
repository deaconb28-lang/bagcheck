import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { dbName, getMongoClient, isDbConfigured } from "@/lib/db/client";

// Without MONGODB_URI the app still boots: sessions fall back to JWTs so the
// sign-in flow can be exercised before the ledger store exists.
const withDb = isDbConfigured();

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  ...(withDb
    ? { adapter: MongoDBAdapter(getMongoClient, { databaseName: dbName() }) }
    : {}),
  session: { strategy: withDb ? "database" : "jwt" },
  providers: [Google],
  // Surfaces the failure reason instead of Auth.js's generic server error.
  pages: { error: "/auth/error" },
  logger: {
    error(error) {
      console.error("[auth]", error);
    },
    warn(code) {
      console.warn("[auth]", code);
    },
  },
  callbacks: {
    session({ session, user, token }) {
      if (user?.id) {
        session.user.id = user.id;
      } else if (token?.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});

export function isAuthConfigured(): boolean {
  return Boolean(
    process.env.AUTH_SECRET && process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
  );
}

/**
 * Identity for ledger routes. With auth configured, the Google session is
 * the only identity. Until then, DEV_USER_ID provides a stand-in so the
 * SnapTrade + MongoDB pipeline can be exercised before an OAuth client
 * exists. The bypass dies automatically once the AUTH_* vars are set.
 * On a public deployment, DEV_USER_ID exposes that identity's ledger to
 * anyone with the URL — set it locally, or remove it after testing.
 */
export async function getUserId(): Promise<string | null> {
  if (isAuthConfigured()) {
    try {
      const session = await auth();
      return session?.user?.id ?? null;
    } catch (err) {
      // With database sessions, auth() reaches MongoDB. A store that is
      // unreachable should render the page signed-out, not 500 it.
      console.error("[auth] session lookup failed", err);
      return null;
    }
  }
  return process.env.DEV_USER_ID || null;
}

export function isDevIdentity(): boolean {
  return !isAuthConfigured() && Boolean(process.env.DEV_USER_ID);
}
