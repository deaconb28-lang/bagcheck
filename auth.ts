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
