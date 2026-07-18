"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useT } from "@/lib/translations/useT.client";
import { getTravelTranslations } from "@/lib/translations/getTravelTranslation.client";
import { fetchWithSupabaseAuth } from "@/lib/api/fetchWithSupabaseAuth.client";
import { getSafeSession } from "@/lib/auth/getSafeSession.client";
import { formatMoney } from "@/lib/travelAddons";

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

function renderInstructionText(value: string) {
  return value.split("\n").map((line, lineIndex) => (
    <p key={`${lineIndex}-${line}`} className={lineIndex === 0 ? "" : "mt-2"}>
      {line.split(URL_PATTERN).map((part, index) =>
        /^https?:\/\//.test(part) ? (
          <a
            key={`${lineIndex}-${index}`}
            href={part}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-rose-700 underline underline-offset-2"
          >
            {part}
          </a>
        ) : (
          <span key={`${lineIndex}-${index}`}>{part}</span>
        )
      )}
    </p>
  ));
}

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
  const [paymentInstructions, setPaymentInstructions] = useState("");
  const [baseAmount, setBaseAmount] = useState(0);
  const [addonsAmount, setAddonsAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [addonSelections, setAddonSelections] = useState<
    Array<{
      addon_id: string;
      name: string;
      description: string | null;
      unit_price: number;
      pricing_mode: "per_booking" | "per_participant";
      quantity: number;
      total_price: number;
    }>
  >([]);
  const usesManualPayment = paymentInstructions.trim().length > 0;

  type ReservationAddonRow = {
    addon_id: string;
    name: string;
    description: string | null;
    unit_price: number;
    pricing_mode: "per_booking" | "per_participant";
    quantity: number;
    total_price: number;
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        let nextTravelId = travelId;
        let travelData:
          | {
              id: string;
              name: string | null;
              origin: string | null;
              destination: string | null;
              payment_instructions: string | null;
            }
          | null = null;

        if (reservationId) {
          const { data, error } = await supabase
            .from("reservation_groups")
            .select(
              `
                base_amount,
                addons_amount,
                total_amount,
                addon_selections,
                travel_id,
                travels:travel_id (
                  id,
                  name,
                  origin,
                  destination,
                  payment_instructions
                )
              `
            )
            .eq("id", reservationId)
            .single();

          if (!mounted || error || !data) return;

          nextTravelId = data.travel_id ?? travelId;
          setBaseAmount(Number(data.base_amount ?? 0) || 0);
          setAddonsAmount(Number(data.addons_amount ?? 0) || 0);
          setTotalAmount(Number(data.total_amount ?? 0) || 0);
          const relation = data.travels;
          travelData = (Array.isArray(relation) ? relation[0] : relation) ?? null;

          const { data: reservationAddonRows, error: reservationAddonError } =
            await supabase
              .from("reservation_addons")
              .select(
                "addon_id, name, description, unit_price, pricing_mode, quantity, total_price"
              )
              .eq("reservation_group_id", reservationId)
              .order("created_at", { ascending: true });

          if (!mounted || reservationAddonError) return;

          setAddonSelections(
            (reservationAddonRows?.length
              ? reservationAddonRows
              : data.addon_selections ?? []) as ReservationAddonRow[]
          );
        } else if (travelId) {
          const { data, error } = await supabase
            .from("travels")
            .select("id, name, origin, destination, payment_instructions")
            .eq("id", travelId)
            .single();

          if (!mounted || error || !data) return;
          travelData = data;
        }

        if (!mounted || !nextTravelId || !travelData) return;

        const translated = await getTravelTranslations(nextTravelId, lang);
        if (!mounted) return;

        const translatedRoute = `${translated.origin ?? travelData.origin ?? ""} - ${
          translated.destination ?? travelData.destination ?? ""
        }`
          .replace(/\s+-\s+$/, "")
          .trim();

        setTravelTitle(
          translated.name ?? (translatedRoute || travelData.name || nextTravelId)
        );
        setPaymentInstructions(travelData.payment_instructions ?? "");
      } catch (error) {
        console.error(error);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [lang, reservationId, travelId]);

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

    const warning = (response.data as { warning?: string } | null)?.warning;

    setPaid(true);
    if (warning) {
      setMsg(warning);
    }
    setLoading(false);
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold">{t("page.payment.title")}</h1>
        <p className="mt-2 text-sm text-zinc-600">
          {usesManualPayment
            ? t(
                "page.payment.subtitle_manual",
                "Use the payment instructions below. Your reservation will stay pending until payment is verified."
              )
            : t("page.payment.subtitle")}
        </p>
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
          {reservationId ? (
            <div className="mt-3 grid gap-1 sm:grid-cols-3">
              <div>{t("page.payment.base_amount", "Base amount")}: {formatMoney(baseAmount)}</div>
              <div>{t("page.payment.addons_amount", "Add-ons")}: {formatMoney(addonsAmount)}</div>
              <div className="font-bold text-rose-700">
                {t("page.payment.total_amount", "Total")}: {formatMoney(totalAmount)}
              </div>
            </div>
          ) : null}
        </div>

        {addonSelections.length > 0 ? (
          <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="text-sm font-semibold text-zinc-900">
              {t("page.payment.optional_services", "Optional services")}
            </div>
            <div className="mt-3 space-y-2 text-sm text-zinc-700">
              {addonSelections.map((addon) => (
                <div key={addon.addon_id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-zinc-50 px-3 py-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-zinc-900">{addon.name}</div>
                    {addon.description ? (
                      <div className="text-xs text-zinc-500">{addon.description}</div>
                    ) : null}
                  </div>
                  <div className="text-xs text-zinc-600">
                    {addon.quantity} x {formatMoney(addon.unit_price)} = {formatMoney(addon.total_price)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {usesManualPayment ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-zinc-800">
            <div className="font-semibold text-zinc-900">
              {t("page.payment.instructions_title", "Payment instructions")}
            </div>
            <div className="mt-2 leading-7">
              {renderInstructionText(paymentInstructions)}
            </div>
            <div className="mt-4 rounded-2xl bg-white/80 p-4 text-sm leading-6 text-zinc-700 ring-1 ring-amber-200">
              {t(
                "page.payment.manual_review_notice",
                "After you pay, your reservation stays in awaiting payment status until the payment is verified."
              )}
            </div>
          </div>
        ) : null}

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
            {!usesManualPayment ? (
              <button
                onClick={() => void handlePayment()}
                disabled={loading || !reservationId}
                className="rounded-2xl bg-rose-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                {loading
                  ? t("page.payment.processing")
                  : t("page.payment.pay_sandbox")}
              </button>
            ) : null}

            {usesManualPayment ? (
              <button
                onClick={() => router.push(`/${lang}/my-bookings`)}
                className="rounded-2xl bg-rose-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-rose-700"
              >
                {t("page.payment.back_to_bookings", "Back to my bookings")}
              </button>
            ) : null}

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

