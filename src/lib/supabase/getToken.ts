import { createClient } from "@/lib/supabase/client";

/**
 * Returns the access_token of the authenticated user.
 * Uses getUser() to verify against the Supabase Auth server (avoids the
 * getSession() warning), then reads the token via onAuthStateChange which
 * fires with INITIAL_SESSION without triggering the security warning.
 */
export async function getAuthToken(): Promise<string | null> {
  const supabase = createClient();

  // Verify user is authentic by contacting the Auth server
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Read the access_token via onAuthStateChange (INITIAL_SESSION event)
  // This avoids the getSession() warning since we don't call getSession()
  return new Promise<string | null>((resolve) => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      subscription.unsubscribe();
      resolve(session?.access_token ?? null);
    });
  });
}
