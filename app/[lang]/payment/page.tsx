"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useT } from "@/lib/translations/useT.client";
import { getTravelTranslations } from "@/lib/translations/getTravelTranslation.client";
import { fetchWithSupabaseAuth } from "@/lib/api/fetchWithSupabaseAuth.client";
import { getSafeSession } from "@/lib/auth/getSafeSession.client";

export default function PaymentPage() {
  const router = useRouter();
  const routeParams = useParams<{ lang: string }>();
  const lang = routeParams.lang;
  const t = useT(lang);
  const sp = useSearchParams();

  const reservationId = sp.get("reservation") ?? "";
  const travelId = sp.get("travel") ?? "";

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [travelTitle, setTravelTitle] = useState("");

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!travelId) return;

      const { data, error } = await supabase
        .from("travels")
        .select("id, name, origin, destination")
        .eq("id", travelId)
        .single();

      if (!mounted || error || !data) return;

      const translated = await getTravelTranslations(travelId, lang);
      if (!mounted) return;

      const translatedRoute = `${translated.origin ?? data.origin ?? ""} - ${
        translated.destination ?? data.destination ?? ""
      }`
        .replace(/\s+-\s+$/, "")
        .trim();

      setTravelTitle(
        translated.name ?? (translatedRoute || data.name || travelId)
      );
    })();

    return () => {
      mounted = false;
    };
  }, [lang, travelId]);

  const handlePayment = async () => {
    setLoading(true);
    setMsg(null);

    const { session } = await getSafeSession();
    const user = session?.user ?? null;

    if (!user) {
      router.push(`/${lang}/login`);
      return;
    }

    if (!reservationId) {
      setMsg(t("page.payment.reservation_not_found", "Reservation not found."));
      setLoading(false);
      return;
    }

    const response = await fetchWithSupabaseAuth(
      `/api/reservations/${encodeURIComponent(reservationId)}/complete-payment`,
      {
        method: "POST",
      }
    );

    if (!response.ok) {
      setMsg(
        (response.data as { error?: string } | null)?.error ??
          "Failed to complete payment."
      );
      setLoading(false);
      return;
    }

    setPaid(true);
    setLoading(false);
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold">{t("page.payment.title")}</h1>
        <p className="mt-2 text-sm text-zinc-600">{t("page.payment.subtitle")}</p>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
        <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-700">
          <div>
            <span className="font-semibold">
              {t("page.payment.travel_label", "Travel")}:
            </span>{" "}
            {travelTitle || "-"}
          </div>
          <div className="mt-1">
            <span className="font-semibold">
              {t("page.payment.reservation_label", "Reservation")}:
            </span>{" "}
            {reservationId || "-"}
          </div>
        </div>

        {paid ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="font-bold text-emerald-800">
              {t("page.payment.paid_success")}
            </div>
            <button
              onClick={() => router.push(`/${lang}/profile`)}
              className="mt-4 rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
            >
              {t("page.payment.go_profile")}
            </button>
          </div>
        ) : (
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => void handlePayment()}
              disabled={loading || !travelId || !reservationId}
              className="rounded-2xl bg-rose-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              {loading ? t("page.payment.processing") : t("page.payment.pay_sandbox")}
            </button>

            <button
              onClick={() => router.back()}
              className="rounded-2xl bg-zinc-100 px-6 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-200"
            >
              {t("common.back")}
            </button>
          </div>
        )}

        {msg ? <div className="mt-4 text-sm text-rose-600">{msg}</div> : null}
      </div>
    </main>
  );
}
