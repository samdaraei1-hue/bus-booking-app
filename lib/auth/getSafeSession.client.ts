"use client";

import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

function isInvalidRefreshTokenError(message: string | undefined) {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return (
    normalized.includes("invalid refresh token") ||
    normalized.includes("refresh token not found")
  );
}

export async function getSafeSession(): Promise<{
  session: Session | null;
  invalidated: boolean;
}> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error && isInvalidRefreshTokenError(error.message)) {
    try {
      await supabase.auth.signOut();
    } catch {}

    return { session: null, invalidated: true };
  }

  if (error) {
    throw error;
  }

  return { session, invalidated: false };
}
