"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useT } from "@/lib/translations/useT.client";
import { withTimeout } from "@/lib/async/withTimeout";

type SelectUser = {
  id: string;
  name: string | null;
};

type TravelTeamRow = {
  colleague_id: string;
  role: string;
};

type TravelRow = {
  name: string | null;
  type: "travel" | "event" | null;
  origin: string | null;
  destination: string | null;
  departure_at: string | null;
  return_at: string | null;
  price: number | string | null;
  description: string | null;
  image_url: string | null;
};

function toDateTimeLocalValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export default function EditTravelPage() {
  const router = useRouter();
  const params = useParams();

  const lang = params.lang as string;
  const id = params.id as string;
  const dir = lang === "fa" ? "rtl" : "ltr";
  const t = useT(lang);

  const [users, setUsers] = useState<SelectUser[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<"travel" | "event">("travel");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [departureAt, setDepartureAt] = useState("");
  const [returnAt, setReturnAt] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [leaders, setLeaders] = useState<string[]>([]);
  const [drivers, setDrivers] = useState<string[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [existingImage, setExistingImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const isEvent = type === "event";

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      setLoading(true);
      setMsg(null);

      try {
        const [
          { data: usersData, error: usersError },
          { data: travel, error: travelError },
          { data: team, error: teamError },
        ] = await Promise.all([
          supabase.from("users").select("id, name").order("name", { ascending: true }),
          supabase.from("travels").select("*").eq("id", id).single(),
          supabase
            .from("travel_teams")
            .select("colleague_id, role")
            .eq("travel_id", id),
        ]);

        if (!mounted) return;
        if (usersError) throw usersError;
        if (travelError) throw travelError;
        if (teamError) throw teamError;

        const travelRow = travel as TravelRow;
        setUsers((usersData ?? []) as SelectUser[]);
        setName(travelRow.name ?? "");
        setType(travelRow.type === "event" ? "event" : "travel");
        setOrigin(travelRow.origin ?? "");
        setDestination(travelRow.destination ?? "");
        setDepartureAt(toDateTimeLocalValue(travelRow.departure_at));
        setReturnAt(toDateTimeLocalValue(travelRow.return_at));
        setPrice(travelRow.price?.toString() ?? "");
        setDescription(travelRow.description ?? "");
        setExistingImage(travelRow.image_url ?? null);

        const teamRows = (team ?? []) as TravelTeamRow[];
        setLeaders(
          teamRows
            .filter((member) => member.role === "leader")
            .map((member) => member.colleague_id)
        );
        setDrivers(
          teamRows
            .filter((member) => member.role === "driver")
            .map((member) => member.colleague_id)
        );
      } catch (error) {
        console.error(error);
        setMsg(error instanceof Error ? error.message : "Failed to load travel");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    void loadData();

    return () => {
      mounted = false;
    };
  }, [id]);

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
    if (!imageFile) return existingImage;

    const path = `travels/${crypto.randomUUID()}_${sanitizeFileName(imageFile.name)}`;
    const { error } = await withTimeout(
      supabase.storage
        .from("trip-images")
        .upload(path, imageFile, {
          cacheControl: "3600",
          upsert: false,
        }),
      15000,
      "Uploading image to Supabase Storage timed out"
    );

    if (error) throw error;

    const { data } = supabase.storage.from("trip-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const normalizedLeaders = useMemo(
    () => Array.from(new Set(leaders.map((item) => item.trim()).filter(Boolean))),
    [leaders]
  );
  const normalizedDrivers = useMemo(
    () => Array.from(new Set(drivers.map((item) => item.trim()).filter(Boolean))),
    [drivers]
  );

  const updateTravel = async () => {
    if (!name.trim() || !origin.trim() || (!isEvent && !destination.trim())) {
      setMsg(
        isEvent
          ? "Program name and venue are required."
          : "Name, origin and destination are required."
      );
      return;
    }

    setSaving(true);
    setMsg(null);

    try {
      const imageUrl = await uploadImage();

      const { error: updateError } = await supabase
        .from("travels")
        .update({
          name: name.trim(),
          type,
          origin: origin.trim(),
          destination: isEvent ? null : destination.trim(),
          departure_at: departureAt || null,
          return_at: returnAt || null,
          price: price ? Number(price) : null,
          description: description.trim() || null,
          image_url: imageUrl,
        })
        .eq("id", id);

      if (updateError) throw updateError;

      const { error: deleteError } = await supabase
        .from("travel_teams")
        .delete()
        .eq("travel_id", id);

      if (deleteError) throw deleteError;

      const teamRows = [
        ...normalizedLeaders.map((colleagueId) => ({
          travel_id: id,
          colleague_id: colleagueId,
          role: "leader",
        })),
        ...normalizedDrivers.map((colleagueId) => ({
          travel_id: id,
          colleague_id: colleagueId,
          role: "driver",
        })),
      ];

      if (teamRows.length > 0) {
        const { error: teamError } = await supabase
          .from("travel_teams")
          .insert(teamRows);

        if (teamError) throw teamError;
      }

      router.push(`/${lang}/dashboard/travels`);
      router.refresh();
    } catch (error) {
      console.error(error);
      setMsg(error instanceof Error ? error.message : "Failed to update travel");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="h-72 animate-pulse rounded-3xl bg-zinc-100" />
      </main>
    );
  }

  return (
    <div dir={dir} className="flex min-h-screen justify-center bg-zinc-50 py-10">
      <div className="w-full max-w-2xl rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="mb-8 text-2xl font-semibold">
          {isEvent ? t("event.edit", "Edit program") : t("travels.edit", "Edit travel")}
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
              onChange={(event) =>
                setType(event.target.value as "travel" | "event")
              }
            >
              <option value="travel">{t("travel.type.travel", "Travel")}</option>
              <option value="event">{t("travel.type.event", "Event")}</option>
            </select>
          </div>

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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="origin" className="mb-1 block text-sm text-zinc-600">
                {isEvent
                  ? t("event.venue", "Venue")
                  : t("travels.origin", "Origin")}
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
                <label
                  htmlFor="destination"
                  className="mb-1 block text-sm text-zinc-600"
                >
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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="departure"
                className="mb-1 block text-sm text-zinc-600"
              >
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
                {isEvent
                  ? t("event.end", "Program end")
                  : t("travels.return", "Return")}
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
            <label
              htmlFor="description"
              className="mb-1 block text-sm text-zinc-600"
            >
              {t("travels.description", "Description")}
            </label>
            <textarea
              id="description"
              className="min-h-28 w-full rounded-xl border border-zinc-200 p-3"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          {existingImage ? (
            <img
              src={existingImage}
              alt="Travel"
              className="max-h-64 rounded-2xl object-cover"
            />
          ) : null}

          <div>
            <label htmlFor="image" className="mb-1 block text-sm text-zinc-600">
              {isEvent ? t("event.image", "Program image") : t("travels.image", "Image")}
            </label>
            <input
              id="image"
              type="file"
              accept="image/*"
              onChange={(event) => setImageFile(event.target.files?.[0] || null)}
            />
          </div>

          <hr />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span>
                {isEvent
                  ? t("event.organizers", "Organizers")
                  : t("travels.leaders", "Leaders")}
              </span>
              <button type="button" onClick={addLeader}>
                {isEvent ? "+ Add organizer" : "+ Add"}
              </button>
            </div>

            {leaders.map((leader, index) => (
              <div key={`leader-${index}`} className="flex gap-2">
                <select
                  value={leader}
                  onChange={(event) => updateLeader(index, event.target.value)}
                  className="w-full rounded-xl border border-zinc-200 p-3"
                  title={
                    isEvent ? `Organizer ${index + 1}` : `Leader ${index + 1}`
                  }
                >
                  <option value="">Select</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name || user.id}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={() => removeLeader(index)}>
                  Remove
                </button>
              </div>
            ))}
          </div>

          {!isEvent ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span>{t("travels.drivers", "Drivers")}</span>
              <button type="button" onClick={addDriver}>
                + Add
              </button>
            </div>

            {drivers.map((driver, index) => (
              <div key={`driver-${index}`} className="flex gap-2">
                <select
                  value={driver}
                  onChange={(event) => updateDriver(index, event.target.value)}
                  className="w-full rounded-xl border border-zinc-200 p-3"
                  title={`Driver ${index + 1}`}
                >
                  <option value="">Select</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name || user.id}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={() => removeDriver(index)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
          ) : null}

          {msg ? <div className="text-sm text-rose-600">{msg}</div> : null}

          <button
            onClick={() => void updateTravel()}
            disabled={saving}
            className="w-full rounded-xl bg-black py-3 text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {saving ? "Saving..." : t("common.save", "Update")}
          </button>
        </div>
      </div>
    </div>
  );
}
