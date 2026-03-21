"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { withTimeout } from "@/lib/async/withTimeout";

export type Viewer = {
  id: string;
  businessRole: string | null;
  systemRole: string | null;
} | null;

let viewerCache: Viewer | undefined;

export function clearViewerCache() {
  viewerCache = null;
}

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
        data: { session },
      } = await withTimeout(
        supabase.auth.getSession(),
        3000,
        "Loading current session timed out"
      );
      const user = session?.user ?? null;

      if (requestId !== requestIdRef.current) return;

      if (!user) {
        viewerCache = null;
        setViewer(null);
        return;
      }

      const [{ data: userRow }, { data: roleRow }] = await withTimeout(
        Promise.all([
          supabase.from("users").select("role").eq("id", user.id).maybeSingle(),
          supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .maybeSingle(),
        ]),
        3000,
        "Loading user roles timed out"
      );

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
      const message =
        error instanceof Error ? error.message : "Failed to load viewer";

      if (!message.toLowerCase().includes("timed out")) {
        console.error("Failed to load viewer", error);
      }

      if (viewerCache === undefined) {
        viewerCache = null;
      }
      setViewer(viewerCache ?? null);
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

    let resumeTimer: ReturnType<typeof setTimeout> | null = null;

    const handleResume = async () => {
      if (!mounted || document.visibilityState === "hidden") return;
      if (resumeTimer) clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => {
        void loadViewer();
      }, 250);
    };

    const handlePageShow = async () => {
      if (!mounted) return;
      if (resumeTimer) clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => {
        void loadViewer();
      }, 250);
    };

    const handleVisibilityChange = async () => {
      if (!mounted || document.visibilityState === "hidden") return;
      await loadViewer();
    };

    window.addEventListener("pageshow", handlePageShow);
    document.addEventListener("visibilitychange", handleResume);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      if (resumeTimer) clearTimeout(resumeTimer);
      window.removeEventListener("pageshow", handlePageShow);
      document.removeEventListener("visibilitychange", handleResume);
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
