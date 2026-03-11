"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useT } from "@/lib/translations/useT.client";

export default function PaymentPage() {
  const router = useRouter();
  const routeParams = useParams<{ lang: string }>();
  const lang = routeParams.lang;
  const t = useT(lang);
  const sp = useSearchParams();

  const travelId = sp.get("travel") ?? "";
  const seats = sp.get("seats") ?? "";

  const seatList = useMemo(
    () => seats.split(",").map((s) => Number(s.trim())).filter(Boolean),
    [seats]
  );

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    setMsg(null);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      router.push(`/${lang}/login`);
      return;
    }

    const { data: userRow, error: userError } = await supabase
      .from("users")
      .select("id, name, email, phone")
      .eq("id", user.id)
      .single();

    if (userError || !userRow) {
      setMsg("اطلاعات کاربر پیدا نشد.");
      setLoading(false);
      return;
    }

    const { data: existingRows, error: checkError } = await supabase
      .from("bus_seats_reservation")
      .select("seat_no, status")
      .eq("travel_id", travelId)
      .in("seat_no", seatList)
      .in("status", ["pre", "paid", "Pre-Reservation", "Paid"]);

    if (checkError) {
      setMsg(checkError.message);
      setLoading(false);
      return;
    }

    if ((existingRows ?? []).length > 0) {
      setMsg(t("page.payment.seat_unavailable"));
      setLoading(false);
      return;
    }

    const insertRows = seatList.map((seatNo) => ({
      travel_id: travelId,
      leader_id: null,
      seat_no: seatNo,
      passenger_name: userRow.name ?? "مسافر",
      passenger_email: userRow.email ?? user.email ?? null,
      passenger_phone: userRow.phone ?? null,
      booker_user_id: user.id,
      status: "paid",
    }));

    const { error: insertError } = await supabase
      .from("bus_seats_reservation")
      .insert(insertRows);

    if (insertError) {
      setMsg(insertError.message);
      setLoading(false);
      return;
    }

    setPaid(true);
    setLoading(false);
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold">{t("page.payment.title")}</h1>
        <p className="mt-2 text-sm text-zinc-600">{t("page.payment.subtitle")}</p>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
        <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-700">
          <div>
            <span className="font-semibold">Travel:</span> {travelId || "-"}
          </div>
          <div className="mt-1">
            <span className="font-semibold">Seats:</span>{" "}
            {seatList.length ? seatList.join(", ") : "-"}
          </div>
        </div>

        {paid ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="font-bold text-emerald-800">
              {t("page.payment.paid_success")}
            </div>
            <button
              onClick={() => router.push(`/${lang}/profile`)}
              className="mt-4 rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
            >
              {t("page.payment.go_profile")}
            </button>
          </div>
        ) : (
          <div className="mt-6 flex gap-3">
            <button
              onClick={handlePayment}
              disabled={loading || !travelId || seatList.length === 0}
              className="rounded-2xl bg-rose-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              {loading ? t("page.payment.processing") : t("page.payment.pay_sandbox")}
            </button>

            <button
              onClick={() => router.back()}
              className="rounded-2xl bg-zinc-100 px-6 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-200"
            >
              {t("common.back")}
            </button>
          </div>
        )}

        {msg ? <div className="mt-4 text-sm text-rose-600">{msg}</div> : null}
      </div>
    </main>
  );
}