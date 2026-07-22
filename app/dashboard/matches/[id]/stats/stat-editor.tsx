"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { emptyStats, statGroups, type StatKey, type StatValues } from "@/lib/match-stats";
import { calculatePlayerRating, matchOutcome, ratingColor } from "@/lib/player-rating";
import { Check, Clock3, Maximize2, Minimize2, Minus, Plus, RotateCcw, Save, Zap } from "@/components/icon";
import { saveTeamStats } from "./actions";

type Player = { id: string; name: string; imageUrl: string | null; number: number | null; position: string | null; stats: StatValues };
type Team = { id: string; name: string; logoUrl: string | null; players: Player[] };
type Changes = Partial<Record<StatKey, number>>;
type LiveEvent = { id: number; teamId: string; playerId: string; playerName: string; label: string; changes: Changes; time: string };

const quickEvents: Array<{ label: string; changes: Changes; accent?: string }> = [
  { label: "Correct pass", changes: { passes: 1, accuratePasses: 1 } },
  { label: "Missed pass", changes: { passes: 1, missedPasses: 1 } },
  { label: "Touch", changes: { touches: 1 } },
  { label: "Duel won", changes: { duelsWon: 1 } },
  { label: "Duel lost", changes: { duelsLost: 1 } },
  { label: "Goal", changes: { goals: 1, shots: 1, shotsOnTarget: 1 }, accent: "bg-[#d7ff3f] text-black hover:bg-[#c5ed2f]" },
  { label: "Assist", changes: { assists: 1 } },
  { label: "Shot on target", changes: { shots: 1, shotsOnTarget: 1 } },
  { label: "Shot off target", changes: { shots: 1 } },
  { label: "Save", changes: { saves: 1 }, accent: "bg-blue-600 text-white hover:bg-blue-700" },
  { label: "Tackle", changes: { tackles: 1 } },
  { label: "Interception", changes: { interceptions: 1 } },
  { label: "Foul made", changes: { fouls: 1 }, accent: "bg-orange-500 text-white hover:bg-orange-600" },
  { label: "Foul won", changes: { foulsWon: 1 } },
  { label: "Corner", changes: { corners: 1 } },
  { label: "Penalty", changes: { penalties: 1 } },
  { label: "Yellow card", changes: { yellowCards: 1 }, accent: "bg-yellow-400 text-black hover:bg-yellow-500" },
  { label: "Red card", changes: { redCards: 1 }, accent: "bg-red-600 text-white hover:bg-red-700" },
];

