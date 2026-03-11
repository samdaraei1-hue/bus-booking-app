"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import SeatGrid from "@/components/travel/SeatGrid";
import { useT } from "@/lib/translations/useT.client";

export default function SeatMapPage() {
  const router = useRouter();
  const routeParams = useParams<{ lang: string }>();
  const lang = routeParams.lang;
  const t = useT(lang);

  const sp = useSearchParams();
  const travelId = sp.get("travel") ?? "";

  const [selected, setSelected] = useState<number[]>([]);
  const [reserved, setReserved] = useState<number[]>([]);
  const [totalSeats, setTotalSeats] = useState(40);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!travelId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setMsg(null);

      const { data: seatRows, error: seatsError } = await supabase
        .from("travel_bus_seats")
        .select("seat_no")
        .eq("travel_id", travelId)
        .order("seat_no", { ascending: true });

      const { data: reservationRows, error: reservationsError } = await supabase
        .from("bus_seats_reservation")
        .select("seat_no, status")
        .eq("travel_id", travelId)
        .in("status", ["pre", "paid", "Pre-Reservation", "Paid"]);

      if (!mounted) return;

      if (seatsError) {
        setMsg(seatsError.message);
      } else {
        const seatNumbers = (seatRows ?? []).map((s) => s.seat_no);
        if (seatNumbers.length > 0) {
          setTotalSeats(Math.max(...seatNumbers));
        }
      }

      if (reservationsError) {
        setMsg(reservationsError.message);
      } else {
        const reservedSeats = (reservationRows ?? []).map((r) => r.seat_no);
        setReserved(reservedSeats);
      }

      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [travelId]);

  const canContinue = selected.length > 0 && !!travelId;
  const selectedSeatsLabel = useMemo(() => selected.join(","), [selected]);

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="h-72 animate-pulse rounded-3xl bg-zinc-100" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold">{t("page.seat_map.title")}</h1>
        <p className="mt-2 text-sm text-zinc-600">
          {travelId
            ? `${t("page.seat_map.subtitle_with_travel")} ${travelId}`
            : t("page.seat_map.subtitle_without_travel")}
        </p>
        {msg ? <p className="mt-2 text-sm text-rose-600">{msg}</p> : null}
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm font-semibold text-zinc-700">
            {t("page.seat_map.bus_map")}
          </div>
          <div className="text-sm text-zinc-600">
            {t("page.seat_map.selected_count")}:{" "}
            <span className="font-bold">{selected.length}</span>
          </div>
        </div>

        <SeatGrid total={totalSeats} reserved={reserved} onChange={setSelected} />

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-2xl bg-zinc-100 px-6 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-200"
          >
            {t("common.back")}
          </button>

          <button
            type="button"
            disabled={!canContinue}
            onClick={() =>
              router.push(
                `/${lang}/payment?travel=${encodeURIComponent(
                  travelId
                )}&seats=${encodeURIComponent(selectedSeatsLabel)}`
              )
            }
            className={
              "rounded-2xl px-6 py-3 text-sm font-bold text-white shadow-lg transition " +
              (canContinue
                ? "bg-rose-600 hover:bg-rose-700"
                : "cursor-not-allowed bg-zinc-300")
            }
          >
            {t("page.seat_map.continue_payment")}
          </button>
        </div>
      </div>
    </main>
  );
}