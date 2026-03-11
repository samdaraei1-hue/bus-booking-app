"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export function useRequireAdmin(lang: string) {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "allowed" | "denied">("loading");

  useEffect(() => {
    let mounted = true;

    (async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (error || !user) {
        setStatus("denied");
        router.push(`/${lang}/login`);
        return;
      }

      const { data: roleRow, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (!mounted) return;

      if (roleError || !roleRow || roleRow.role !== "admin") {
        setStatus("denied");
        router.push(`/${lang}`);
        return;
      }

      setStatus("allowed");
    })();

    return () => {
      mounted = false;
    };
  }, [lang, router]);

  return status;
}