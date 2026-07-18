"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Icon, type IconName } from "@/components/icon";
import { addManualPlayerAction, updateTeamAction } from "./actions";

type Team = {
  id: string;
  slug: string;
  name: string;
  shortName: string | null;
  description: string | null;
  logoUrl: string | null;
};

const field =
  "mt-1.5 w-full rounded-xl border border-white/10 bg-white/[.06] px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#00c281]/60";

export function TeamManager({ team }: { team: Team }) {
  const [open, setOpen] = useState<"edit" | "manual" | null>(null);
  const editTeam = updateTeamAction.bind(null, team.id, team.slug);
  const addManual = addManualPlayerAction.bind(null, team.id, team.slug);

  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-2">
      <Toggle icon="edit" label="Edit team" active={open === "edit"} onClick={() => setOpen(open === "edit" ? null : "edit")} />
      <Toggle icon="plus" label="Add player manually" active={open === "manual"} onClick={() => setOpen(open === "manual" ? null : "manual")} />

      {open === "edit" && (
        <form action={editTeam} className="sm:col-span-2 space-y-4 rounded-3xl border border-white/8 bg-[#1b1b1b] p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-white/80">Team name<input name="name" defaultValue={team.name} required className={field} /></label>
            <label className="text-sm font-semibold text-white/80">Short name<input name="shortName" defaultValue={team.shortName ?? ""} placeholder="e.g. AFC" className={field} /></label>
          </div>
          <label className="block text-sm font-semibold text-white/80">Description<textarea name="description" defaultValue={team.description ?? ""} rows={2} className={field} /></label>
          <label className="block text-sm font-semibold text-white/80">
            Change logo <span className="font-normal text-white/40">(max 5 MB)</span>
            <input type="file" name="logo" accept="image/jpeg,image/png,image/webp,image/gif" className="mt-1.5 block w-full rounded-xl border border-dashed border-white/15 bg-white/[.04] p-2.5 text-sm text-white/70 file:mr-3 file:rounded-full file:border-0 file:bg-[#00c281] file:px-4 file:py-1.5 file:font-bold file:text-[#04120c]" />
          </label>
          <Submit label="Save changes" />
        </form>
      )}

      {open === "manual" && (
        <form action={addManual} className="sm:col-span-2 space-y-4 rounded-3xl border border-white/8 bg-[#1b1b1b] p-5">
          <p className="text-sm text-white/45">For players without a 42 login.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-white/80">First name<input name="firstName" required className={field} /></label>
            <label className="text-sm font-semibold text-white/80">Last name<input name="lastName" required className={field} /></label>
            <label className="text-sm font-semibold text-white/80">Display name <span className="font-normal text-white/40">(optional)</span><input name="displayName" className={field} /></label>
            <label className="text-sm font-semibold text-white/80">Shirt number <span className="font-normal text-white/40">(optional)</span><input name="shirtNumber" type="number" min={0} className={field} /></label>
            <label className="text-sm font-semibold text-white/80 sm:col-span-2">Position / role
              <select name="position" defaultValue="" className={field}>
                <option value="">No fixed position</option>
                <option value="GOALKEEPER">Goalkeeper</option>
                <option value="DEFENDER">Defender</option>
                <option value="MIDFIELDER">Midfielder</option>
                <option value="FORWARD">Attacker</option>
                <option value="CAPTAIN">Captain</option>
              </select>
            </label>
          </div>
          <Submit label="Add player" />
        </form>
      )}
    </div>
  );
}

function Toggle({ icon, label, active, onClick }: { icon: IconName; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold transition ${
        active ? "border-[#00c281]/50 bg-[#00c281]/10 text-white" : "border-white/8 bg-[#1b1b1b] text-white/70 hover:border-white/15 hover:text-white"
      }`}
    >
      <Icon name={icon} size={18} className={active ? "text-[#00c281]" : "text-white/60"} />
      {label}
    </button>
  );
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-2 rounded-full bg-[#00c281] px-5 py-2.5 text-sm font-bold text-[#04120c] transition hover:bg-[#05e08c] disabled:opacity-40"
    >
      <Icon name="save" size={17} strokeWidth={2.2} className="text-[#04120c]" />
      {pending ? "Saving…" : label}
    </button>
  );
}
