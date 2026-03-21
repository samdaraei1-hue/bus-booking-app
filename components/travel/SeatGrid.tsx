"use client";

import { useEffect, useMemo, useState } from "react";
import type { LayoutSeat } from "@/lib/types";

export default function SeatGrid({
  seats,
  unavailableSeatIds,
  initialSelectedSeatIds = [],
  readOnly = false,
  onChange,
}: {
  seats: LayoutSeat[];
  unavailableSeatIds: string[];
  initialSelectedSeatIds?: string[];
  readOnly?: boolean;
  onChange: (seatIds: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>(initialSelectedSeatIds);

  useEffect(() => {
    setSelected(initialSelectedSeatIds);
  }, [initialSelectedSeatIds]);

  useEffect(() => {
    onChange(selected);
  }, [selected, onChange]);

  const normalizedSeats = useMemo(() => {
    return [...seats].sort((a, b) => {
      if (a.y === b.y) return a.x - b.x;
      return a.y - b.y;
    });
  }, [seats]);

  const gridColumnCount = useMemo(() => {
    if (!normalizedSeats.length) return 1;
    return (
      Math.max(...normalizedSeats.map((seat) => Math.floor(Number(seat.x)))) + 1
    );
  }, [normalizedSeats]);

  const toggleSeat = (seatId: string) => {
    if (readOnly) return;
    if (unavailableSeatIds.includes(seatId)) return;

    setSelected((prev) =>
      prev.includes(seatId)
        ? prev.filter((item) => item !== seatId)
        : [...prev, seatId]
    );
  };

  return (
    <div
      className="grid gap-3"
      style={{
        gridTemplateColumns: `repeat(${gridColumnCount}, minmax(0, 1fr))`,
      }}
    >
      {normalizedSeats.map((seat) => {
        const isUnavailable =
          unavailableSeatIds.includes(seat.id) || seat.is_selectable === false;
        const isSelected = selected.includes(seat.id);

        return (
          <button
            key={seat.id}
            type="button"
            onClick={() => toggleSeat(seat.id)}
            disabled={isUnavailable}
            className={[
              "rounded-2xl border px-4 py-4 text-sm font-bold transition",
              isUnavailable
                ? "cursor-not-allowed border-zinc-200 bg-zinc-200 text-zinc-400"
                : isSelected
                ? readOnly
                  ? "border-sky-600 bg-sky-600 text-white shadow-lg"
                  : "border-rose-600 bg-rose-600 text-white shadow-lg"
                : "border-zinc-200 bg-zinc-100 text-zinc-800 hover:bg-zinc-200",
            ].join(" ")}
            style={{
              gridColumnStart: Math.floor(Number(seat.x)) + 1,
              gridRowStart: Math.floor(Number(seat.y)) + 1,
              gridColumnEnd: `span ${Math.max(1, Math.floor(Number(seat.width) || 1))}`,
              gridRowEnd: `span ${Math.max(1, Math.floor(Number(seat.height) || 1))}`,
            }}
          >
            <div>{seat.label}</div>
            <div className="mt-1 text-[11px] font-medium opacity-80">
              {seat.seat_key}
            </div>
          </button>
        );
      })}
    </div>
  );
}
