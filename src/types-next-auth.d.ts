import "next-auth";
declare module "next-auth" {
  interface Session {
    user: { id: string; platformRole: string; name?: string | null; email?: string | null };
  }
}
