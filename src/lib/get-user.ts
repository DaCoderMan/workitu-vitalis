import { auth } from "@/lib/auth-config";

const DEFAULT_USER_ID = "default-user";

export async function getUserId(): Promise<string> {
  try {
    const session = await auth();
    return session?.user?.id || DEFAULT_USER_ID;
  } catch {
    return DEFAULT_USER_ID;
  }
}
