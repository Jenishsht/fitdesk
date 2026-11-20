import type { NextAuthConfig } from "next-auth";

const PUBLIC = ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email"];

export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const path = request.nextUrl.pathname;
      const isPublic = PUBLIC.some((p) => path.startsWith(p));
      if (isPublic) return true;
      return !!auth?.user;
    },
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id as string;
        token.platformRole = (user as { platformRole?: string }).platformRole;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.uid as string;
      session.user.platformRole = token.platformRole as string;
      return session;
    },
  },
} satisfies NextAuthConfig;
