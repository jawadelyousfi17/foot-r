"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calculatePlayerRating, matchOutcome, ratingColor } from "@/lib/player-rating";
import { emptyStats, type StatValues } from "@/lib/match-stats";
import { Check, Minus, Plus, Save } from "@/components/icon";
import { saveMatchGoals } from "./actions";

type Player = { id: string; name: string; login: string | null; imageUrl: string | null; number: number | null; goals: number; assists: number; yellowCards: number; redCards: number; stats: StatValues };
type Team = { id: string; name: string; logoUrl: string | null; players: Player[] };
type Tally = { goals: number; assists: number; yellowCards: number; redCards: number };

const emptyTally: Tally = { goals: 0, assists: 0, yellowCards: 0, redCards: 0 };
// A second yellow is a sending off, and nobody is sent off twice.
const maximum: Record<keyof Tally, number> = { goals: Infinity, assists: Infinity, yellowCards: 2, redCards: 1 };

export function GoalsEditor({ matchId, homeTeam, awayTeam, expectedScore }: {
  matchId: string;
  homeTeam: Team;
  awayTeam: Team;
  expectedScore: { home: number; away: number } | null;
}) {
  const teams = [homeTeam, awayTeam];
  const [tallies, setTallies] = useState<Record<string, Tally>>(() =>
    Object.fromEntries(teams.flatMap((team) => team.players.map((p) => [p.id, { goals: p.goals, assists: p.assists, yellowCards: p.yellowCards, redCards: p.redCards }]))),
  );
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  const tally = (id: string) => tallies[id] ?? emptyTally;
  const sum = (team: Team, key: keyof Tally) => team.players.reduce((total, p) => total + tally(p.id)[key], 0);
  const teamGoals = (team: Team) => sum(team, "goals");

  // Every assist needs a goal to go with it, so more assists than goals is a
  // data-entry slip. The saved result is only a warning: saving overwrites it.
  const warnings: string[] = [];
  for (const team of teams) {
    if (sum(team, "assists") > teamGoals(team)) warnings.push(`${team.name} has more assists (${sum(team, "assists")}) than goals (${teamGoals(team)}).`);
  }
  if (expectedScore && (teamGoals(homeTeam) !== expectedScore.home || teamGoals(awayTeam) !== expectedScore.away)) {
    warnings.push(`Recorded score ${teamGoals(homeTeam)}–${teamGoals(awayTeam)} does not match the saved result ${expectedScore.home}–${expectedScore.away}. Saving will update the result.`);
  }

  function adjust(playerId: string, key: keyof Tally, delta: 1 | -1) {
    setTallies((current) => {
      const row = current[playerId] ?? emptyTally;
      return { ...current, [playerId]: { ...row, [key]: Math.min(maximum[key], Math.max(0, row[key] + delta)) } };
    });
    setMessage("");
  }

  function save() {
    startTransition(async () => {
      try {
        for (const team of teams) {
          await saveMatchGoals(matchId, team.id, team.players.map((p) => ({ playerId: p.id, ...tally(p.id) })));
        }
        setMessage("Goals, assists and cards saved");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not save");
      }
    });
  }

  return <div className="space-y-5">
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-2xl border bg-card/95 p-3 shadow-lg">
      <TeamHead team={homeTeam} />
      <div className="rounded-xl bg-[#d7ff3f] px-5 py-3 text-center">
        <p className="text-3xl font-black tabular-nums">{teamGoals(homeTeam)} : {teamGoals(awayTeam)}</p>
        <small className="font-bold uppercase tracking-wider">From scorers</small>
      </div>
      <TeamHead team={awayTeam} away />
    </div>

    {warnings.map((warning) => (
      <p key={warning} className="rounded-xl border border-orange-300 bg-orange-50 p-3 text-sm font-medium text-orange-900">{warning}</p>
    ))}

    <div className="grid gap-5 lg:grid-cols-2">
      {teams.map((team) => (
        <Card key={team.id}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              {team.name}
              <span className="flex items-center gap-2">
                <Badge variant="secondary">{teamGoals(team)} goals · {sum(team, "assists")} assists</Badge>
                {!!sum(team, "yellowCards") && <Badge className="bg-yellow-400 text-black">{sum(team, "yellowCards")} YC</Badge>}
                {!!sum(team, "redCards") && <Badge className="bg-red-600 text-white">{sum(team, "redCards")} RC</Badge>}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {team.players.map((player) => {
              const row = tally(player.id);
              // Preview the rating these edits would produce, based on the score
              // the scorers currently add up to — that sets the win/loss base.
              const opponent = team.id === homeTeam.id ? awayTeam : homeTeam;
              const rating = calculatePlayerRating(
                { ...(player.stats ?? emptyStats()), ...row },
                matchOutcome(teamGoals(team), teamGoals(opponent)),
              );
              const involved = row.goals > 0 || row.assists > 0;
              const booked = row.yellowCards > 0 || row.redCards > 0;
              return (
                <div key={player.id} className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 ${involved ? "border-black bg-[#d7ff3f]/25" : booked ? "border-red-300 bg-red-50" : "bg-muted/30"}`}>
                  <span className="size-9 shrink-0 rounded-full bg-muted bg-cover bg-center" style={player.imageUrl ? { backgroundImage: `url(${player.imageUrl})` } : undefined} />
                  <span className="min-w-0 flex-1">
                    <b className="block text-sm break-words">{player.name}</b>
                    <small className="block text-muted-foreground break-words">
                      #{player.number ?? "—"}{player.login && <> · <span className="font-mono">{player.login}</span></>}
                    </small>
                  </span>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-black ${ratingColor(rating)}`}>{rating.toFixed(1)}</span>
                  <Stepper label="Goals" value={row.goals} max={maximum.goals} onMinus={() => adjust(player.id, "goals", -1)} onPlus={() => adjust(player.id, "goals", 1)} />
                  <Stepper label="Assists" value={row.assists} max={maximum.assists} onMinus={() => adjust(player.id, "assists", -1)} onPlus={() => adjust(player.id, "assists", 1)} />
                  <Stepper label="Yellow" value={row.yellowCards} max={maximum.yellowCards} swatch="bg-yellow-400" onMinus={() => adjust(player.id, "yellowCards", -1)} onPlus={() => adjust(player.id, "yellowCards", 1)} />
                  <Stepper label="Red" value={row.redCards} max={maximum.redCards} swatch="bg-red-600" onMinus={() => adjust(player.id, "redCards", -1)} onPlus={() => adjust(player.id, "redCards", 1)} />
                </div>
              );
            })}
            {!team.players.length && <p className="py-8 text-center text-sm text-muted-foreground">This team has no players.</p>}
          </CardContent>
        </Card>
      ))}
    </div>

    <div className="sticky bottom-4 z-20 flex items-center justify-between gap-3 rounded-2xl border bg-card/95 p-4 shadow-xl backdrop-blur">
      <p className={`flex items-center gap-2 text-sm font-medium ${message.includes("saved") ? "text-emerald-700" : "text-muted-foreground"}`}>
        {pending ? <span className="size-2 animate-pulse rounded-full bg-orange-500" /> : <Check className="size-4" />}
        {message || "Rating: goal +1.25, assist +0.8, yellow −0.3, red −1.1."}
      </p>
      <Button type="button" onClick={save} disabled={pending}><Save className="size-4" />Save</Button>
    </div>
  </div>;
}

