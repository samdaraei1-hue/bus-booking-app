"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useT } from "@/lib/translations/useT.client";
import { fetchWithSupabaseAuth } from "@/lib/api/fetchWithSupabaseAuth.client";
import { getSeatLabelValue } from "@/lib/seatLabels";

type ReservationItemForm = {
  id: string;
  layout_seat_id: string | null;
  label: string;
  passenger_name: string;
  passenger_email: string;
  passenger_phone: string;
};

export default function ReservationDetailsPage() {
  const params = useParams<{ lang: string }>();
  const lang = params.lang;
  const router = useRouter();
  const sp = useSearchParams();
  const reservationId = sp.get("reservation") ?? "";
  const t = useT(lang);

  const [items, setItems] = useState<ReservationItemForm[]>([]);
  const [travelId, setTravelId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!reservationId) {
        setLoading(false);
        setMsg(t("page.reservation_details.not_found", "Reservation not found."));
        return;
      }

      setLoading(true);
      setMsg(null);

      try {
        const { data, error } = await supabase
          .from("reservation_items")
          .select(
            `
              id,
          layout_seat_id,
          passenger_name,
              passenger_email,
              passenger_phone,
              layout_seats:layout_seat_id(label, seat_key),
              reservation_groups:reservation_group_id(travel_id, status)
            `
          )
          .eq("reservation_group_id", reservationId);

        if (!mounted) return;
        if (error) throw error;

        const rows = (data ?? []) as Array<{
          id: string;
          layout_seat_id: string | null;
          passenger_name: string | null;
          passenger_email: string | null;
          passenger_phone: string | null;
          layout_seats:
            | { label?: string | null; seat_key?: string | null }
            | Array<{ label?: string | null; seat_key?: string | null }>;
          reservation_groups: Array<{ travel_id: string; status: string }>;
        }>;

        setItems(
          rows.map((row, index) => ({
            id: row.id,
            layout_seat_id: row.layout_seat_id,
            label:
              getSeatLabelValue(row.layout_seats) ||
              `${t("page.reservation_details.participant", "Participant")} ${index + 1}`,
            passenger_name: row.passenger_name ?? "",
            passenger_email: row.passenger_email ?? "",
            passenger_phone: row.passenger_phone ?? "",
          }))
        );
        setTravelId(rows[0]?.reservation_groups?.[0]?.travel_id ?? "");
      } catch (error) {
        console.error(error);
        setMsg(
          error instanceof Error
            ? error.message
            : t(
                "page.reservation_details.load_failed",
                "Failed to load reservation details"
              )
        );
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [reservationId, t]);

  const canContinue = useMemo(
    () =>
      items.length > 0 &&
      items.every(
        (item) =>
          item.passenger_name.trim() &&
          item.passenger_phone.trim()
      ),
    [items]
  );

  const updateItem = (
    itemId: string,
    field: "passenger_name" | "passenger_email" | "passenger_phone",
    value: string
  ) => {
    setItems((current) =>
      current.map((item) =>
        item.id === itemId ? { ...item, [field]: value } : item
      )
    );
  };

  const saveAndContinue = async () => {
    setSaving(true);
    setMsg(null);

    try {
      const hasInvalidPassenger = items.some(
        (item) => !item.passenger_name.trim() || !item.passenger_phone.trim()
      );

      if (hasInvalidPassenger) {
        setMsg(
          t(
            "page.reservation_details.required_error",
            "Participant name and phone are required for every selected item."
          )
        );
        return;
      }

      const response = await fetchWithSupabaseAuth(
        `/api/reservations/${encodeURIComponent(reservationId)}/passengers`,
        {
          method: "POST",
          body: JSON.stringify({
            items: items.map((item) => ({
              id: item.id,
              passenger_name: item.passenger_name,
              passenger_email: item.passenger_email,
              passenger_phone: item.passenger_phone,
            })),
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          (response.data as { error?: string } | null)?.error ??
            "Failed to save participant information"
        );
      }

      router.push(
        `/${lang}/payment?reservation=${encodeURIComponent(
          reservationId
        )}&travel=${encodeURIComponent(travelId)}`
      );
    } catch (error) {
      console.error(error);
        setMsg(
          error instanceof Error
            ? error.message
            : t(
                "page.reservation_details.save_failed",
                "Failed to save participant information"
              )
        );
    } finally {
      setSaving(false);
    }
  };

  const goBackToSeatMap = () => {
    if (!travelId) {
      router.back();
      return;
    }

    router.push(
      `/${lang}/seat-map?travel=${encodeURIComponent(
        travelId
      )}&reservation=${encodeURIComponent(reservationId)}&view=1`
    );
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="h-72 animate-pulse rounded-3xl bg-zinc-100" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold">
          {t("page.reservation_details.title", "Participant details")}
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          {t(
            "page.reservation_details.subtitle",
            "Enter participant details for each selected item before payment."
          )}
        </p>
      </div>

      <div className="space-y-4">
        {items.map((item) => (
          <section
            key={item.id}
            className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200"
          >
            <h2 className="text-lg font-bold text-zinc-900">
              {item.layout_seat_id
                ? `${t("page.reservation_details.seat_number", "Seat Number")} ${item.label || "-"}`
                : item.label}
            </h2>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <input
                value={item.passenger_name}
                onChange={(event) =>
                  updateItem(item.id, "passenger_name", event.target.value)
                }
                placeholder={t(
                  "page.reservation_details.passenger_name",
                  "Participant name *"
                )}
                className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none ring-rose-200 focus:ring-4"
              />
              <input
                value={item.passenger_email}
                onChange={(event) =>
                  updateItem(item.id, "passenger_email", event.target.value)
                }
                placeholder={t(
                  "page.reservation_details.passenger_email",
                  "Participant email"
                )}
                className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none ring-rose-200 focus:ring-4"
              />
              <input
                value={item.passenger_phone}
                onChange={(event) =>
                  updateItem(item.id, "passenger_phone", event.target.value)
                }
                placeholder={t(
                  "page.reservation_details.passenger_phone",
                  "Participant phone *"
                )}
                className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none ring-rose-200 focus:ring-4"
              />
            </div>
          </section>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={goBackToSeatMap}
          disabled={saving}
          className="rounded-2xl bg-zinc-100 px-6 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-200"
        >
          {t("common.back", "Back")}
        </button>
        <button
          type="button"
          disabled={!canContinue || saving}
          onClick={() => void saveAndContinue()}
          className="rounded-2xl bg-rose-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {saving
            ? t("page.reservation_details.saving", "Saving...")
            : t(
                "page.reservation_details.continue_payment",
                "Continue to payment"
              )}
        </button>
      </div>

      {msg ? <div className="mt-4 text-sm text-rose-600">{msg}</div> : null}
    </main>
  );
}
