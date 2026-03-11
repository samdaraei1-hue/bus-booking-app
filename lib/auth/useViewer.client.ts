"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export type Viewer = {
  id: string;
  businessRole: string | null;
  systemRole: string | null;
} | null;

export function useViewer() {
  const [viewer, setViewer] = useState<Viewer>(null);
  const [loading, setLoading] = useState(true);

  const loadViewer = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setViewer(null);
      setLoading(false);
      return;
    }

    const [{ data: userRow }, { data: roleRow }] = await Promise.all([
      supabase.from("users").select("role").eq("id", user.id).single(),
      supabase.from("user_roles").select("role").eq("user_id", user.id).single(),
    ]);

    setViewer({
      id: user.id,
      businessRole: userRow?.role ?? null,
      systemRole: roleRow?.role ?? "user",
    });

    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!mounted) return;
      await loadViewer();
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async () => {
      if (!mounted) return;
      await loadViewer();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const dashboardAllowed = useMemo(() => {
    if (!viewer) return false;
    return (
      viewer.systemRole === "admin" ||
      viewer.businessRole === "leader" ||
      viewer.businessRole === "owner"
    );
  }, [viewer]);

  return { viewer, loading, dashboardAllowed, reloadViewer: loadViewer };
}