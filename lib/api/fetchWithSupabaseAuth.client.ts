"use client";

import { getSafeSession } from "@/lib/auth/getSafeSession.client";

export async function fetchWithSupabaseAuth(
  input: string,
  init: RequestInit = {}
) {
  const { session } = await getSafeSession();

  if (!session?.access_token) {
    return {
      ok: false,
      status: 401,
      data: { error: "Unauthorized" },
    };
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${session.access_token}`);

  if (!(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });

  let data: unknown = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}
