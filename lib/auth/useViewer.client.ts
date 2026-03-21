"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export type Viewer = {
  id: string;
  businessRole: string | null;
  systemRole: string | null;
} | null;

let viewerCache: Viewer | undefined;

export function useViewer() {
  const [viewer, setViewer] = useState<Viewer>(viewerCache ?? null);
  const [loading, setLoading] = useState(viewerCache === undefined);
  const requestIdRef = useRef(0);

  const loadViewer = async () => {
    const requestId = ++requestIdRef.current;
    if (viewerCache === undefined) {
      setLoading(true);
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (requestId !== requestIdRef.current) return;

      if (!user) {
        viewerCache = null;
        setViewer(null);
        return;
      }

      const [{ data: userRow }, { data: roleRow }] = await Promise.all([
        supabase.from("users").select("role").eq("id", user.id).maybeSingle(),
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      if (requestId !== requestIdRef.current) return;

      const nextViewer = {
        id: user.id,
        businessRole: userRow?.role ?? null,
        systemRole: roleRow?.role ?? "user",
      };
      viewerCache = nextViewer;
      setViewer(nextViewer);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      console.error("Failed to load viewer", error);
    } finally {
      if (requestId !== requestIdRef.current) return;
      setLoading(false);
    }
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
