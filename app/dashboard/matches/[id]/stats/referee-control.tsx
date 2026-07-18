"use client";

import { FormEvent, useState, useTransition } from "react";
import { Icon } from "@/components/icon";
import { clearMatchReferee, setMatchReferee } from "./actions";

type Referee = { login: string | null; name: string | null; imageUrl: string | null };

export function RefereeControl({ matchId, referee }: { matchId: string; referee: Referee }) {
  const [login, setLogin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!login.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        await setMatchReferee(matchId, login.trim());
        setLogin("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not find that 42 user");
      }
    });
  }

  function clear() {
    setError(null);
    startTransition(async () => {
      try {
        await clearMatchReferee(matchId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not remove referee");
      }
    });
  }

  return (
    <section className="mb-6 rounded-2xl border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <Icon name="whistle" size={20} className="text-[#00c281]" />
        <h2 className="text-xl font-black">Referee</h2>
      </div>

      {referee.login ? (
        <div className="flex items-center gap-3">
          <span
            style={referee.imageUrl ? { backgroundImage: `url(${referee.imageUrl})` } : undefined}
            className="grid size-12 shrink-0 place-items-center rounded-full bg-muted bg-cover bg-center text-sm font-black"
          >
            {referee.imageUrl ? null : (referee.name?.slice(0, 2).toUpperCase() ?? "??")}
          </span>
          <div className="min-w-0 flex-1">
            <b className="block truncate">{referee.name}</b>
            <p className="truncate text-sm text-muted-foreground">@{referee.login}</p>
          </div>
          <button
            type="button"
            onClick={clear}
            disabled={pending}
            className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-bold text-destructive transition hover:bg-muted disabled:opacity-50"
          >
            <Icon name="delete" size={16} /> Remove
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 text-sm font-semibold">
            Assign a referee by 42 Intra login
            <input
              value={login}
              onChange={(event) => setLogin(event.target.value)}
              placeholder="Enter Intra login"
              autoComplete="off"
              className="mt-2 w-full rounded-xl border border-border bg-input px-4 py-3 outline-none focus:border-ring"
            />
          </label>
          <button
            type="submit"
            disabled={pending || !login.trim()}
            className="rounded-xl bg-[#00c281] px-5 py-3 font-black text-[#04140a] disabled:opacity-50"
          >
            {pending ? "Searching…" : "Assign referee"}
          </button>
        </form>
      )}

      {error && <p role="alert" className="mt-3 text-sm font-medium text-red-500">{error}</p>}
    </section>
  );
}
