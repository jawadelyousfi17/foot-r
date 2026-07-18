"use client";

import { type ReactNode, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Pencil, Plus, Search, Trash2, Users } from "@/components/icon";
import {
  addCompetitionTeamsAction,
  assignGroupTeamsAction,
  createGroupsAction,
  generateKnockoutStageAction,
  deleteGroupAction,
  generateFixturesAction,
  updateGroupAction,
} from "./actions";

type Team = { id: string; name: string; shortName: string | null; logoUrl: string | null };
type Group = { id: string; name: string; teams: Team[]; rankedTeams: Array<{ id: string; name: string; position: number; points: number; goalDifference: number; goalsFor: number }>; qualificationConfirmed: boolean };

export function CompetitionBuilder({
  competitionId,
  allTeams,
  registeredTeams,
  groups,
  hasGeneratedFixtures,
  knockoutStages,
  fixtures,
  results,
}: {
  competitionId: string;
  allTeams: Team[];
  registeredTeams: Team[];
  groups: Group[];
  hasGeneratedFixtures: boolean;
  knockoutStages: number[];
  fixtures: ReactNode;
  results: ReactNode;
}) {
  const registeredIds = new Set(registeredTeams.map((team) => team.id));
  const availableTeams = allTeams.filter((team) => !registeredIds.has(team.id));
  const assignedIds = new Set(groups.flatMap((group) => group.teams.map((team) => team.id)));
  const unassignedTeams = registeredTeams.filter((team) => !assignedIds.has(team.id));
  return (
    <Tabs defaultValue="teams" className="mt-8">
      <TabsList className="grid h-auto w-full grid-cols-5 p-1 md:w-fit md:min-w-3xl">
        <TabsTrigger value="teams" className="py-2">Teams</TabsTrigger>
        <TabsTrigger value="groups" className="py-2">Groups</TabsTrigger>
        <TabsTrigger value="fixtures" className="py-2">Fixtures</TabsTrigger>
        <TabsTrigger value="knockout" className="py-2">Knockout</TabsTrigger>
        <TabsTrigger value="results" className="py-2">Results</TabsTrigger>
      </TabsList>

      <TabsContent value="teams" className="mt-6">
      <Card>
        <CardHeader>
          <StepTitle step="01" title="Competition teams" count={registeredTeams.length} />
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Choose all participating teams at once.</p>
          <TeamPicker
            title="Add teams to competition"
            description={`${availableTeams.length} public teams are available.`}
            teams={availableTeams}
            action={addCompetitionTeamsAction.bind(null, competitionId)}
            triggerLabel={registeredTeams.length ? "Add more teams" : "Choose teams"}
          />
          <TeamChips teams={registeredTeams} empty="No teams selected yet." />
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="groups" className="mt-6 grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <StepTitle step="02" title="Create groups" count={groups.length} />
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Enter a number and groups are named automatically from A onward.</p>
          <form action={createGroupsAction.bind(null, competitionId)} className="flex gap-2">
            <Input name="count" type="number" min="1" max="26" defaultValue="8" required aria-label="Number of groups" />
            <SubmitButton idle="Create groups" pending="Creating…" />
          </form>
          <div className="flex flex-wrap gap-2">
            {[4, 6, 8].map((count) => (
              <form action={createGroupsAction.bind(null, competitionId)} key={count}>
                <input type="hidden" name="count" value={count} />
                <Button type="submit" variant="outline" size="sm">{count} groups</Button>
              </form>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {groups.map((group) => <div key={group.id} className="rounded-lg bg-muted p-3 text-sm font-semibold">{group.name}</div>)}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <StepTitle step="03" title="Fill the groups" count={assignedIds.size} />
        </CardHeader>
        <CardContent>
          {!groups.length ? <Empty text="Create groups first." /> : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {groups.map((group) => (
                <div key={group.id} className="rounded-xl border p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold">{group.name}</h3>
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary">{group.teams.length} teams</Badge>
                      <EditGroup competitionId={competitionId} group={group} />
                      <DeleteGroup competitionId={competitionId} group={group} />
                    </div>
                  </div>
                  <TeamChips teams={group.teams} empty="Empty group" compact />
                  <TeamPicker
                    title={`Assign teams to ${group.name}`}
                    description="Select multiple unassigned teams and add them in one shot."
                    teams={unassignedTeams}
                    action={assignGroupTeamsAction.bind(null, competitionId)}
                    triggerLabel="Assign teams"
                    groupId={group.id}
                    small
                  />
                </div>
              ))}
            </div>
          )}
          {!!groups.length && !unassignedTeams.length && registeredTeams.length > 0 && (
            <p className="mt-4 flex items-center gap-2 text-sm font-medium text-emerald-700"><Check className="size-4" /> All competition teams are assigned.</p>
          )}
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="fixtures" className="mt-6">
      {!hasGeneratedFixtures && (
      <Card className="lg:col-span-2">
        <CardHeader><StepTitle step="04" title="Generate group fixtures" /></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Choose the format once. Every possible matchup is generated automatically for all eligible groups.</p>
          <form action={generateFixturesAction.bind(null, competitionId)} className="grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="text-sm font-medium">Format
              <select name="legs" required defaultValue="1" className={field}>
                <option value="1">One match per pairing</option>
                <option value="2">Home + away</option>
              </select>
            </label>
            <div className="self-end"><SubmitButton idle="Generate for all groups" pending="Generating all groups…" disabled={!groups.some((group) => group.teams.length >= 2)} /></div>
          </form>
          <p className="text-xs text-muted-foreground">Groups with fewer than two teams are skipped. Existing fixtures are not duplicated.</p>
        </CardContent>
      </Card>
      )}
      {hasGeneratedFixtures && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
          Group fixtures generated. Edit each match date and time below.
        </div>
      )}
      <div className="mt-6">{fixtures}</div>
      </TabsContent>

      <TabsContent value="knockout" className="mt-6">
        <KnockoutStageBuilder competitionId={competitionId} groups={groups} createdStages={knockoutStages} />
      </TabsContent>

      <TabsContent value="results" className="mt-6">{results}</TabsContent>
    </Tabs>
  );
}

function KnockoutStageBuilder({ competitionId, groups, createdStages }: { competitionId: string; groups: Group[]; createdStages: number[] }) {
  const [qualifiersPerGroup, setQualifiersPerGroup] = useState(2);
  const [bestNextPlaced, setBestNextPlaced] = useState(0);
  const [pairSlots, setPairSlots] = useState(() => groups.map((group) => group.id));
  const qualifiedCount = groups.length * qualifiersPerGroup + bestNextPlaced;
  const stageSize = qualifiedCount >= 2 ? 2 ** Math.ceil(Math.log2(qualifiedCount)) : 2;
  const byes = stageSize - qualifiedCount;
  const laneCount = Math.floor(groups.length / 2);
  const groupPairs = Array.from({ length: laneCount }, (_, index) =>
    groups.length % 2 === 1 && index === laneCount - 1 ? pairSlots.slice(index * 2) : pairSlots.slice(index * 2, index * 2 + 2),
  );
  const standingsConfirmed = groups.every((group) => group.qualificationConfirmed);
  const previewDirect = groups.flatMap((group) => group.rankedTeams.slice(0, qualifiersPerGroup).map((team) => ({ ...team, groupId: group.id, name: group.qualificationConfirmed ? team.name : `${group.name} ${ordinal(team.position)}` })));
  previewDirect.sort((a, b) => a.position - b.position || b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor || a.name.localeCompare(b.name));
  const previewWildcards = groups
    .flatMap((group) => {
      const team = group.rankedTeams[qualifiersPerGroup];
      return team ? [{ ...team, groupId: group.id }] : [];
    })
    .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor || a.name.localeCompare(b.name))
    .slice(0, bestNextPlaced)
    .map((team, index) => ({ ...team, name: standingsConfirmed ? team.name : `Best ${ordinal(qualifiersPerGroup + 1)} #${index + 1}` }));
  const previewPlaying = [...previewDirect, ...previewWildcards].slice(-Math.max(0, qualifiedCount - stageSize / 2) * 2);
  const preferredGroups = new Map<string, Set<string>>();
  groupPairs.forEach((lane) => lane.forEach((groupId) => preferredGroups.set(groupId, new Set(lane.filter((candidate) => candidate !== groupId)))));
  const pairings: Array<{ top: string; bottom: string }> = [];
  while (previewPlaying.length >= 2) {
    const home = previewPlaying.shift()!;
    const complementary = qualifiersPerGroup + 1 - home.position;
    const preferred = preferredGroups.get(home.groupId) ?? new Set<string>();
    let opponentIndex = previewPlaying.findIndex((team) => preferred.has(team.groupId) && team.position === complementary);
    if (opponentIndex < 0) opponentIndex = previewPlaying.findIndex((team) => preferred.has(team.groupId));
    if (opponentIndex < 0) opponentIndex = previewPlaying.findIndex((team) => team.groupId !== home.groupId);
    if (opponentIndex < 0) opponentIndex = 0;
    const [away] = previewPlaying.splice(opponentIndex, 1);
    pairings.push({ top: home.name, bottom: away.name });
  }
  const uniqueSlots = new Set(pairSlots);
  const maxDirect = Math.min(8, ...groups.map((group) => group.rankedTeams.length || 0));
  const eligibleNextPlaced = groups.filter((group) => group.rankedTeams.length > qualifiersPerGroup).length;
  const hasCreatedKnockout = createdStages.length > 0;
  const ready = groups.length >= 2 && uniqueSlots.size === groups.length && pairSlots.every(Boolean) && maxDirect >= qualifiersPerGroup && bestNextPlaced <= eligibleNextPlaced && qualifiedCount <= 64 && (standingsConfirmed || hasCreatedKnockout);
  const laterRounds = [32, 16, 8, 4, 2].filter((size) => size < stageSize);

  function setPairSlot(index: number, groupId: string) {
    setPairSlots((slots) => slots.map((value, slotIndex) => slotIndex === index ? groupId : value));
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Qualification & bracket setup</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium">Teams qualifying from every group
              <select value={qualifiersPerGroup} onChange={(event) => { setQualifiersPerGroup(Number(event.target.value)); setBestNextPlaced(0); }} className={field}>
                {Array.from({ length: Math.max(1, maxDirect) }, (_, index) => index + 1).map((count) => <option key={count} value={count}>Top {count} {count === 1 ? "team" : "teams"} from each group</option>)}
              </select>
            </label>
            <label className="text-sm font-medium">Best {ordinal(qualifiersPerGroup + 1)}-placed teams
              <select value={bestNextPlaced} onChange={(event) => setBestNextPlaced(Number(event.target.value))} className={field}>
                {Array.from({ length: eligibleNextPlaced + 1 }, (_, count) => <option key={count} value={count}>{count === 0 ? "None" : `Best ${count} across all groups`}</option>)}
              </select>
            </label>
          </div>

          <div className="rounded-xl border border-[#d7ff3f]/30 bg-[#d7ff3f]/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><b>Round of {stageSize}</b><span className="text-sm">{qualifiedCount} qualified · {byes} {byes === 1 ? "bye" : "byes"}</span></div>
            <p className="mt-1 text-xs text-muted-foreground">The round is selected automatically. Best extra teams are ranked by points, goal difference, goals scored, then name.</p>
          </div>

          <div>
            <p className="text-sm font-bold">Qualified team slots</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {groups.flatMap((group) => Array.from({ length: qualifiersPerGroup }, (_, rank) => (
                <Badge key={`${group.id}-${rank}`} variant="secondary">
                  {group.qualificationConfirmed && group.rankedTeams[rank]?.name ? group.rankedTeams[rank].name : `${group.name} ${ordinal(rank + 1)}`}
                </Badge>
              )))}
              {Array.from({ length: bestNextPlaced }, (_, index) => <Badge key={`best-next-${index}`} variant="outline">{standingsConfirmed && previewWildcards[index]?.name ? previewWildcards[index].name : `Best ${ordinal(qualifiersPerGroup + 1)} #${index + 1}`}</Badge>)}
            </div>
          </div>

          <div>
            <p className="text-sm font-bold">Choose the group crossover lanes</p>
            <p className="mt-1 text-xs text-muted-foreground">Groups inside a lane cross over in the opening round. Put lanes on opposite bracket sides to keep them apart until the final.</p>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {groupPairs.map((pair, pairIndex) => (
                <div key={pairIndex} className="rounded-xl border p-4">
                  <div className="mb-3 flex items-center justify-between"><b className="text-sm">{pairIndex < Math.ceil(groupPairs.length / 2) ? "Left side" : "Right side"} · Lane {pairIndex + 1}</b><Badge variant="secondary">Crossover</Badge></div>
                  <div className={`grid items-center gap-2 ${pair.length === 3 ? "grid-cols-3" : "grid-cols-[1fr_auto_1fr]"}`}>
                    {pair.map((groupId, groupIndex) => (
                      <div key={groupIndex} className="contents">
                        {groupIndex > 0 && pair.length === 2 && <span className="text-xs font-black text-muted-foreground">VS</span>}
                        <select aria-label={`Group ${groupIndex + 1} in lane ${pairIndex + 1}`} value={groupId} onChange={(event) => setPairSlot(pairIndex * 2 + groupIndex, event.target.value)} className={field}>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select>
                      </div>
                    ))}
                  </div>
                  {pair.length === 3 && <p className="mt-2 text-xs text-muted-foreground">Three-group lane: fixtures are distributed across all three groups.</p>}
                </div>
              ))}
            </div>
            {uniqueSlots.size !== groups.length && <p className="mt-2 text-sm text-destructive">Use every group exactly once.</p>}
          </div>

          <form action={generateKnockoutStageAction.bind(null, competitionId)}>
            <input type="hidden" name="qualifiersPerGroup" value={qualifiersPerGroup} />
            <input type="hidden" name="bestNextPlaced" value={bestNextPlaced} />
            <input type="hidden" name="groupPairs" value={JSON.stringify(groupPairs)} />
            <SubmitButton idle={hasCreatedKnockout ? `Recreate as round of ${stageSize}` : `Create round of ${stageSize}`} pending={hasCreatedKnockout ? "Recreating bracket…" : "Creating bracket…"} disabled={!ready} />
          </form>
          {hasCreatedKnockout && <p className="text-xs text-destructive">Recreating replaces all existing knockout fixtures and deletes their saved results. Group-stage matches are not changed.</p>}
          {!standingsConfirmed && <p className="text-sm text-amber-600">Team names will be revealed after every group match is completed. Until then, the bracket uses group-position placeholders.{hasCreatedKnockout ? " Recreation uses the current provisional standings." : ""}</p>}
          {!ready && standingsConfirmed && uniqueSlots.size === groups.length && <p className="text-sm text-destructive">Every group needs enough ranked teams for this rule, and the qualified field cannot exceed 64 teams.</p>}
        </CardContent>
      </Card>

      <section>
        <div className="mb-4"><p className="text-xs font-bold uppercase tracking-[.2em] text-muted-foreground">Bracket preview</p><h2 className="mt-2 text-3xl font-black">Road to the final</h2></div>
        <div className="overflow-x-auto pb-4">
          <div className="flex min-w-max items-stretch gap-5">
            <BracketRound title={`Round of ${stageSize}`} matches={pairings} />
            {laterRounds.map((size) => <BracketRound key={size} title={size === 2 ? "Final" : `Round of ${size}`} matches={Array.from({ length: size / 2 }, (_, index) => ({ top: `Winner match ${index * 2 + 1}`, bottom: `Winner match ${index * 2 + 2}` }))} muted />)}
          </div>
        </div>
      </section>
    </div>
  );
}

