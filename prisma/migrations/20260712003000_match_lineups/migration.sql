CREATE TYPE "LineupRole" AS ENUM ('STARTER', 'BENCH');

CREATE TABLE "MatchLineupEntry" (
    "matchId" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "role" "LineupRole" NOT NULL,
    "position" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MatchLineupEntry_pkey" PRIMARY KEY ("matchId", "playerId")
);

CREATE INDEX "MatchLineupEntry_matchId_teamId_role_idx" ON "MatchLineupEntry"("matchId", "teamId", "role");
ALTER TABLE "MatchLineupEntry" ADD CONSTRAINT "MatchLineupEntry_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchLineupEntry" ADD CONSTRAINT "MatchLineupEntry_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
