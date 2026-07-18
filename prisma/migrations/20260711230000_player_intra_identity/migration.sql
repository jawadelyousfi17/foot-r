ALTER TABLE "Player"
ADD COLUMN "intraId" INTEGER,
ADD COLUMN "intraLogin" TEXT;

CREATE UNIQUE INDEX "Player_intraId_key" ON "Player"("intraId");
CREATE UNIQUE INDEX "Player_intraLogin_key" ON "Player"("intraLogin");
