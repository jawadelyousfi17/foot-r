CREATE TABLE "CompetitionTeam" (
    "competitionId" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "seed" INTEGER,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompetitionTeam_pkey" PRIMARY KEY ("competitionId", "teamId")
);

CREATE INDEX "CompetitionTeam_teamId_idx" ON "CompetitionTeam"("teamId");

ALTER TABLE "CompetitionTeam"
ADD CONSTRAINT "CompetitionTeam_competitionId_fkey"
FOREIGN KEY ("competitionId") REFERENCES "Competition"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CompetitionTeam"
ADD CONSTRAINT "CompetitionTeam_teamId_fkey"
FOREIGN KEY ("teamId") REFERENCES "Team"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
