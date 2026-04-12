"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Travel } from "@/lib/types";
import { useT } from "@/lib/translations/useT.client";
import {
  getOfferingKind,
  isLocationOnlyOffering,
  isSeatMapBooking,
} from "@/lib/offerings";

export default function TravelCard({
  travel,
  lang,
}: {
  travel: Travel;
  lang: string;
}) {
  const t = useT(lang);
  const imageSrc = travel.image_url || "/images/travel.jpg";
  const kind = getOfferingKind(travel.kind ?? travel.type);
  const itemType =
    kind === "event"
      ? t("travel.type.event", "Event")
      : kind === "hiking"
        ? t("travel.type.hiking", "Hiking")
        : kind === "walking"
          ? t("travel.type.walking", "Walking")
          : kind === "camping"
            ? t("travel.type.camping", "Camping")
            : kind === "mixed_trip"
              ? t("travel.type.mixed_trip", "Mixed trip")
              : kind === "trip"
                ? t("travel.type.travel", "Trip")
                : t("travel.type.custom", "Program");
  const routeText = isLocationOnlyOffering(travel)
    ? travel.origin
    : `${travel.origin} -> ${travel.destination}`;
  const bookingHint = isSeatMapBooking(travel)
    ? t("common.reserve_with_seats", "Seat selection available")
    : t("common.reserve_without_seats", "Direct booking");

  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
      className="h-full"
    >
      <Link
        href={`/${lang}/travels/${travel.id}`}
        className="group block h-full overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-sm transition hover:shadow-xl"
      >
        <div className="relative h-52 overflow-hidden sm:h-56">
          <img
            src={imageSrc}
            alt={travel.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 text-white">
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs backdrop-blur">
              {itemType}
            </span>
            <span className="rounded-full bg-rose-600 px-3 py-1 text-sm font-bold">
              EUR {travel.price}
            </span>
          </div>
        </div>

        <div className="space-y-3 p-5 sm:p-6">
          <h3 className="line-clamp-2 text-lg font-bold text-zinc-900 sm:text-xl">
            {travel.name}
          </h3>

          <p className="min-h-10 text-sm text-zinc-600">{routeText}</p>

          <p className="text-sm text-zinc-500">
            {new Date(travel.departure_at).toLocaleString(
              lang === "fa" ? "de-DE" : lang === "de" ? "de-DE" : "en-US"
            )}
          </p>

          <div className="pt-2 text-sm font-semibold text-rose-600">
            {t("common.view")} · {bookingHint}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
