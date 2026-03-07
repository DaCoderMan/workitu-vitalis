import { auth } from "@/lib/auth-config";

export interface RiaUser {
  id: string;
  name: string;
  email: string;
  image?: string;
}

/** Check if the current request is authenticated. Returns user or null. */
export async function getUser(): Promise<RiaUser | null> {
  const session = await auth();
  if (!session?.user) return null;

  const email = session.user.email ?? "";

  return {
    // Backward compat: existing data uses userId "admin"
    // Map the admin email to "admin" so XP/finance/etc. queries still work
    id:
      email === (process.env.ADMIN_EMAIL ?? "admin@workitu.com")
        ? "admin"
        : session.user.id ?? "unknown",
    name: session.user.name ?? "User",
    email,
    image: session.user.image ?? undefined,
  };
}

/** Require authentication — returns user or throws redirect. */
export async function requireUser(): Promise<RiaUser> {
  const user = await getUser();
  if (!user) {
    const { redirect } = await import("next/navigation");
    redirect("/sign-in") as never;
  }
  return user!;
}
