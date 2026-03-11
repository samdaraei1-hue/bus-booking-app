"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Travel } from "@/lib/types";
import { useT } from "@/lib/translations/useT.client";

export default function TravelCard({
  travel,
  lang,
}: {
  travel: Travel;
  lang: string;
}) {
  const t = useT(lang);

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
        <div className="relative h-48 overflow-hidden">
          <img
            src="/images/travel.jpg"
            alt={`${travel.origin} to ${travel.destination}`}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white">
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs backdrop-blur">
              Group Trip
            </span>
            <span className="rounded-full bg-rose-600 px-3 py-1 text-sm font-bold">
              €{travel.price}
            </span>
          </div>
        </div>

        <div className="space-y-3 p-5">
          <h3 className="text-xl font-bold text-zinc-900">
            {travel.origin} → {travel.destination}
          </h3>

          <p className="text-sm text-zinc-500">
            {new Date(travel.departure_at).toLocaleString(lang === "fa" ? "fa-IR" : lang === "de" ? "de-DE" : "en-US")}
          </p>

          <div className="pt-2 text-sm font-semibold text-rose-600">
            {t("common.view")} & {t("common.reserve")} ←
          </div>
        </div>
      </Link>
    </motion.div>
  );
}