export function StatEditor({ matchId, homeTeam, awayTeam }: { matchId: string; homeTeam: Team; awayTeam: Team }) {
  const teams = [homeTeam, awayTeam];
  const [teamId, setTeamId] = useState(homeTeam.id);
  const team = teams.find((item) => item.id === teamId) ?? homeTeam;
  const [playerId, setPlayerId] = useState(homeTeam.players[0]?.id ?? "");
  const [values, setValues] = useState<Record<string, StatValues>>(() => Object.fromEntries(teams.flatMap((item) => item.players.map((player) => [player.id, player.stats]))));
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("Live autosave ready");
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const eventId = useRef(0);
  const editorRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const player = team.players.find((item) => item.id === playerId) ?? team.players[0];
  const totals = useMemo(() => team.players.reduce((sum, item) => sum + Object.values(values[item.id] ?? emptyStats()).reduce((a, b) => a + b, 0), 0), [team, values]);
  const teamGoals = (target: Team) => target.players.reduce((sum, item) => sum + (values[item.id]?.goals ?? 0), 0);
  // Rating previews use the live score, so the base shifts as the game turns.
  const outcome = matchOutcome(teamGoals(team), teamGoals(team.id === homeTeam.id ? awayTeam : homeTeam));

  useEffect(() => {
    const handleFullscreen = () => setFullscreen(document.fullscreenElement === editorRef.current);
    document.addEventListener("fullscreenchange", handleFullscreen);
    return () => document.removeEventListener("fullscreenchange", handleFullscreen);
  }, []);

  async function toggleFullscreen() {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await editorRef.current?.requestFullscreen();
  }

  function persist(targetTeam: Team, snapshot: Record<string, StatValues>, auto = false) {
    startTransition(async () => {
      try {
        await saveTeamStats(matchId, targetTeam.id, targetTeam.players.map((item) => ({ playerId: item.id, values: snapshot[item.id] ?? emptyStats() })));
        setMessage(auto ? "Saved live" : `${targetTeam.name} saved`);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not save statistics");
      }
    });
  }

  function queueAutosave(targetTeamId: string, snapshot: Record<string, StatValues>) {
    const existingTimer = timers.current.get(targetTeamId);
    if (existingTimer) clearTimeout(existingTimer);
    setMessage("Saving changes…");
    timers.current.set(targetTeamId, setTimeout(() => {
      const targetTeam = teams.find((item) => item.id === targetTeamId);
      if (targetTeam) persist(targetTeam, snapshot, true);
      timers.current.delete(targetTeamId);
    }, 700));
  }

  function chooseTeam(id: string) {
    const next = teams.find((item) => item.id === id)!;
    setTeamId(id);
    setPlayerId(next.players[0]?.id ?? "");
  }

  function applyChanges(targetPlayerId: string, targetTeamId: string, changes: Changes, direction: 1 | -1) {
    setValues((current) => {
      const playerValues = current[targetPlayerId] ?? emptyStats();
      const updated = { ...playerValues };
      for (const [key, amount] of Object.entries(changes) as Array<[StatKey, number]>) updated[key] = Math.max(0, updated[key] + amount * direction);
      const next = { ...current, [targetPlayerId]: updated };
      queueAutosave(targetTeamId, next);
      return next;
    });
  }

  function record(label: string, changes: Changes) {
    if (!player) return;
    applyChanges(player.id, team.id, changes, 1);
    setEvents((current) => [{ id: ++eventId.current, teamId: team.id, playerId: player.id, playerName: player.name, label, changes, time: new Intl.DateTimeFormat("en", { timeStyle: "medium" }).format(new Date()) }, ...current].slice(0, 30));
  }

  function undo(event: LiveEvent) {
    applyChanges(event.playerId, event.teamId, event.changes, -1);
    setEvents((current) => current.filter((item) => item.id !== event.id));
  }

  function adjust(key: StatKey, amount: 1 | -1) {
    if (player) applyChanges(player.id, team.id, { [key]: 1 }, amount);
  }

  return <div ref={editorRef} className={`space-y-5 ${fullscreen ? "h-screen overflow-y-auto bg-background p-5" : ""}`}>
    <div className={`flex justify-end ${fullscreen ? "fixed right-4 top-4 z-50" : ""}`}><Button type="button" variant="outline" onClick={toggleFullscreen}>{fullscreen ? <Minimize2 /> : <Maximize2 />}{fullscreen ? "Exit fullscreen" : "Stats fullscreen"}</Button></div>
    {!fullscreen && <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-2xl border bg-card/95 p-2 shadow-lg"><TeamSwitch team={homeTeam} active={team.id === homeTeam.id} onClick={() => chooseTeam(homeTeam.id)} /><div className="rounded-xl bg-[#d7ff3f] px-4 py-3 text-center"><p className="text-2xl font-black tabular-nums">{teamGoals(homeTeam)} : {teamGoals(awayTeam)}</p><small className="font-bold uppercase tracking-wider">Live score</small></div><TeamSwitch team={awayTeam} active={team.id === awayTeam.id} onClick={() => chooseTeam(awayTeam.id)} away /></div>}

    <Card>
      <CardHeader><CardTitle className="flex items-center justify-between">1. Select player <Badge variant="secondary">{team.players.length}</Badge></CardTitle></CardHeader>
      <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">{team.players.map((item) => { const rating=calculatePlayerRating(values[item.id] ?? emptyStats(), outcome); return <button key={item.id} type="button" onClick={() => setPlayerId(item.id)} className={`relative flex items-center gap-2 rounded-xl border p-2 text-left ${item.id === player?.id ? "border-black bg-[#d7ff3f] ring-2 ring-black" : "hover:bg-muted"}`}><span className="size-10 shrink-0 rounded-full bg-muted bg-cover bg-center" style={item.imageUrl ? { backgroundImage: `url(${item.imageUrl})` } : undefined} /><span className="min-w-0"><b className="block truncate pr-7 text-sm">{item.name}</b><small>#{item.number ?? "—"}</small></span><span className={`absolute right-2 top-2 rounded px-1.5 py-0.5 text-[10px] font-black ${ratingColor(rating)}`}>{rating.toFixed(1)}</span></button>})}</CardContent>
    </Card>

    {player ? <div className={fullscreen ? "" : "grid gap-5 xl:grid-cols-[1fr_20rem]"}>
      <div className="space-y-5">
        <Card className="border-black bg-[#151712] text-white">
          <CardHeader><CardTitle className="flex flex-wrap items-center justify-between gap-3"><span className="flex items-center gap-2"><Zap className="size-5 text-[#d7ff3f]" />2. Tap the event for {player.name}</span><span className="flex items-center gap-2"><span className={`rounded-lg px-3 py-1 text-sm font-black ${ratingColor(calculatePlayerRating(values[player.id] ?? emptyStats(), outcome))}`}>Rating {calculatePlayerRating(values[player.id] ?? emptyStats(), outcome).toFixed(1)}</span><Badge className="bg-white/10 text-white">{totals} team actions</Badge></span></CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">{quickEvents.map((event) => <Button key={event.label} type="button" size="lg" onClick={() => record(event.label, event.changes)} className={`h-14 justify-start text-sm font-black ${event.accent ?? "bg-white text-black hover:bg-white/85"}`}><Plus className="size-4" />{event.label}</Button>)}</CardContent>
        </Card>

        {!fullscreen && <details className="group rounded-2xl border bg-card"><summary className="cursor-pointer list-none p-5 font-black">Detailed counters and corrections <span className="ml-2 text-sm font-normal text-muted-foreground">Open to adjust totals manually</span></summary><div className="space-y-5 border-t p-5">{statGroups.map((group) => <div key={group.title}><h3 className="mb-3 font-black">{group.title}</h3><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{group.fields.map(([key, label]) => <Counter key={key} label={label} value={values[player.id]?.[key] ?? 0} onMinus={() => adjust(key, -1)} onPlus={() => adjust(key, 1)} />)}</div></div>)}</div></details>}
      </div>

      {!fullscreen && <Card className="h-fit xl:sticky xl:top-40">
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock3 className="size-4" /> Recent events</CardTitle></CardHeader>
        <CardContent className="max-h-[36rem] space-y-2 overflow-y-auto">{events.map((event) => <div key={event.id} className="flex items-center justify-between gap-2 rounded-xl bg-muted p-3"><div className="min-w-0"><b className="block truncate text-sm">{event.label}</b><p className="truncate text-xs text-muted-foreground">{event.playerName} · {event.time}</p></div><Button type="button" variant="ghost" size="icon-sm" onClick={() => undo(event)} title="Undo event"><RotateCcw /></Button></div>)}{!events.length && <p className="py-8 text-center text-sm text-muted-foreground">Events you add will appear here with a quick undo button.</p>}</CardContent>
      </Card>}
    </div> : <Card><CardContent className="p-10 text-center text-muted-foreground">This team has no players.</CardContent></Card>}

    {!fullscreen && <div className="sticky bottom-4 z-20 flex items-center justify-between rounded-2xl border bg-card/95 p-4 shadow-xl backdrop-blur"><p className={`flex items-center gap-2 text-sm font-medium ${message.includes("Saved") || message.includes("saved") ? "text-emerald-700" : "text-muted-foreground"}`}>{pending ? <span className="size-2 animate-pulse rounded-full bg-orange-500" /> : <Check className="size-4" />}{message}</p><Button type="button" onClick={() => persist(team, values)} disabled={pending || !team.players.length}><Save className="size-4" />Save now</Button></div>}
  </div>;
}

function TeamSwitch({ team, active, onClick, away }: { team: Team; active: boolean; onClick: () => void; away?: boolean }) {
  return <button type="button" onClick={onClick} className={`flex min-w-0 items-center gap-3 rounded-xl p-3 text-left transition ${away ? "flex-row-reverse text-right" : ""} ${active ? "bg-black text-white" : "hover:bg-muted"}`}><span className="size-10 shrink-0 rounded-lg bg-white bg-contain bg-center bg-no-repeat" style={team.logoUrl ? { backgroundImage: `url(${team.logoUrl})` } : undefined} /><span className="min-w-0"><b className="block truncate">{team.name}</b><small className={active ? "text-white/50" : "text-muted-foreground"}>{team.players.length} players</small></span></button>;
}

function Counter({ label, value, onMinus, onPlus }: { label: string; value: number; onMinus: () => void; onPlus: () => void }) {
  return <div className="flex items-center justify-between rounded-xl border bg-muted/30 p-3"><span className="text-sm font-semibold">{label}</span><div className="flex items-center gap-2"><Button type="button" variant="outline" size="icon-sm" onClick={onMinus} disabled={!value}><Minus /></Button><b className="w-8 text-center text-lg tabular-nums">{value}</b><Button type="button" size="icon-sm" onClick={onPlus}><Plus /></Button></div></div>;
}
