"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useT } from "@/lib/translations/useT.client";
import { withTimeout } from "@/lib/async/withTimeout";

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export default function CreateTravelPage() {

  const router = useRouter();
  const params = useParams();
  const lang = params.lang as string;
  const dir = lang === "fa" ? "rtl" : "ltr";

  const t = useT(lang);

  const [users, setUsers] = useState<any[]>([]);

  const [name, setName] = useState("");
  const [type, setType] = useState<"travel" | "event">("travel");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [departure_at, setDeparture] = useState("");
  const [return_at, setReturn] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");

  const [leaders, setLeaders] = useState<string[]>([]);
  const [drivers, setDrivers] = useState<string[]>([]);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const isEvent = type === "event";

  useEffect(() => {
    const loadUsers = async () => {
      const { data } = await supabase.from("users").select("id,name");
      if (data) setUsers(data);
    };
    loadUsers();
  }, []);

    // ===== leader handlers =====

  const addLeader = () => setLeaders([...leaders, ""]);

  const updateLeader = (index:number,value:string) => {
    const updated=[...leaders];
    updated[index]=value;
    setLeaders(updated);
  };

  const removeLeader = (index:number) => {
    setLeaders(leaders.filter((_,i)=>i!==index));
  };

  // ===== driver handlers =====
  const addDriver = () => {
    setDrivers([...drivers, ""]);
  };

  const updateDriver = (index:number,value:string) => {
    const updated=[...drivers];
    updated[index]=value;
    setDrivers(updated);
  };

  const removeDriver = (index:number) => {
    const updated=drivers.filter((_,i)=>i!==index);
    setDrivers(updated);
  };

  const uploadImage = async () => {

    if (!imageFile) return null;

    const path=`travels/${Date.now()}_${sanitizeFileName(imageFile.name)}`;

    const { error } = await withTimeout(
      supabase
        .storage
        .from("trip-images")
        .upload(path,imageFile,{
          cacheControl: "3600",
          upsert: false,
        }),
      15000,
      "Uploading image to Supabase Storage timed out"
    );

    if (error) {
      console.error(error);
      return null;
    }

    const { data } = supabase
      .storage
      .from("trip-images")
      .getPublicUrl(path);

    return data.publicUrl;

  };

  const saveTravel = async () => {

    const image_url = await uploadImage();

    const { data:travel,error } = await supabase
      .from("travels")
      .insert({
        name,
        type,
        origin,
        destination: isEvent ? null : destination,
        departure_at,
        return_at,
        price,
        description,
        image_url
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      return;
    }

    const team:any[]=[];

    leaders.forEach((l)=>{
      if (l) {
          team.push({
            travel_id:travel.id,
            colleague_id:l,
            role:"leader"
          });
        }
    });
    
    drivers.forEach((d)=>{
      if(d){
        team.push({
          travel_id:travel.id,
          colleague_id:d,
          role:"driver"
        });
      }
    });

    if(team.length>0){
      await supabase.from("travel_teams").insert(team);
    }

    router.push(`/${lang}/dashboard/travels`);

  };

  return (

    <div dir={dir} className="flex justify-center py-10 bg-zinc-50 min-h-screen">

      <div className="w-full max-w-xl bg-white p-8 rounded-3xl shadow-sm border border-zinc-200">

        <h1 className="text-2xl font-semibold mb-8 text-start">
          {isEvent
            ? t("event.create", "Create program")
            : t("travels.create","Create travel")}
        </h1>

        <div className="space-y-6">
          <div>
            <label htmlFor="type" className="text-sm text-zinc-600 block mb-1">
              {t("travels.type","Type")}
            </label>
            <select
              id="type"
              className="w-full rounded-xl border border-zinc-200 p-3"
              value={type}
              onChange={(e) => setType(e.target.value as "travel" | "event")}
            >
              <option value="travel">{t("travel.type.travel", "Travel")}</option>
              <option value="event">{t("travel.type.event", "Event")}</option>
            </select>
          </div>

          <div>
            <label htmlFor="name" className="text-sm text-zinc-600 block mb-1">
              {isEvent ? t("event.name", "Program name") : t("travels.name","Name")}
            </label>
            <input
              id="name"
              className="w-full rounded-xl border border-zinc-200 p-3"
              value={name}
              onChange={(e)=>setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">

            <div>
              <label htmlFor="origin" className="text-sm text-zinc-600 block mb-1">
                {isEvent
                  ? t("event.venue", "Venue")
                  : t("travels.origin","Origin")}
              </label>
              <input
                id="origin"
                className="w-full rounded-xl border border-zinc-200 p-3"
                value={origin}
                onChange={(e)=>setOrigin(e.target.value)}
              />
            </div>

            {!isEvent ? (
              <div>
                <label htmlFor="destination" className="text-sm text-zinc-600 block mb-1">
                  {t("travels.destination","Destination")}
                </label>
                <input
                  id="destination"
                  className="w-full rounded-xl border border-zinc-200 p-3"
                  value={destination}
                  onChange={(e)=>setDestination(e.target.value)}
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
              <label htmlFor="departure" className="text-sm text-zinc-600 block mb-1">
                {isEvent
                  ? t("event.start", "Program start")
                  : t("travels.departure","Departure")}
              </label>
              <input
                id="departure"
                type="datetime-local"
                className="w-full rounded-xl border border-zinc-200 p-3"
                value={departure_at}
                onChange={(e)=>setDeparture(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="return" className="text-sm text-zinc-600 block mb-1">
                {isEvent
                  ? t("event.end", "Program end")
                  : t("travels.return","Return")}
              </label>
              <input
                id="return"
                type="datetime-local"
                className="w-full rounded-xl border border-zinc-200 p-3"
                value={return_at}
                onChange={(e)=>setReturn(e.target.value)}
              />
            </div>

          </div>

          <div>
            <label htmlFor="price" className="text-sm text-zinc-600 block mb-1">
              {t("travels.price","Price (€)")}
            </label>
            <input
              id="price"
              type="number"
              className="w-full rounded-xl border border-zinc-200 p-3"
              value={price}
              onChange={(e)=>setPrice(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="description" className="text-sm text-zinc-600 block mb-1">
              {t("travels.description","Description")}
            </label>
            <textarea
              id="description"
              className="w-full rounded-xl border border-zinc-200 p-3"
              value={description}
              onChange={(e)=>setDescription(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="image" className="text-sm text-zinc-600 block mb-1">
              {isEvent
                ? t("event.image", "Program image")
                : t("travels.image","Travel image")}
            </label>
            <input
              id="image"
              type="file"
              accept="image/*"
              onChange={(e)=>setImageFile(e.target.files?.[0] || null)}
            />
          </div>

          <hr/>

          <h2 className="text-lg font-medium">
            {isEvent
              ? t("event.team", "Program team")
              : t("travels.team","Travel team")}
          </h2>

          <div className="space-y-3">

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {isEvent
                  ? t("event.organizers","Organizers")
                  : t("travels.leaders","Leaders")}
              </span>

              <button
                type="button"
                onClick={addLeader}
                className="text-sm text-blue-600"
              >
                {isEvent ? "+ Add organizer" : "+ Add leader"}
              </button>
            </div>

            {leaders.map((leader,index)=>(
              <div key={index} className="flex gap-2 items-start">

                <div className="flex-1">
                    <label
                    htmlFor={`leader-${index}`}
                    className="text-sm text-zinc-600 block mb-1"
                    >
                    {isEvent
                      ? t("event.organizer","Organizer")
                      : t("travels.leader","Leader")} {index + 1}
                    </label>

                    <select
                    id={`leader-${index}`}
                    className="w-full rounded-xl border border-zinc-200 p-3"
                    value={leader}
                    onChange={(e)=>updateLeader(index,e.target.value)}
                    >
                    <option value="">{t("common.select","Select")}</option>

                    {users.map((u)=>(
                        <option key={u.id} value={u.id}>
                        {u.name}
                        </option>
                    ))}

                    </select>
                </div>

                <button
                  type="button"
                  onClick={()=>removeLeader(index)}
                  className="px-3 bg-red-100 text-red-600 rounded-xl"
                >
                  ×
                </button>

              </div>
            ))}

          </div>

          {!isEvent ? (
          <div className="space-y-3">

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {t("travels.drivers","Drivers")}
              </span>

              <button
                type="button"
                onClick={addDriver}
                className="text-sm text-blue-600"
              >
                + Add driver
              </button>
            </div>

            {drivers.map((driver,index)=>(
              <div key={index} className="flex gap-2 items-start">

                <div className="flex-1">
                    <label
                    htmlFor={`driver-${index}`}
                    className="text-sm text-zinc-600 block mb-1"
                    >
                    {t("travels.driver","Driver")} {index + 1}
                    </label>

                    <select
                    id={`driver-${index}`}
                    className="w-full rounded-xl border border-zinc-200 p-3"
                    value={driver}
                    onChange={(e)=>updateDriver(index,e.target.value)}
                    >
                    <option value="">{t("common.select","Select")}</option>

                    {users.map((u)=>(
                        <option key={u.id} value={u.id}>
                        {u.name}
                        </option>
                    ))}

                    </select>
                </div>

                <button
                  type="button"
                  onClick={()=>removeDriver(index)}
                  className="px-3 bg-red-100 text-red-600 rounded-xl"
                >
                  ×
                </button>

              </div>
            ))}

          </div>
          ) : null}

          <button
            onClick={saveTravel}
            className="w-full bg-black text-white py-3 rounded-xl hover:bg-zinc-800 transition"
          >
            {t("common.save","Save")}
          </button>

        </div>

      </div>

    </div>
  );
}
