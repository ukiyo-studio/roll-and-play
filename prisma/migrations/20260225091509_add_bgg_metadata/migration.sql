-- AlterTable
ALTER TABLE "Game" ADD COLUMN "bggId" INTEGER;
ALTER TABLE "Game" ADD COLUMN "maxPlayers" INTEGER;
ALTER TABLE "Game" ADD COLUMN "minPlayers" INTEGER;
ALTER TABLE "Game" ADD COLUMN "playingTime" INTEGER;
ALTER TABLE "Game" ADD COLUMN "thumbnailUrl" TEXT;
ALTER TABLE "Game" ADD COLUMN "yearPublished" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Game_bggId_key" ON "Game"("bggId");

