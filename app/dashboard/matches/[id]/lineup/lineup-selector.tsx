"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Save, Users } from "@/components/icon";
import { saveMatchLineup } from "./actions";

type Player = { id: string; name: string; imageUrl: string | null; number: number | null; position: string | null };
type Team = { id: string; name: string; logoUrl: string | null; players: Player[]; starters: string[] };

export function LineupSelector({ matchId, homeTeam, awayTeam }: { matchId: string; homeTeam: Team; awayTeam: Team }) {
  const teams = [homeTeam, awayTeam];
  const [teamId, setTeamId] = useState(homeTeam.id);
  const team = teams.find((item) => item.id === teamId) ?? homeTeam;
  const [selected, setSelected] = useState<Record<string, string[]>>({ [homeTeam.id]: homeTeam.starters, [awayTeam.id]: awayTeam.starters });
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const starters = selected[team.id] ?? [];
  const bench = team.players.filter((player) => !starters.includes(player.id));

  function toggle(id: string) {
    setSelected((current) => {
      const list = current[team.id] ?? [];
      if (list.includes(id)) return { ...current, [team.id]: list.filter((value) => value !== id) };
      if (list.length >= 5) return current;
      return { ...current, [team.id]: [...list, id] };
    });
    setMessage("");
  }

  function save() {
    startTransition(async () => {
      try { await saveMatchLineup(matchId, team.id, starters); setMessage(`${team.name} lineup saved`); }
      catch (error) { setMessage(error instanceof Error ? error.message : "Could not save lineup"); }
    });
  }

  return <div className="space-y-6">
    <div className="grid grid-cols-2 gap-3">{teams.map((item) => <button type="button" key={item.id} onClick={() => { setTeamId(item.id); setMessage(""); }} className={`flex items-center gap-3 rounded-2xl border p-4 ${item.id === team.id ? "border-[#d7ff3f] bg-[#d7ff3f] text-black" : "bg-card"}`}><span className="size-11 rounded-xl bg-white bg-contain bg-center bg-no-repeat" style={item.logoUrl ? { backgroundImage: `url(${item.logoUrl})` } : undefined} /><b>{item.name}</b></button>)}</div>
    <Card><CardHeader><CardTitle className="flex items-center justify-between"><span className="flex items-center gap-2"><Users className="size-5" />Choose the starting five</span><Badge className={starters.length === 5 ? "bg-emerald-500 text-white" : ""}>{starters.length} / 5</Badge></CardTitle></CardHeader><CardContent><p className="mb-4 text-sm text-muted-foreground">Select one goalkeeper and four other players. Click a selected player to move them back to the bench.</p><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{team.players.map((player) => { const active=starters.includes(player.id); return <button type="button" key={player.id} onClick={() => toggle(player.id)} className={`relative flex items-center gap-3 rounded-xl border p-3 text-left ${active ? "border-[#d7ff3f] bg-[#d7ff3f]/10 ring-1 ring-[#d7ff3f]" : "hover:bg-muted"}`}><span className="size-11 shrink-0 rounded-full bg-muted bg-cover bg-center" style={player.imageUrl ? { backgroundImage: `url(${player.imageUrl})` } : undefined} /><span className="min-w-0"><b className="block truncate">{player.name}</b><small className="text-muted-foreground">#{player.number ?? "—"} · {player.position ?? "Player"}</small></span>{active && <span className="absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-[#d7ff3f] text-black"><Check className="size-3" /></span>}</button>})}</div></CardContent></Card>
    <div className="grid gap-5 md:grid-cols-2"><Squad title="Starting five" players={team.players.filter((player) => starters.includes(player.id))} /><Squad title="Bench" players={bench} /></div>
    <div className="sticky bottom-4 flex items-center justify-between rounded-2xl border bg-card/95 p-4 shadow-xl backdrop-blur"><p className="text-sm text-muted-foreground">{message || (starters.length === 5 ? "Ready to save" : `Select ${5 - starters.length} more`)}</p><Button type="button" onClick={save} disabled={pending || starters.length !== 5}><Save className="size-4" />{pending ? "Saving…" : `Save ${team.name}`}</Button></div>
  </div>;
}

function Squad({ title, players }: { title: string; players: Player[] }) {
  return <Card><CardHeader><CardTitle className="flex justify-between">{title}<Badge variant="secondary">{players.length}</Badge></CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">{players.map((player) => <Badge key={player.id} variant="secondary">#{player.number ?? "—"} {player.name}</Badge>)}{!players.length && <p className="text-sm text-muted-foreground">No players selected.</p>}</CardContent></Card>;
}