function ordinal(value: number) {
  const remainder = value % 100;
  if (remainder >= 11 && remainder <= 13) return `${value}th`;
  return `${value}${value % 10 === 1 ? "st" : value % 10 === 2 ? "nd" : value % 10 === 3 ? "rd" : "th"}`;
}

function BracketRound({ title, matches, muted }: { title: string; matches: Array<{ top: string; bottom: string }>; muted?: boolean }) {
  return <div className="w-64"><h3 className="mb-3 text-sm font-black">{title}</h3><div className="flex h-full flex-col justify-around gap-3">{matches.map((match, index) => <div key={`${match.top}-${index}`} className={`overflow-hidden rounded-xl border bg-white shadow-sm ${muted ? "opacity-60" : ""}`}><div className="border-b px-3 py-2 text-sm font-semibold">{match.top}</div><div className="px-3 py-2 text-sm font-semibold">{match.bottom}</div></div>)}</div></div>;
}

function EditGroup({ competitionId, group }: { competitionId: string; group: Group }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button type="button" variant="ghost" size="icon-sm" />}><Pencil className="size-3.5" /><span className="sr-only">Edit {group.name}</span></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit group</DialogTitle><DialogDescription>Change the group name.</DialogDescription></DialogHeader>
        <form action={updateGroupAction.bind(null, competitionId)} className="space-y-4">
          <input type="hidden" name="groupId" value={group.id} />
          <Input name="name" defaultValue={group.name} required autoFocus />
          <DialogFooter><SubmitButton idle="Save changes" pending="Saving…" /></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteGroup({ competitionId, group }: { competitionId: string; group: Group }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button type="button" variant="ghost" size="icon-sm" className="text-destructive" />}><Trash2 className="size-3.5" /><span className="sr-only">Delete {group.name}</span></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Delete {group.name}?</DialogTitle><DialogDescription>This removes the group, its team assignments, and all fixtures generated for this group. This cannot be undone.</DialogDescription></DialogHeader>
        <form action={deleteGroupAction.bind(null, competitionId)}>
          <input type="hidden" name="groupId" value={group.id} />
          <DialogFooter><SubmitButton idle="Delete group" pending="Deleting…" /></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TeamPicker({ title, description, teams, action, triggerLabel, groupId, small }: {
  title: string;
  description: string;
  teams: Team[];
  action: (data: FormData) => void | Promise<void>;
  triggerLabel: string;
  groupId?: string;
  small?: boolean;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => teams.filter((team) => team.name.toLowerCase().includes(query.toLowerCase())), [teams, query]);
  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);

  return (
    <Dialog>
      <DialogTrigger render={<Button type="button" variant={small ? "outline" : "default"} size={small ? "sm" : "default"} disabled={!teams.length} className={small ? "mt-3 w-full" : "w-full"} />}>
        <Plus className="size-4" /> {teams.length ? triggerLabel : "No teams available"}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
        <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search teams…" className="pl-9" /></div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{selected.length} selected</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(selected.length === filtered.length ? [] : filtered.map((team) => team.id))}>{selected.length === filtered.length ? "Clear" : "Select all"}</Button>
        </div>
        <div className="grid max-h-[45vh] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
          {filtered.map((team) => (
            <button type="button" key={team.id} onClick={() => toggle(team.id)} className="flex items-center gap-3 rounded-xl border p-3 text-left hover:bg-muted">
              <Checkbox checked={selected.includes(team.id)} aria-label={`Select ${team.name}`} />
              {team.logoUrl ? <span className="size-9 rounded-lg bg-cover bg-center" style={{ backgroundImage: `url(${team.logoUrl})` }} /> : <span className="grid size-9 place-items-center rounded-lg bg-muted"><Users className="size-4" /></span>}
              <span><b className="block">{team.name}</b><small className="text-muted-foreground">{team.shortName ?? "Public team"}</small></span>
            </button>
          ))}
        </div>
        <form action={action}>
          {groupId && <input type="hidden" name="groupId" value={groupId} />}
          {selected.map((id) => <input key={id} type="hidden" name="teamIds" value={id} />)}
          <DialogFooter><SubmitButton idle={`Add ${selected.length} team${selected.length === 1 ? "" : "s"}`} pending="Adding…" disabled={!selected.length} /></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SubmitButton({ idle, pending, disabled }: { idle: string; pending: string; disabled?: boolean }) {
  const status = useFormStatus();
  return <Button type="submit" disabled={disabled || status.pending}>{status.pending ? pending : idle}</Button>;
}

function StepTitle({ step, title, count }: { step: string; title: string; count?: number }) {
  return <CardTitle className="flex items-center gap-3"><span className="font-mono text-sm text-muted-foreground">{step}</span>{title}{count !== undefined && <Badge variant="secondary" className="ml-auto">{count}</Badge>}</CardTitle>;
}

function TeamChips({ teams, empty, compact }: { teams: Team[]; empty: string; compact?: boolean }) {
  if (!teams.length) return <p className={`${compact ? "mt-3" : ""} text-sm text-muted-foreground`}>{empty}</p>;
  return <div className={`${compact ? "mt-3 flex-col" : "flex-row flex-wrap"} flex gap-2`}>{teams.map((team) => <Badge key={team.id} variant="secondary" className={compact ? "justify-start" : ""}>{team.name}</Badge>)}</div>;
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{text}</p>;
}

const field = "mt-1.5 h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50";