function TeamHead({ team, away }: { team: Team; away?: boolean }) {
  return <div className={`flex min-w-0 items-center gap-3 p-2 ${away ? "flex-row-reverse text-right" : ""}`}>
    <span className="size-10 shrink-0 rounded-lg bg-white bg-contain bg-center bg-no-repeat" style={team.logoUrl ? { backgroundImage: `url(${team.logoUrl})` } : undefined} />
    <b className="min-w-0 truncate">{team.name}</b>
  </div>;
}

function Stepper({ label, value, max, swatch, onMinus, onPlus }: { label: string; value: number; max: number; swatch?: string; onMinus: () => void; onPlus: () => void }) {
  return <div className="flex items-center gap-1.5">
    <span className="flex w-14 items-center justify-end gap-1 text-right text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
      {swatch && <span className={`h-3 w-2 shrink-0 rounded-[2px] ${swatch}`} />}{label}
    </span>
    <Button type="button" variant="outline" size="icon-sm" onClick={onMinus} disabled={!value} aria-label={`Remove ${label}`}><Minus /></Button>
    <b className="w-6 text-center tabular-nums">{value}</b>
    <Button type="button" size="icon-sm" onClick={onPlus} disabled={value >= max} aria-label={`Add ${label}`}><Plus /></Button>
  </div>;
}
