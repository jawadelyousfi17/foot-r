-- "Who will win" poll votes, one per user per match.
CREATE TYPE "VoteChoice" AS ENUM ('HOME', 'DRAW', 'AWAY');

CREATE TABLE "MatchVote" (
    "matchId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "choice" "VoteChoice" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MatchVote_pkey" PRIMARY KEY ("matchId", "userId")
);

CREATE INDEX "MatchVote_matchId_idx" ON "MatchVote" ("matchId");

ALTER TABLE "MatchVote" ADD CONSTRAINT "MatchVote_matchId_fkey"
    FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchVote" ADD CONSTRAINT "MatchVote_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
