# Guia de publicação — Bolão do Brasileirão

Checklist completo pra colocar o app no ar (backend em produção) e publicar nas lojas.

## 1. Contas que só você pode criar

| O quê | Link | Custo |
|---|---|---|
| Google Play Console | https://play.google.com/console/signup | US$25 (pagamento único) |
| Apple Developer Program | https://developer.apple.com/programs/enroll/ | US$99/ano (verificação de identidade pode levar dias) |
| Railway (hospedagem do backend) | https://railway.app | Grátis pra começar (tier com US$5/mês de crédito) |
| Firebase (só quando for implementar push de verdade) | https://console.firebase.google.com | Grátis |
| Conta Expo (pra usar o EAS Build) | https://expo.dev/signup | Grátis (build tem cota grátis limitada/mês) |

Crie essas contas quando puder — o resto (configuração, deploy do código) eu já deixei pronto ou faço quando você tiver as credenciais.

## 2. Subir o backend em produção (Railway)

Depois de criar sua conta Railway:

1. **New Project → Deploy from GitHub repo** → selecione `ClaudioLopes/Cravei-`.
2. Em **Settings → Root Directory**, defina `backend` (o projeto é um monorepo).
3. **+ New → Database → PostgreSQL** no mesmo projeto — o Railway já injeta a variável `DATABASE_URL` automaticamente no serviço do backend (é só linkar os dois serviços na aba "Variables").
4. Em **Variables** do serviço do backend, adicione (já gerei os segredos novos, diferentes dos do seu `.env` local):

   ```
   JWT_ACCESS_SECRET=997c9bea5af49109147f4c771ecfc7ae691816d1d223fe25d2781e7d697b2c6a
   JWT_ACCESS_EXPIRES_IN=15m
   JWT_REFRESH_SECRET=6c56ea835d376282b94c97d7608b144db9a5ba2033b68b6a579f4b480fb04123
   JWT_REFRESH_EXPIRES_IN=30d
   FOOTBALL_DATA_API_TOKEN=<seu token da football-data.org>
   FOOTBALL_DATA_COMPETITION=BSA
   FIXTURES_SYNC_CRON=*/5 * * * *
   RESCHEDULE_THRESHOLD_DAYS=3
   NOTIFICATION_LEAD_MINUTES=15
   ```

   (`DATABASE_URL` e `PORT` o Railway já cuida sozinho.)

5. O `backend/railway.json` já configura o build (`prisma generate && nest build`) e o start (`prisma migrate deploy && node dist/main`) — não precisa mexer em mais nada.
6. Depois do primeiro deploy, o Railway te dá uma URL pública tipo `https://cravei-production.up.railway.app`. Ative "Generate Domain" em **Settings → Networking** se ainda não tiver uma.

## 3. Apontar o app pra essa URL

No `mobile/eas.json` ou nas variáveis de ambiente do projeto Expo, defina:

```
EXPO_PUBLIC_API_URL=https://sua-url-do-railway.up.railway.app
```

(Aviso quando você tiver a URL real e eu configuro isso.)

## 4. Ativar a Política de Privacidade

Já criei o arquivo [`docs/privacidade.html`](../docs/privacidade.html). Pra publicar:

1. No GitHub, vá em **Settings → Pages** do repositório `Cravei-`.
2. Em "Source", selecione a branch `main` e a pasta `/docs`.
3. Salve — em ~1 minuto o GitHub te dá uma URL tipo `https://claudiolopes.github.io/Cravei-/privacidade.html`.
4. Essa URL vai no campo "Privacy Policy" tanto do Google Play Console quanto do App Store Connect.

## 5. Ícone e identidade visual

Gerei um ícone/splash placeholder (bola verde sobre fundo azul-marinho) em `mobile/assets/` — já conectado no `app.json`. Quando você tiver uma logo de verdade, é só substituir os arquivos com o mesmo nome.

## 6. Build e envio (quando estiver tudo pronto)

```bash
cd mobile
npx eas login
npx eas build --platform android --profile production
npx eas build --platform ios --profile production
npx eas submit --platform android
npx eas submit --platform ios
```

- Android: primeira submissão de contas novas do Google exige **teste fechado com 20 testers por 14 dias** antes de liberar produção.
- iOS: a Apple faz revisão manual (1-3 dias úteis, às vezes rejeita e pede ajuste).

## 7. Push notifications de verdade (opcional, pode ficar pra depois)

Hoje o app só loga no console em vez de enviar push de verdade. Quando você criar o projeto Firebase:
1. Me manda as credenciais (arquivo `google-services.json` / `GoogleService-Info.plist` ou as chaves do FCM).
2. Eu implemento o `FcmPushProvider` de verdade (a estrutura pra isso já existe em `backend/src/notifications/`).
