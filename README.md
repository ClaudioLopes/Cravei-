# Bolão do Brasileirão

App de bolão do Campeonato Brasileiro Série A: grupos, palpites por rodada, pontuação configurável, classificação por turno e notificações push. Especificação completa em [`documento-tecnico-bolao-brasileirao.md`](./documento-tecnico-bolao-brasileirao.md).

Quer publicar nas lojas (Play Store / App Store)? Veja o guia completo em [`docs/PUBLICAR.md`](./docs/PUBLICAR.md).

## Estrutura

```
backend/    API NestJS + Prisma + PostgreSQL
mobile/     App Expo (React Native) com expo-router
docker-compose.yml   Postgres para desenvolvimento local
```

## Pré-requisitos

- [Node.js 20 LTS](https://nodejs.org/) (inclui npm)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (para o PostgreSQL local)
- Expo Go instalado no celular (opcional, para testar no dispositivo) — ou um emulador Android/iOS

## 1. Subir o banco de dados

Na raiz do projeto:

```bash
docker compose up -d
```

Isso sobe um PostgreSQL em `localhost:5432` (usuário `bolao`, senha `bolao`, banco `bolao`).

## 2. Backend

```bash
cd backend
npm install
cp .env.example .env
npx prisma migrate dev --name init
npm run start:dev
```

No PowerShell (Windows), troque `cp .env.example .env` por `Copy-Item .env.example .env`.

A API sobe por padrão em `http://localhost:3000`. Endpoints resumidos na seção 8 do documento técnico.

### Variáveis de ambiente (`backend/.env`)

Ver `backend/.env.example` para a lista completa (`DATABASE_URL`, segredos JWT, `FIXTURES_SYNC_CRON`, etc). Os valores padrão já funcionam com o `docker-compose.yml` acima.

## 3. App mobile

Em outro terminal:

```bash
cd mobile
npm install
npx expo start
```

Escaneie o QR code com o Expo Go, rode num emulador, ou pressione `w` para abrir a versão web (útil para testar rapidamente no navegador).

Por padrão o app aponta para `http://localhost:3000` — se for testar num celular físico, ajuste `EXPO_PUBLIC_API_URL` em `mobile/.env` para o IP da sua máquina na rede local (ex.: `http://192.168.0.10:3000`), já que `localhost` no celular aponta para o próprio celular.

## Decisões e simplificações desta primeira versão

- **Jobs agendados** usam cron in-process (`@nestjs/schedule`) em vez de BullMQ+Redis — evita infraestrutura extra no MVP; a lógica de negócio está isolada em services e pode migrar para BullMQ depois sem retrabalho.
- **Notificações push**: implementadas atrás de uma interface (`PushProvider`), com uma implementação padrão que apenas loga/registra em `PushOutbox` (com retry). Para push de verdade, crie um projeto Firebase, implemente `FcmPushProvider` e configure as credenciais — a lógica de "quem/quando notificar" já está pronta.
- **Sincronização de jogos**: cron de intervalo fixo (`FIXTURES_SYNC_CRON`, padrão a cada 5 min) em vez de frequência dinâmica perto dos horários de jogo.
- Fonte de dados: [football-data.org](https://www.football-data.org/) (tier gratuito, precisa de token), isolado atrás de `FixturesProvider` para facilitar troca por outra API no futuro. O pacote `campeonato-brasileiro-api` sugerido inicialmente foi testado e descartado — ver histórico abaixo.

## Fonte de dados de jogos (football-data.org)

A sincronização automática de jogos usa a [football-data.org](https://www.football-data.org/), que fornece horário oficial (UTC) de cada partida do Brasileirão Série A — essencial para as regras 5.1 (prazo de palpite) e 5.5 (notificação).

**Único passo manual necessário:**

1. Crie uma conta grátis em https://www.football-data.org/client/register (só email, sem cartão).
2. Copie o token que aparece no seu painel (client area).
3. Cole em `backend/.env`:
   ```
   FOOTBALL_DATA_API_TOKEN="seu-token-aqui"
   ```
4. Reinicie o backend (`npm run start:dev`).

Sem o token, o `FixturesSyncService` loga um aviso claro e não sincroniza nada (não quebra o app). O tier gratuito tem limite de 10 requisições/minuto — o cron padrão (a cada 5 min, 1 requisição por vez) fica bem dentro disso.

> **Histórico:** a primeira versão usava o pacote npm `campeonato-brasileiro-api`, sugerido no documento técnico por não precisar de cadastro. Ao testar de verdade, descobri que ele faz scraping de uma **URL fixa do Globo Esporte da edição 2018** do Brasileirão (`node_modules/campeonato-brasileiro-api/index.js`) — sempre retorna vazio — e mesmo funcionando, nunca devolvia horário de jogo. Troquei pela football-data.org; como tudo depende só da interface `FixturesProvider` (`backend/src/fixtures/fixtures-provider.interface.ts`), a troca foi isolada em `backend/src/fixtures/football-data.provider.ts` e `fixtures.module.ts`, sem tocar no resto do sistema.

## Solução de problemas

- **App mobile não conecta à API rodando no celular físico**: veja a observação sobre `EXPO_PUBLIC_API_URL` acima.
- **Disco cheio durante `npm install`**: se aparecer `ENOSPC`, apague `node_modules` e rode `npm install` de novo depois de liberar espaço — instalações parciais não são reaproveitáveis.

## Regras de negócio implementadas

Ver seção 5 do documento técnico. Pontos de atenção na implementação:

- Prazo efetivo de palpite de um jogo = `match.prazoIndividual ?? round.primeiroJogoOriginal` — sempre validado no backend.
- `Standing` já é escopado por `turno`, então o "zeramento" do returno é implícito (turno 2 começa com linhas novas de pontuação).
- Trava da regra de pontuação por turno é modelada como a existência de uma linha em `GroupTurnoLock` para o turno vigente.
