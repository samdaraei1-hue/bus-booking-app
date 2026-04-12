"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useT } from "@/lib/translations/useT.client";
import { withTimeout } from "@/lib/async/withTimeout";
import { getBookingMode, getOfferingKind, type BookingMode, type OfferingKind } from "@/lib/offerings";

type SelectUser = {
  id: string;
  name: string | null;
};

type TeamRow = {
  colleague_id: string;
  role: "leader" | "driver";
};

type TravelRow = {
  id: string;
  name: string;
  type: "travel" | "event" | null;
  kind: string | null;
  booking_mode: string | null;
  max_capacity: number | null;
  origin: string;
  destination: string | null;
  departure_at: string | null;
  return_at: string | null;
  price: number | string;
  description: string | null;
  image_url: string | null;
};

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function toDateTimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export default function EditTravelPage() {
  const router = useRouter();
  const params = useParams<{ lang: string; id: string }>();
  const lang = params.lang;
  const travelId = params.id;
  const dir = lang === "fa" ? "rtl" : "ltr";
  const t = useT(lang);

  const [users, setUsers] = useState<SelectUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState<"travel" | "event">("travel");
  const [kind, setKind] = useState<OfferingKind>("trip");
  const [bookingMode, setBookingMode] = useState<BookingMode>("seat_map");
  const [maxCapacity, setMaxCapacity] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [departureAt, setDepartureAt] = useState("");
  const [returnAt, setReturnAt] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [leaders, setLeaders] = useState<string[]>([]);
  const [drivers, setDrivers] = useState<string[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const isEvent = type === "event" || kind === "event";
  const isSeatMapBooking = bookingMode === "seat_map";

  useEffect(() => {
    let mounted = true;

    const loadPage = async () => {
      setLoading(true);
      setErrorMsg(null);

      try {
        const [{ data: usersData }, { data: travelData, error: travelError }, { data: teamData, error: teamError }] =
          await Promise.all([
            supabase.from("users").select("id,name"),
            supabase.from("travels").select("*").eq("id", travelId).single(),
            supabase
              .from("travel_teams")
              .select("colleague_id, role")
              .eq("travel_id", travelId),
          ]);

        if (!mounted) return;
        if (travelError) throw travelError;
        if (teamError) throw teamError;

        const travel = travelData as TravelRow;
        const teams = (teamData ?? []) as TeamRow[];

        setUsers((usersData ?? []) as SelectUser[]);
        setName(travel.name ?? "");
        setType(travel.type === "event" ? "event" : "travel");
        setKind(getOfferingKind(travel.kind ?? travel.type));
        setBookingMode(getBookingMode(travel.booking_mode));
        setMaxCapacity(travel.max_capacity ? String(travel.max_capacity) : "");
        setOrigin(travel.origin ?? "");
        setDestination(travel.destination ?? "");
        setDepartureAt(toDateTimeLocal(travel.departure_at));
        setReturnAt(toDateTimeLocal(travel.return_at));
        setPrice(String(travel.price ?? ""));
        setDescription(travel.description ?? "");
        setCurrentImageUrl(travel.image_url ?? null);
        setLeaders(
          teams.filter((item) => item.role === "leader").map((item) => item.colleague_id)
        );
        setDrivers(
          teams.filter((item) => item.role === "driver").map((item) => item.colleague_id)
        );
      } catch (error) {
        console.error(error);
        setErrorMsg(
          error instanceof Error ? error.message : t("error.load_failed", "Failed to load item")
        );
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    void loadPage();

    return () => {
      mounted = false;
    };
  }, [t, travelId]);

  const addLeader = () => setLeaders((current) => [...current, ""]);
  const updateLeader = (index: number, value: string) => {
    setLeaders((current) => current.map((item, i) => (i === index ? value : item)));
  };
  const removeLeader = (index: number) => {
    setLeaders((current) => current.filter((_, i) => i !== index));
  };

  const addDriver = () => setDrivers((current) => [...current, ""]);
  const updateDriver = (index: number, value: string) => {
    setDrivers((current) => current.map((item, i) => (i === index ? value : item)));
  };
  const removeDriver = (index: number) => {
    setDrivers((current) => current.filter((_, i) => i !== index));
  };

  const uploadImage = async () => {
    if (!imageFile) return currentImageUrl;

    const path = `travels/${Date.now()}_${sanitizeFileName(imageFile.name)}`;
    const { error } = await withTimeout(
      supabase.storage.from("trip-images").upload(path, imageFile, {
        cacheControl: "3600",
        upsert: false,
      }),
      15000,
      "Uploading image to Supabase Storage timed out"
    );

    if (error) {
      console.error(error);
      throw error;
    }

    const { data } = supabase.storage.from("trip-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const saveTravel = async () => {
    if (!name || !origin || !departureAt) {
      setErrorMsg(
        t(
          "error.missing_fields",
          "Please fill in the required fields (Name, Origin, Departure)"
        )
      );
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      const imageUrl = await uploadImage();

      const { error: updateError } = await supabase
        .from("travels")
        .update({
          name,
          type,
          kind,
          booking_mode: bookingMode,
          max_capacity: isSeatMapBooking ? null : Number(maxCapacity) || null,
          origin,
          destination: isEvent ? null : destination,
          departure_at: departureAt || null,
          return_at: returnAt || null,
          price: price ? parseFloat(price) : 0,
          description,
          image_url: imageUrl,
        })
        .eq("id", travelId);

      if (updateError) throw updateError;

      const teamRows = [
        ...leaders
          .filter(Boolean)
          .map((colleague_id) => ({ travel_id: travelId, colleague_id, role: "leader" as const })),
        ...drivers
          .filter(Boolean)
          .map((colleague_id) => ({ travel_id: travelId, colleague_id, role: "driver" as const })),
      ];

      const { error: deleteTeamError } = await supabase
        .from("travel_teams")
        .delete()
        .eq("travel_id", travelId);

      if (deleteTeamError) throw deleteTeamError;

      if (teamRows.length > 0) {
        const { error: teamError } = await supabase.from("travel_teams").insert(teamRows);
        if (teamError) {
          throw new Error(
            `${t("travels.team_save_failed", "Item saved, but failed to save team:")} ${teamError.message}`
          );
        }
      }

      router.push(`/${lang}/dashboard/travels`);
    } catch (error) {
      console.error(error);
      setErrorMsg(error instanceof Error ? error.message : t("error.save_failed", "Failed to save item"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div dir={dir} className="flex min-h-screen justify-center bg-zinc-50 py-10">
        <div className="h-96 w-full max-w-xl animate-pulse rounded-3xl bg-zinc-100" />
      </div>
    );
  }

  return (
    <div dir={dir} className="flex min-h-screen justify-center bg-zinc-50 py-10">
      <div className="w-full max-w-xl rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="mb-8 text-start text-2xl font-semibold">
          {isEvent
            ? t("event.edit", "Edit program")
            : t("travels.edit", "Edit travel")}
        </h1>

        <div className="space-y-6">
          <div>
            <label htmlFor="type" className="mb-1 block text-sm text-zinc-600">
              {t("travels.type", "Type")}
            </label>
            <select
              id="type"
              className="w-full rounded-xl border border-zinc-200 p-3"
              value={type}
              onChange={(event) => {
                const nextType = event.target.value as "travel" | "event";
                setType(nextType);
                if (nextType === "event" && kind === "trip") setKind("event");
                if (nextType === "travel" && kind === "event") setKind("trip");
              }}
            >
              <option value="travel">{t("travel.type.travel", "Travel")}</option>
              <option value="event">{t("travel.type.event", "Event")}</option>
            </select>
          </div>

          <div>
            <label htmlFor="kind" className="mb-1 block text-sm text-zinc-600">
              {t("travels.kind", "Category")}
            </label>
            <select
              id="kind"
              className="w-full rounded-xl border border-zinc-200 p-3"
              value={kind}
              onChange={(event) => setKind(event.target.value as OfferingKind)}
            >
              <option value="trip">{t("travel.type.travel", "Trip")}</option>
              <option value="event">{t("travel.type.event", "Event")}</option>
              <option value="hiking">{t("travel.type.hiking", "Hiking")}</option>
              <option value="walking">{t("travel.type.walking", "Walking")}</option>
              <option value="camping">{t("travel.type.camping", "Camping")}</option>
              <option value="mixed_trip">{t("travel.type.mixed_trip", "Mixed trip")}</option>
              <option value="custom">{t("travel.type.custom", "Program")}</option>
            </select>
          </div>

          <div>
            <label htmlFor="booking-mode" className="mb-1 block text-sm text-zinc-600">
              {t("travels.booking_mode", "Booking mode")}
            </label>
            <select
              id="booking-mode"
              className="w-full rounded-xl border border-zinc-200 p-3"
              value={bookingMode}
              onChange={(event) => setBookingMode(event.target.value as BookingMode)}
            >
              <option value="seat_map">
                {t("travels.booking_mode_seat_map", "Seat map")}
              </option>
              <option value="capacity_only">
                {t("travels.booking_mode_capacity_only", "Capacity only")}
              </option>
            </select>
          </div>

          {!isSeatMapBooking ? (
            <div>
              <label htmlFor="max-capacity" className="mb-1 block text-sm text-zinc-600">
                {t("travels.max_capacity", "Maximum capacity")}
              </label>
              <input
                id="max-capacity"
                type="number"
                min={1}
                className="w-full rounded-xl border border-zinc-200 p-3"
                value={maxCapacity}
                onChange={(event) => setMaxCapacity(event.target.value)}
              />
            </div>
          ) : null}

          <div>
            <label htmlFor="name" className="mb-1 block text-sm text-zinc-600">
              {isEvent ? t("event.name", "Program name") : t("travels.name", "Name")}
            </label>
            <input
              id="name"
              className="w-full rounded-xl border border-zinc-200 p-3"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="origin" className="mb-1 block text-sm text-zinc-600">
                {isEvent ? t("event.venue", "Venue") : t("travels.origin", "Origin")}
              </label>
              <input
                id="origin"
                className="w-full rounded-xl border border-zinc-200 p-3"
                value={origin}
                onChange={(event) => setOrigin(event.target.value)}
              />
            </div>

            {!isEvent ? (
              <div>
                <label htmlFor="destination" className="mb-1 block text-sm text-zinc-600">
                  {t("travels.destination", "Destination")}
                </label>
                <input
                  id="destination"
                  className="w-full rounded-xl border border-zinc-200 p-3"
                  value={destination}
                  onChange={(event) => setDestination(event.target.value)}
                />
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-500">
                {t("event.no_destination", "Programs do not use a destination field.")}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="departure" className="mb-1 block text-sm text-zinc-600">
                {isEvent
                  ? t("event.start", "Program start")
                  : t("travels.departure", "Departure")}
              </label>
              <input
                id="departure"
                type="datetime-local"
                className="w-full rounded-xl border border-zinc-200 p-3"
                value={departureAt}
                onChange={(event) => setDepartureAt(event.target.value)}
              />
            </div>

            <div>
              <label htmlFor="return" className="mb-1 block text-sm text-zinc-600">
                {isEvent ? t("event.end", "Program end") : t("travels.return", "Return")}
              </label>
              <input
                id="return"
                type="datetime-local"
                className="w-full rounded-xl border border-zinc-200 p-3"
                value={returnAt}
                onChange={(event) => setReturnAt(event.target.value)}
              />
            </div>
          </div>

          <div>
            <label htmlFor="price" className="mb-1 block text-sm text-zinc-600">
              {t("travels.price", "Price")}
            </label>
            <input
              id="price"
              type="number"
              className="w-full rounded-xl border border-zinc-200 p-3"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
            />
          </div>

          <div>
            <label htmlFor="description" className="mb-1 block text-sm text-zinc-600">
              {t("travels.description", "Description")}
            </label>
            <textarea
              id="description"
              className="w-full rounded-xl border border-zinc-200 p-3"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="image" className="mb-1 block text-sm text-zinc-600">
              {isEvent
                ? t("event.image", "Program image")
                : t("travels.image", "Travel image")}
            </label>
            {currentImageUrl ? (
              <div className="text-xs text-zinc-500">{currentImageUrl}</div>
            ) : null}
            <input
              id="image"
              type="file"
              accept="image/*"
              onChange={(event) => setImageFile(event.target.files?.[0] || null)}
            />
          </div>

          <hr />

          <h2 className="text-lg font-medium">
            {isEvent ? t("event.team", "Program team") : t("travels.team", "Travel team")}
          </h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {isEvent
                  ? t("event.organizers", "Organizers")
                  : t("travels.leaders", "Leaders")}
              </span>

              <button type="button" onClick={addLeader} className="text-sm text-blue-600">
                {isEvent
                  ? t("event.add_organizer", "+ Add organizer")
                  : t("travels.add_leader", "+ Add leader")}
              </button>
            </div>

            {leaders.map((leader, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="flex-1">
                  <label
                    htmlFor={`leader-${index}`}
                    className="mb-1 block text-sm text-zinc-600"
                  >
                    {isEvent
                      ? t("event.organizer", "Organizer")
                      : t("travels.leader", "Leader")}{" "}
                    {index + 1}
                  </label>

                  <select
                    id={`leader-${index}`}
                    className="w-full rounded-xl border border-zinc-200 p-3"
                    value={leader}
                    onChange={(event) => updateLeader(index, event.target.value)}
                  >
                    <option value="">{t("common.select", "Select")}</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => removeLeader(index)}
                  className="rounded-xl bg-red-100 px-3 py-2 text-red-600"
                >
                  {t("common.remove", "Remove")}
                </button>
              </div>
            ))}
          </div>

          {!isEvent ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {t("travels.drivers", "Drivers")}
                </span>

                <button type="button" onClick={addDriver} className="text-sm text-blue-600">
                  {t("travels.add_driver", "+ Add driver")}
                </button>
              </div>

              {drivers.map((driver, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="flex-1">
                    <label
                      htmlFor={`driver-${index}`}
                      className="mb-1 block text-sm text-zinc-600"
                    >
                      {t("travels.driver", "Driver")} {index + 1}
                    </label>

                    <select
                      id={`driver-${index}`}
                      className="w-full rounded-xl border border-zinc-200 p-3"
                      value={driver}
                      onChange={(event) => updateDriver(index, event.target.value)}
                    >
                      <option value="">{t("common.select", "Select")}</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeDriver(index)}
                    className="rounded-xl bg-red-100 px-3 py-2 text-red-600"
                  >
                    {t("common.remove", "Remove")}
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <button
            onClick={saveTravel}
            disabled={saving}
            className="w-full rounded-xl bg-black py-3 text-white transition hover:bg-zinc-800 disabled:opacity-50"
          >
            {saving ? t("common.saving", "Saving...") : t("common.save", "Save")}
          </button>

          {errorMsg ? (
            <div className="mt-2 rounded-2xl border border-red-100 bg-red-50 p-4 text-center text-sm text-red-600">
              {errorMsg}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
