-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "podioTamanho" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "TurnoWinner" ADD COLUMN     "posicao" INTEGER NOT NULL DEFAULT 1;

-- DropIndex
DROP INDEX "TurnoWinner_groupId_turno_key";

-- CreateIndex
CREATE UNIQUE INDEX "TurnoWinner_groupId_turno_posicao_key" ON "TurnoWinner"("groupId", "turno", "posicao");
