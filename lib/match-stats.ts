export const statGroups = [
  { title: "Passing & ball", fields: [["passes", "Passes"], ["accuratePasses", "Correct passes"], ["missedPasses", "Missed passes"], ["touches", "Touches"]] },
  { title: "Attack", fields: [["goals", "Goals"], ["assists", "Assists"], ["shots", "Shots"], ["shotsOnTarget", "Shots on target"], ["corners", "Corners"], ["penalties", "Penalties"]] },
  { title: "Duels & defending", fields: [["duelsWon", "Duels won"], ["duelsLost", "Duels lost"], ["tackles", "Tackles"], ["interceptions", "Interceptions"]] },
  { title: "Discipline", fields: [["fouls", "Fouls made"], ["foulsWon", "Fouls won"], ["yellowCards", "Yellow cards"], ["redCards", "Red cards"]] },
  { title: "Goalkeeping", fields: [["saves", "Saves"]] },
] as const;

export type StatKey = (typeof statGroups)[number]["fields"][number][0];
export type StatValues = Record<StatKey, number>;
export const statKeys = statGroups.flatMap((group) => group.fields.map(([key]) => key)) as StatKey[];

export function emptyStats(): StatValues {
  return Object.fromEntries(statKeys.map((key) => [key, 0])) as StatValues;
}
