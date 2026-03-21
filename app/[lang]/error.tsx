"use client";

export default function LangError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-zinc-200">
        <h1 className="text-2xl font-bold text-rose-600">
          Something went wrong
        </h1>
        <p className="mt-3 text-sm text-zinc-600">
          {error.message || "An unexpected error occurred while loading the page."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
