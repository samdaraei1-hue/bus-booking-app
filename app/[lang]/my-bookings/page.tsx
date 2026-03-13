"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useT } from "@/lib/translations/useT.client";

type BookingRow = {
  id: string;
  seat_no: number;
  status: string;
  travel_id: string;
  travels: {
    name: string;
    origin: string;
    destination: string;
    departure_at: string;
    return_at: string;
  }[];
};

export default function MyBookingsPage() {
  const params = useParams<{ lang: string }>();
  const lang = params.lang;
  const router = useRouter();
  const t = useT(lang);

  const [items, setItems] = useState<BookingRow[]>([]);
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

      const { data, error } = await supabase
        .from("bus_seats_reservation")
        .select(`
          id,
          seat_no,
          status,
          travel_id,
          travels (
            name,
            origin,
            destination,
            departure_at,
            return_at
          )
        `)
        .eq("booker_user_id", user.id)
        .order("seat_no", { ascending: true });

      if (!mounted) return;

      if (error) {
        setItems([]);
      } else {
        setItems((data ?? []) as BookingRow[]);
      }

      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [lang, router]);

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="h-56 animate-pulse rounded-3xl bg-zinc-100" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold">
          {t("page.my_bookings.title", "رزروهای من")}
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          {t("page.my_bookings.subtitle", "لیست سفرها و صندلی‌های رزروشده‌ی شما")}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-zinc-200">
          <div className="text-lg font-bold">
            {t("page.my_bookings.empty_title", "هنوز رزروی ثبت نشده")}
          </div>
          <p className="mt-2 text-sm text-zinc-600">
            {t("page.my_bookings.empty_text", "بعد از رزرو سفر، اطلاعات آن اینجا نمایش داده می‌شود.")}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {items.map((row) => (
            <div
              key={row.id}
              className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-zinc-900">
                     {row.travels?.[0]?.origin} → {row.travels?.[0]?.destination}
                  </h2>
                  <p className="mt-2 text-sm text-zinc-600">
                    {t("page.my_bookings.seat", "صندلی")}: {row.seat_no}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600">
                    {t("page.my_bookings.status", "وضعیت")}: {row.status}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => router.push(`/${lang}/travels/${row.travel_id}`)}
                  className="rounded-2xl bg-zinc-100 px-5 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-200"
                >
                  {t("common.view", "مشاهده")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}