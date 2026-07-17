export type TravelAddonPricingMode = "per_booking" | "per_participant";

export type TravelAddonDefinition = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  pricing_mode: TravelAddonPricingMode;
  is_active: boolean;
  sort_order: number;
};

export type ReservationAddonSelection = {
  addon_id: string;
  name: string;
  description: string | null;
  unit_price: number;
  pricing_mode: TravelAddonPricingMode;
  quantity: number;
  total_price: number;
};

function toNumber(value: unknown) {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : 0;
}

function toPricingMode(value: unknown): TravelAddonPricingMode {
  return value === "per_participant" ? "per_participant" : "per_booking";
}

export function parseTravelAddons(value: unknown): TravelAddonDefinition[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;

      const row = item as Record<string, unknown>;
      const name = typeof row.name === "string" ? row.name.trim() : "";

      if (!name) return null;

      const id =
        typeof row.id === "string" && row.id.trim()
          ? row.id.trim()
          : `addon-${index + 1}`;

      return {
        id,
        name,
        description:
          typeof row.description === "string" && row.description.trim()
            ? row.description.trim()
            : null,
        price: toNumber(row.price),
        pricing_mode: toPricingMode(row.pricing_mode),
        is_active: row.is_active !== false,
        sort_order: Number.isFinite(Number(row.sort_order))
          ? Number(row.sort_order)
          : index,
      } satisfies TravelAddonDefinition;
    })
    .filter((item): item is TravelAddonDefinition => Boolean(item))
    .sort((left, right) => left.sort_order - right.sort_order);
}

export function formatMoney(value: unknown) {
  const amount = toNumber(value);
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
