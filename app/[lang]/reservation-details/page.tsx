"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useT } from "@/lib/translations/useT.client";
import { fetchWithSupabaseAuth } from "@/lib/api/fetchWithSupabaseAuth.client";
import { getSeatLabelValue } from "@/lib/seatLabels";
import { formatMoney, parseTravelAddons, type TravelAddonDefinition } from "@/lib/travelAddons";

type ReservationItemForm = {
  id: string;
  layout_seat_id: string | null;
  label: string;
  passenger_name: string;
  passenger_email: string;
  passenger_phone: string;
};

type ReservationAddonForm = {
  addon_id: string;
  name: string;
  description: string | null;
  unit_price: number;
  pricing_mode: "per_booking" | "per_participant";
  quantity: number;
};

type ReservationGroupRow = {
  travel_id: string;
  status?: string;
  base_amount: number | null;
  addons_amount: number | null;
  total_amount: number | null;
  addon_selections:
    | Array<{
        addon_id: string;
        name: string;
        description: string | null;
        unit_price: number;
        pricing_mode: "per_booking" | "per_participant";
        quantity: number;
        total_price: number;
      }>
    | null;
  travels:
    | {
        id: string;
        name: string | null;
        origin: string | null;
        destination: string | null;
        price: number | string;
        addons: unknown;
      }
    | Array<{
        id: string;
        name: string | null;
        origin: string | null;
        destination: string | null;
        price: number | string;
        addons: unknown;
      }>
    | null;
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
  const [travelPrice, setTravelPrice] = useState(0);
  const [travelAddons, setTravelAddons] = useState<TravelAddonDefinition[]>([]);
  const [addonSelections, setAddonSelections] = useState<
    Record<string, number>
  >({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

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

        const reservationGroup = rows[0]?.reservation_groups?.[0] ?? null;
        const nextTravelId = reservationGroup?.travel_id ?? "";
        setTravelId(nextTravelId);

        if (nextTravelId) {
          const { data: reservationGroupData, error: reservationGroupError } =
            await supabase
              .from("reservation_groups")
              .select(
                `
                  travel_id,
                  base_amount,
                  addons_amount,
                  total_amount,
                  addon_selections,
                  travels:travel_id (
                    id,
                    name,
                    origin,
                    destination,
                    price,
                    addons
                  )
                `
              )
              .eq("id", reservationId)
              .single();

          if (!mounted) return;
          if (reservationGroupError) throw reservationGroupError;

          const row = reservationGroupData as unknown as ReservationGroupRow;
          const travelRelation = Array.isArray(row.travels)
            ? row.travels[0]
            : row.travels;

          setTravelPrice(Number(travelRelation?.price ?? 0) || 0);
          setTravelAddons(parseTravelAddons(travelRelation?.addons));

          const nextSelections = Object.fromEntries(
            (row.addon_selections ?? []).map((selection) => [
              selection.addon_id,
              selection.quantity,
            ])
          );
          setAddonSelections(nextSelections);
        }
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
      privacyAccepted &&
      items.every(
        (item) =>
          item.passenger_name.trim() &&
          item.passenger_phone.trim()
      ),
    [items, privacyAccepted]
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

  const updateAddonSelection = (addonId: string, quantity: number) => {
    setAddonSelections((current) => {
      if (quantity <= 0) {
        const next = { ...current };
        delete next[addonId];
        return next;
      }

      return {
        ...current,
        [addonId]: quantity,
      };
    });
  };

  const selectedAddonRows = useMemo(
    () =>
      travelAddons
        .filter((addon) => addon.is_active)
        .filter((addon) => (addonSelections[addon.id] ?? 0) > 0)
        .map((addon) => {
          const quantity =
            addon.pricing_mode === "per_participant"
              ? Math.max(1, Math.min(items.length, addonSelections[addon.id] ?? 0))
              : 1;

          return {
            addon_id: addon.id,
            name: addon.name,
            description: addon.description,
            unit_price: addon.price,
            pricing_mode: addon.pricing_mode,
            quantity,
            total_price: addon.price * quantity,
          } satisfies ReservationAddonForm & { total_price: number };
        }),
    [addonSelections, items.length, travelAddons]
  );

  const baseAmount = useMemo(() => travelPrice * items.length, [items.length, travelPrice]);
  const addonsAmount = useMemo(
    () => selectedAddonRows.reduce((total, addon) => total + addon.total_price, 0),
    [selectedAddonRows]
  );
  const totalAmount = baseAmount + addonsAmount;

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

      if (!privacyAccepted) {
        setMsg(
          t(
            "page.reservation_details.privacy_required",
            "Please confirm the privacy notice before continuing."
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
            addons: selectedAddonRows.map((addon) => ({
              addonId: addon.addon_id,
              quantity: addon.quantity,
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

      {travelAddons.length > 0 ? (
        <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-zinc-900">
                {t("page.reservation_details.optional_services", "Optional services")}
              </h2>
              <p className="mt-1 text-sm text-zinc-600">
                {t(
                  "page.reservation_details.optional_services_desc",
                  "Choose any extras you want to add before payment."
                )}
              </p>
            </div>

            <div className="rounded-2xl bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
              <div>
                {t("page.payment.base_amount", "Base amount")}:{" "}
                <span className="font-semibold">{formatMoney(baseAmount)}</span>
              </div>
              <div className="mt-1">
                {t("page.payment.addons_amount", "Add-ons")}:{" "}
                <span className="font-semibold">{formatMoney(addonsAmount)}</span>
              </div>
              <div className="mt-1 text-base font-bold text-rose-700">
                {t("page.payment.total_amount", "Total")}: {formatMoney(totalAmount)}
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {travelAddons
              .filter((addon) => addon.is_active)
              .map((addon) => {
                const selectedQuantity = addonSelections[addon.id] ?? 0;
                const selected = selectedQuantity > 0;
                const maxQuantity =
                  addon.pricing_mode === "per_participant" ? items.length : 1;

                return (
                  <div
                    key={addon.id}
                    className={[
                      "rounded-2xl border p-4 transition",
                      selected ? "border-rose-200 bg-rose-50" : "border-zinc-200 bg-white",
                    ].join(" ")}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <label className="flex min-w-0 flex-1 items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={(event) =>
                            updateAddonSelection(
                              addon.id,
                              event.target.checked
                                ? addon.pricing_mode === "per_participant"
                                  ? items.length
                                  : 1
                                : 0
                            )
                          }
                          className="mt-1 h-4 w-4 rounded border-zinc-300 text-rose-600 focus:ring-rose-500"
                        />
                        <span className="min-w-0">
                          <span className="block font-semibold text-zinc-900">
                            {addon.name}
                          </span>
                          {addon.description ? (
                            <span className="mt-1 block text-sm text-zinc-600">
                              {addon.description}
                            </span>
                          ) : null}
                        </span>
                      </label>

                      <div className="text-sm text-zinc-700">
                        <div className="font-semibold text-zinc-900">
                          {formatMoney(addon.price)}{" "}
                          {addon.pricing_mode === "per_participant"
                            ? t("travels.per_participant", "per participant")
                            : t("travels.per_booking", "per booking")}
                        </div>
                        {selected ? (
                          <div className="mt-1 text-xs text-zinc-500">
                            {t("page.payment.line_total", "Line total")}:{" "}
                            {formatMoney(addon.price * selectedQuantity)}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {selected && addon.pricing_mode === "per_participant" ? (
                      <div className="mt-4 max-w-xs">
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          {t("page.reservation_details.quantity", "Quantity")}
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={maxQuantity}
                          value={selectedQuantity}
                          onChange={(event) =>
                            updateAddonSelection(
                              addon.id,
                              Math.max(
                                1,
                                Math.min(maxQuantity, Number(event.target.value) || 0)
                              )
                            )
                          }
                          className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none ring-rose-200 focus:ring-4"
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })}
          </div>
        </section>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <label className="flex max-w-2xl items-start gap-3 text-sm text-zinc-600">
          <input
            type="checkbox"
            checked={privacyAccepted}
            onChange={(event) => setPrivacyAccepted(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-zinc-300 text-rose-600 focus:ring-rose-500"
          />
          <span>
            {t(
              "page.reservation_details.privacy_acknowledgement",
              "I have read the privacy notice and understand that participant data will be processed for reservation management."
            )}{" "}
            <Link
              href={`/${lang}/privacy`}
              className="font-semibold text-rose-700 underline underline-offset-2"
            >
              {t("page.reservation_details.privacy_link", "Read privacy notice")}
            </Link>
          </span>
        </label>
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
