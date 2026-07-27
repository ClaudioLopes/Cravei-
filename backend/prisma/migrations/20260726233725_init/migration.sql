-- CreateEnum
CREATE TYPE "GroupTipo" AS ENUM ('PUBLICO', 'PRIVADO');

-- CreateEnum
CREATE TYPE "GroupPapel" AS ENUM ('ADMIN', 'MEMBRO');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('AGENDADO', 'ADIADO', 'EM_ANDAMENTO', 'ENCERRADO');

-- CreateEnum
CREATE TYPE "PushStatus" AS ENUM ('PENDENTE', 'ENVIADO', 'FALHOU');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "foto" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "GroupTipo" NOT NULL DEFAULT 'PRIVADO',
    "codigoConvite" TEXT NOT NULL,
    "donoId" TEXT NOT NULL,
    "scoringConfig" JSONB NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "papel" "GroupPapel" NOT NULL DEFAULT 'MEMBRO',
    "entrouEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "serie" TEXT NOT NULL DEFAULT 'a',
    "turnoAtual" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Round" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "turno" INTEGER NOT NULL,
    "primeiroJogoOriginal" TIMESTAMP(3) NOT NULL,
    "atual" BOOLEAN NOT NULL DEFAULT false,
    "encerrada" BOOLEAN NOT NULL DEFAULT false,
    "notificacaoEnviada" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Round_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "timeCasa" TEXT NOT NULL,
    "timeFora" TEXT NOT NULL,
    "dataHoraOriginal" TIMESTAMP(3) NOT NULL,
    "dataHoraPrevista" TIMESTAMP(3) NOT NULL,
    "prazoIndividual" TIMESTAMP(3),
    "status" "MatchStatus" NOT NULL DEFAULT 'AGENDADO',
    "placarCasa" INTEGER,
    "placarFora" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prediction" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "placarCasaPalpite" INTEGER NOT NULL,
    "placarForaPalpite" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PredictionScore" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "predictionId" TEXT NOT NULL,
    "pontos" INTEGER NOT NULL,
    "calculadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PredictionScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupTurnoLock" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "turno" INTEGER NOT NULL,
    "travadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupTurnoLock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Standing" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "turno" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "pontosTotais" INTEGER NOT NULL DEFAULT 0,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Standing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TurnoWinner" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "turno" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "pontosFinais" INTEGER NOT NULL,
    "definidoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TurnoWinner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushOutbox" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "status" "PushStatus" NOT NULL DEFAULT 'PENDENTE',
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Group_codigoConvite_key" ON "Group"("codigoConvite");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMember_groupId_userId_key" ON "GroupMember"("groupId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Round_seasonId_numero_key" ON "Round"("seasonId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "Match_externalId_key" ON "Match"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Prediction_matchId_userId_key" ON "Prediction"("matchId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "PredictionScore_groupId_predictionId_key" ON "PredictionScore"("groupId", "predictionId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupTurnoLock_groupId_turno_key" ON "GroupTurnoLock"("groupId", "turno");

-- CreateIndex
CREATE UNIQUE INDEX "Standing_groupId_turno_userId_key" ON "Standing"("groupId", "turno", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "TurnoWinner_groupId_turno_key" ON "TurnoWinner"("groupId", "turno");

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_donoId_fkey" FOREIGN KEY ("donoId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictionScore" ADD CONSTRAINT "PredictionScore_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictionScore" ADD CONSTRAINT "PredictionScore_predictionId_fkey" FOREIGN KEY ("predictionId") REFERENCES "Prediction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupTurnoLock" ADD CONSTRAINT "GroupTurnoLock_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Standing" ADD CONSTRAINT "Standing_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Standing" ADD CONSTRAINT "Standing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TurnoWinner" ADD CONSTRAINT "TurnoWinner_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TurnoWinner" ADD CONSTRAINT "TurnoWinner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushOutbox" ADD CONSTRAINT "PushOutbox_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
