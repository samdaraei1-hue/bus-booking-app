"use client";

import React from "react";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useT } from "@/lib/translations/useT.client";

type Viewer = {
  businessRole: string | null;
  systemRole: string | null;
} | null;

export default function DashboardPage() {
  const params = useParams<{ lang: string }>();
  const lang = params.lang;
  const router = useRouter();
  const t = useT(lang);

  const [viewer, setViewer] = useState<Viewer>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const user = session?.user ?? null;

        if (!mounted) return;

        if (!user) {
          router.replace(`/${lang}/login`);
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

        if (!mounted) return;

        setViewer({
          businessRole: userRow?.role ?? null,
          systemRole: roleRow?.role ?? "user",
        });
      } catch (err) {
        console.error("Dashboard error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [lang, router]);

  const allowed = useMemo(() => {
    const allowedRoles = ["admin", "leader", "owner", "driver"];
    if (!viewer) return false;

    const systemRole = viewer.systemRole ?? "";
    const businessRole = viewer.businessRole ?? "";

    return (
      allowedRoles.includes(systemRole) || allowedRoles.includes(businessRole)
    );
  }, [viewer]);

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="h-56 animate-pulse rounded-3xl bg-zinc-100" />
      </main>
    );
  }

  if (!allowed) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-zinc-200">
          <h1 className="text-2xl font-bold text-red-600">دسترسی غیرمجاز</h1>
          <p className="mt-2 text-sm text-zinc-600">
            شما اجازه دسترسی به این صفحه را ندارید.
          </p>
        </div>
      </main>
    );
  }

  const cardClass =
    "rounded-3xl bg-white p-5 text-start shadow-sm ring-1 ring-zinc-200 transition hover:shadow-lg sm:p-6";

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold sm:text-3xl">
          {t("page.dashboard.title", "Dashboard")}
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          {t("page.dashboard.subtitle", "Professional booking system management")}
        </p>
      </div>

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
        <button
          onClick={() => router.push(`/${lang}/dashboard/travels`)}
          className={cardClass}
        >
          <div className="text-lg font-bold">
            {t("page.dashboard.travels", "Manage Trips")}
          </div>
          <div className="mt-2 text-sm text-zinc-600">
            {t("page.dashboard.travels_desc", "Create, edit, and view trips")}
          </div>
        </button>

        <button
          onClick={() => router.push(`/${lang}/dashboard/reservations`)}
          className={cardClass}
        >
          <div className="text-lg font-bold">
            {t("page.dashboard.reservations", "Manage Reservations")}
          </div>
          <div className="mt-2 text-sm text-zinc-600">
            {t("page.dashboard.reservations_desc", "Bookings, statuses, and seats")}
          </div>
        </button>

        <button
          onClick={() => router.push(`/${lang}/dashboard/reports`)}
          className={cardClass}
        >
          <div className="text-lg font-bold">
            {t("page.dashboard.reports", "Reports")}
          </div>
          <div className="mt-2 text-sm text-zinc-600">
            {t("page.dashboard.reports_desc", "Capacity, booked, and free seats")}
          </div>
        </button>

        {viewer?.systemRole === "admin" ? (
          <>
            <button
              onClick={() => router.push(`/${lang}/dashboard/users`)}
              className={cardClass}
            >
              <div className="text-lg font-bold">
                {t("page.dashboard.users", "Manage Users")}
              </div>
              <div className="mt-2 text-sm text-zinc-600">
                {t("page.dashboard.users_desc", "Roles and user profiles")}
              </div>
            </button>

            <button
              onClick={() => router.push(`/${lang}/dashboard/translations`)}
              className={cardClass}
            >
              <div className="text-lg font-bold">
                {t("page.dashboard.translations", "Manage Translations")}
              </div>
              <div className="mt-2 text-sm text-zinc-600">
                {t("page.dashboard.translations_desc", "Multilingual site texts")}
              </div>
            </button>
          </>
        ) : null}
      </div>
    </main>
  );
}
