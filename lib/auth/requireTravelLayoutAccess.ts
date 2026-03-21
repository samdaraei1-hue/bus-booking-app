"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export function useRequireTravelLayoutAccess(lang: string, travelId: string) {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "allowed" | "denied">(
    "loading"
  );

  useEffect(() => {
    let mounted = true;

    (async () => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (authError || !user) {
        setStatus("denied");
        router.push(`/${lang}/login`);
        return;
      }

      const [{ data: roleRow }, { data: leaderRow, error: leaderError }] =
        await Promise.all([
          supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("travel_teams")
            .select("travel_id")
            .eq("travel_id", travelId)
            .eq("colleague_id", user.id)
            .eq("role", "leader")
            .maybeSingle(),
        ]);

      if (!mounted) return;

      if (roleRow?.role === "admin" || (!!leaderRow && !leaderError)) {
        setStatus("allowed");
        return;
      }

      setStatus("denied");
      router.push(`/${lang}/dashboard/travels`);
    })();

    return () => {
      mounted = false;
    };
  }, [lang, router, travelId]);

  return status;
}
