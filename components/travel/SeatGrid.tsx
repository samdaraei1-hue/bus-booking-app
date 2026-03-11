"use client";

import { useEffect, useState } from "react";

export default function SeatGrid({
  total,
  reserved,
  onChange,
}: {
  total: number;
  reserved: number[];
  onChange: (seats: number[]) => void;
}) {
  const [selected, setSelected] = useState<number[]>([]);

  useEffect(() => {
    onChange(selected);
  }, [selected, onChange]);

  const toggleSeat = (seatNo: number) => {
    if (reserved.includes(seatNo)) return;

    setSelected((prev) =>
      prev.includes(seatNo)
        ? prev.filter((s) => s !== seatNo)
        : [...prev, seatNo]
    );
  };

  return (
    <div className="grid grid-cols-4 gap-3">
      {Array.from({ length: total }).map((_, i) => {
        const seatNo = i + 1;
        const isReserved = reserved.includes(seatNo);
        const isSelected = selected.includes(seatNo);

        return (
          <button
            key={seatNo}
            type="button"
            onClick={() => toggleSeat(seatNo)}
            disabled={isReserved}
            className={[
              "rounded-2xl px-4 py-4 text-sm font-bold transition",
              isReserved
                ? "cursor-not-allowed bg-zinc-200 text-zinc-400"
                : isSelected
                ? "bg-rose-600 text-white shadow-lg"
                : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200",
            ].join(" ")}
          >
            {seatNo}
          </button>
        );
      })}
    </div>
  );
}