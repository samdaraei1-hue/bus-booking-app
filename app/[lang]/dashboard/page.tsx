"use client";

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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (!user) {
        router.push(`/${lang}/login`);
        return;
      }

      const [{ data: userRow }, { data: roleRow }] = await Promise.all([
        supabase.from("users").select("role").eq("id", user.id).single(),
        supabase.from("user_roles").select("role").eq("user_id", user.id).single(),
      ]);

      if (!mounted) return;

      setViewer({
        businessRole: userRow?.role ?? null,
        systemRole: roleRow?.role ?? "user",
      });

      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [lang, router]);

  const allowed = useMemo(() => {
    if (!viewer) return false;
    return (
      viewer.systemRole === "admin" ||
      viewer.businessRole === "leader" ||
      viewer.businessRole === "owner"
    );
  }, [viewer]);

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="h-56 animate-pulse rounded-3xl bg-zinc-100" />
      </main>
    );
  }

  if (!allowed) {
    return null;
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold">
          {t("page.dashboard.title", "داشبورد")}
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          {t("page.dashboard.subtitle", "مدیریت حرفه‌ای سیستم رزرو")}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <button
          onClick={() => router.push(`/${lang}/dashboard/travels`)}
          className="rounded-3xl bg-white p-6 text-start shadow-sm ring-1 ring-zinc-200 transition hover:shadow-lg"
        >
          <div className="text-lg font-bold">{t("page.dashboard.travels", "مدیریت سفرها")}</div>
          <div className="mt-2 text-sm text-zinc-600">
            {t("page.dashboard.travels_desc", "ایجاد، ویرایش و مشاهده سفرها")}
          </div>
        </button>

        <button
          onClick={() => router.push(`/${lang}/dashboard/reservations`)}
          className="rounded-3xl bg-white p-6 text-start shadow-sm ring-1 ring-zinc-200 transition hover:shadow-lg"
        >
          <div className="text-lg font-bold">{t("page.dashboard.reservations", "مدیریت رزروها")}</div>
          <div className="mt-2 text-sm text-zinc-600">
            {t("page.dashboard.reservations_desc", "لیست رزروها، وضعیت‌ها و صندلی‌ها")}
          </div>
        </button>

        <button
          onClick={() => router.push(`/${lang}/dashboard/reports`)}
          className="rounded-3xl bg-white p-6 text-start shadow-sm ring-1 ring-zinc-200 transition hover:shadow-lg"
        >
          <div className="text-lg font-bold">{t("page.dashboard.reports", "گزارش‌ها")}</div>
          <div className="mt-2 text-sm text-zinc-600">
            {t("page.dashboard.reports_desc", "ظرفیت، رزروشده و خالی")}
          </div>
        </button>

        {viewer?.systemRole === "admin" ? (
          <>
            <button
              onClick={() => router.push(`/${lang}/dashboard/users`)}
              className="rounded-3xl bg-white p-6 text-start shadow-sm ring-1 ring-zinc-200 transition hover:shadow-lg"
            >
              <div className="text-lg font-bold">{t("page.dashboard.users", "مدیریت کاربران")}</div>
              <div className="mt-2 text-sm text-zinc-600">
                {t("page.dashboard.users_desc", "نقش‌ها و پروفایل کاربران")}
              </div>
            </button>

            <button
              onClick={() => router.push(`/${lang}/dashboard/translations`)}
              className="rounded-3xl bg-white p-6 text-start shadow-sm ring-1 ring-zinc-200 transition hover:shadow-lg"
            >
              <div className="text-lg font-bold">{t("page.dashboard.translations", "مدیریت ترجمه‌ها")}</div>
              <div className="mt-2 text-sm text-zinc-600">
                {t("page.dashboard.translations_desc", "متن‌های چندزبانه‌ی سایت")}
              </div>
            </button>
          </>
        ) : null}
      </div>
    </main>
  );
}