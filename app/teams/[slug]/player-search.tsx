"use client";

import { useMemo, useState, useTransition } from "react";
import { Icon } from "@/components/icon";
import { addPlayersBulk, type RosterResult } from "./actions";

export function PlayerSearch({ teamId, teamSlug }: { teamId: string; teamSlug: string }) {
  const [roster, setRoster] = useState("");
  const [results, setResults] = useState<RosterResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Live preview of how the list will be interpreted.
  const parsed = useMemo(() => {
    const tokens = roster.split(/[,\n]/).map((token) => token.trim()).filter(Boolean);
    return tokens.map((token, index) => {
      const captain = /\(c\)$/i.test(token);
      const login = token.replace(/\(c\)$/i, "").trim();
      const role = captain ? "Captain" : index === 0 ? "Goalkeeper" : "Player";
      return { login, role };
    });
  }, [roster]);

  function submit() {
    if (!parsed.length) return;
    setError(null);
    setResults(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("roster", roster);
        setResults(await addPlayersBulk(teamId, teamSlug, formData));
      } catch (error) {
        setError(error instanceof Error ? error.message : "Unable to add players");
      }
    });
  }

  const addedCount = results?.filter((result) => result.status === "added").length ?? 0;

  return (
    <div id="add-player" className="mb-7 scroll-mt-24 rounded-3xl border border-white/8 bg-[#1b1b1b] p-5">
      <div className="flex items-center gap-2">
        <Icon name="users" size={20} className="text-[#00c281]" />
        <h3 className="font-bold">Bulk add players</h3>
      </div>
      <p className="mt-1.5 text-sm text-white/45">
        Paste 42 logins separated by commas. The <b className="text-white/70">first</b> is the goalkeeper; add
        <code className="mx-1 rounded bg-white/10 px-1.5 py-0.5 text-xs text-white/80">(c)</code>
        after a login to mark the captain.
      </p>

      <textarea
        value={roster}
        onChange={(event) => setRoster(event.target.value)}
        rows={2}
        placeholder="jdoe, asmith, mbappe, jelyoussi(c)"
        autoComplete="off"
        spellCheck={false}
        className="mt-4 w-full resize-none rounded-2xl border border-white/10 bg-white/[.06] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#00c281]/60"
      />

      {parsed.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {parsed.map((entry, index) => (
            <span
              key={`${entry.login}-${index}`}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                entry.role === "Goalkeeper"
                  ? "bg-[#00c281]/15 text-[#05e08c]"
                  : entry.role === "Captain"
                    ? "bg-amber-400/15 text-amber-300"
                    : "bg-white/8 text-white/60"
              }`}
            >
              {entry.role === "Captain" && <Icon name="star" size={13} strokeWidth={2} />}
              {entry.login || "—"}
              <span className="text-white/35">· {entry.role}</span>
            </span>
          ))}
        </div>
      )}

      <button
        onClick={submit}
        disabled={pending || !parsed.length}
        className="mt-4 flex items-center gap-2 rounded-full bg-[#00c281] px-5 py-2.5 text-sm font-bold text-[#04120c] transition hover:bg-[#05e08c] disabled:opacity-40"
      >
        <Icon name="plus" size={18} strokeWidth={2.4} className="text-[#04120c]" />
        {pending ? "Adding…" : `Add ${parsed.length || ""} player${parsed.length === 1 ? "" : "s"}`.trim()}
      </button>

      {error && <p role="alert" className="mt-3 text-sm font-medium text-red-400">{error}</p>}

      {results && (
        <div className="mt-5 border-t border-white/8 pt-4">
          <p className="mb-3 text-sm font-bold text-white/70">
            {addedCount} added · {results.length - addedCount} skipped or failed
          </p>
          <div className="space-y-1.5">
            {results.map((result, index) => (
              <div key={`${result.login}-${index}`} className="flex items-center gap-2.5 text-sm">
                <span
                  className={`grid size-5 shrink-0 place-items-center rounded-full ${
                    result.status === "added"
                      ? "bg-[#00c281] text-[#04120c]"
                      : result.status === "skipped"
                        ? "bg-white/15 text-white/60"
                        : "bg-red-500/20 text-red-400"
                  }`}
                >
                  <Icon name={result.status === "added" ? "check" : "close"} size={12} strokeWidth={2.5} />
                </span>
                <b>{result.login}</b>
                <span className="text-white/45">{result.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
