-- Add referee (42 Intra user) identity to matches.
ALTER TABLE "Match" ADD COLUMN "refereeLogin" TEXT;
ALTER TABLE "Match" ADD COLUMN "refereeName" TEXT;
ALTER TABLE "Match" ADD COLUMN "refereeImageUrl" TEXT;
