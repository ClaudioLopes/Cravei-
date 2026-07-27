# Documento Técnico — App de Bolão do Campeonato Brasileiro

## 1. Visão Geral

Aplicativo mobile multiplataforma (Android e iOS) para bolão do Campeonato Brasileiro (Série A). Usuários criam ou entram em **grupos**, fazem **palpites** por rodada, acumulam pontos, acompanham uma **tabela de classificação** e recebem **notificações** antes do fechamento dos palpites.

## 2. Escopo Funcional (MVP)

- Cadastro/login de usuário
- Criação e gestão de grupos (público/privado, convite por código/link)
- Sincronização automática de jogos, horários, resultados e remarcações a partir de uma fonte de dados externa
- Envio de palpites por partida, respeitando prazos
- Cálculo automático de pontuação
- Classificação por grupo, por turno
- Visualização dos palpites de outros participantes (liberada por jogo, ao vivo)
- Notificação push 15 minutos antes do primeiro jogo da rodada
- Zeramento de pontos ao fim de cada turno, com destaque do campeão do turno

## 3. Stack Sugerida

| Camada | Tecnologia sugerida | Observação |
|---|---|---|
| App mobile | React Native (Expo) | Um único código para Android/iOS |
| Backend | Node.js + NestJS (ou Fastify) | REST ou GraphQL |
| Banco de dados | PostgreSQL | Boa aderência a regras relacionais (rodadas, turnos, pontuação) |
| Jobs agendados | BullMQ / cron | Sincronizar jogos, calcular pontos, disparar notificações |
| Notificações push | Firebase Cloud Messaging (FCM) | Cobre Android e iOS (via APNs) |
| Dados de jogos | API de futebol paga (ex.: API-Football, SportRadar, Footystats) | Ver seção 7 |
| Autenticação | JWT + refresh token, ou Firebase Auth | |
| Infraestrutura | Docker + provedor cloud (Railway, Render, AWS, etc.) | |

## 4. Modelo de Dados (entidades principais)

**User**
`id, nome, email, senha_hash, foto, criado_em`

**Group**
`id, nome, tipo (publico/privado), codigo_convite, dono_id, regra_pontuacao (placar_exato | resultado_simples | camadas), regra_travada (bool), criado_em`

**GroupMember**
`id, group_id, user_id, papel (admin/membro), entrou_em`

**Championship / Season**
`id, nome (ex: Brasileirão 2026), ano, turno_atual (1 ou 2)`

**Round (Rodada)**
`id, season_id, numero, turno (1=primeiro turno, 2=segundo turno), data_inicio_original, encerrada (bool)`

**Match (Jogo)**
`id, round_id, time_casa, time_fora, data_hora_prevista, data_hora_original, status (agendado/adiado/em_andamento/encerrado), placar_casa, placar_fora, rodada_realocada_id (nullable)`

**Prediction (Palpite)**
`id, match_id, user_id, placar_casa_palpite, placar_fora_palpite, criado_em, editado_em, pontos_obtidos`

**Standings (Classificação por grupo/turno)**
`id, group_id, turno, user_id, pontos_totais, atualizado_em`

**TurnoWinner**
`id, group_id, turno, user_id, pontos_finais, definido_em`

## 5. Regras de Negócio

### 5.1 Prazo de palpites
- O palpite de uma partida só pode ser enviado/editado **até o horário de início do primeiro jogo da rodada**.
- Assim que o primeiro jogo da rodada começa, **todos os palpites da rodada são travados**, mesmo os de jogos que ainda vão começar mais tarde.
- **Exceção — remarcação de jogo:** se um jogo for adiado/atrasado em **mais de 3 dias** em relação à data original da rodada, esse jogo passa a ter prazo próprio: o palpite dele fica liberado até o novo horário de início daquele jogo específico.
- Jogos adiados por **até 3 dias** continuam seguindo a regra normal da rodada original (travam junto com o primeiro jogo da rodada).
- **Pontuação de jogo remarcado:** independentemente do novo prazo de palpite, o jogo **sempre pontua e é contabilizado na rodada/turno original** dele (`round_id` não muda, mesmo que a fonte de dados o vincule oficialmente a outra rodada). Isso garante que a tabela de classificação do turno feche corretamente, sem jogos "vazando" para o turno seguinte.

### 5.2 Pontuação
- A **regra de pontuação é escolhida no momento da criação do grupo**, pelo dono/admin do grupo. Opções:
  - **Placar exato** (padrão) — só pontua quem acerta o placar exato do jogo.
  - **Resultado simples** — pontua quem acerta apenas vencedor/empate, sem exigir o placar.
  - **Camadas** — ex.: 3 pontos para placar exato, 1 ponto para acertar só o resultado.
- **Trava de regra:** depois que o **primeiro palpite do turno** é enviado por qualquer participante do grupo (ou seja, assim que o turno "começa" a receber palpites), a regra de pontuação do grupo **não pode mais ser alterada** até o fim daquele turno. Isso vale tanto para o turno quanto para o returno — cada início de turno é um novo "ponto de trava": a regra pode, opcionalmente, ser revista pelo admin antes do primeiro palpite do returno, mas fica travada novamente assim que o returno começa.
- Pontuação é calculada automaticamente assim que o resultado oficial do jogo é confirmado pela fonte de dados, usando a regra vigente no grupo.

> Implementação: manter um campo `regra_travada` no grupo, setado para `true` no momento em que a primeira `Prediction` do turno é criada em qualquer jogo daquele turno. O endpoint de edição da regra deve validar esse campo antes de aceitar mudança.

### 5.3 Turnos e zeramento
- O Brasileirão tem **turno** (rodadas 1–19) e **returno** (rodadas 20–38).
- Ao final da rodada 19, o app apura o **campeão do turno** por grupo (maior pontuação acumulada) e registra em `TurnoWinner`.
- Os pontos são **zerados** para todos os participantes do grupo no início do returno, mantendo o histórico do turno anterior disponível para consulta.

### 5.4 Visualização de palpites de terceiros
- O palpite de um jogo só fica visível para os demais membros do grupo **depois que aquele jogo específico começa** (não espera a rodada toda começar).
- Antes do início do jogo, cada participante só vê o próprio palpite.

### 5.5 Notificação
- Disparo de push notification **15 minutos antes do horário de início do primeiro jogo da rodada**, apenas para membros do grupo que ainda não enviaram todos os palpites da rodada.

## 6. Integração de Dados Externos (jogos, horários, resultados, remarcações)

O pedido original menciona "buscar em sites oficiais", mas fazer scraping direto de sites (CBF, Globo Esporte, etc.) tem riscos: mudanças de layout quebram a extração, e pode violar termos de uso.

**Opção gratuita encontrada:** o pacote npm [`campeonato-brasileiro-api`](https://github.com/ezefranca/campeonato-brasileiro-api) (MIT, sem custo, sem necessidade de chave de API) devolve em JSON a classificação e a rodada atual (com jogos, horários, placares e status) das Séries A, B, C e D do Brasileirão. Pontos importantes:
- É uma biblioteca Node.js (não um servidor HTTP pronto — precisa ser embarcada no seu backend), que extrai os dados de uma fonte pública.
- O próprio projeto se declara **"fornecido apenas para fins educacionais"** — ou seja, é ótimo para prototipar e para o MVP, mas carrega risco de instabilidade (a fonte pode mudar de layout e quebrar a extração) e não tem SLA/garantia de disponibilidade.
- Ela expõe bem a **rodada atual** e a **classificação**, mas o próprio README avisa que **não garante histórico completo de rodadas passadas** nem detecção estruturada de remarcação — isso você terá que inferir comparando `dateTime` salvo vs. `dateTime` retornado a cada sincronização.

**Recomendação prática:** usar essa lib gratuita para o MVP e validação do app, mas isolar o acesso a dados de jogos atrás de uma interface/serviço próprio no backend (`FixturesProvider`), para poder trocar facilmente por uma API paga (API-Football, SportRadar, Footystats, API Futebol) caso a fonte gratuita fique instável ou o app cresça e precise de mais confiabilidade/SLA.

Um **job agendado** (ex.: a cada 15–30 min, e com maior frequência perto dos horários de jogo) deve:
1. Buscar a rodada atual e os jogos.
2. Comparar `data_hora_prevista` salva com a nova data retornada pela API.
3. Se a diferença for maior que 3 dias, marcar o jogo com prazo de palpite individual (regra 5.1).
4. Atualizar placares e status assim que disponíveis, disparando o cálculo de pontos.

## 7. Principais Telas do App

1. Login / Cadastro
2. Meus Grupos (lista + criar/entrar em grupo)
3. Detalhe do Grupo → Rodada atual, prazo, status dos palpites dos membros
4. Tela de Palpites da Rodada (lista de jogos, campo de placar por jogo)
5. Palpites dos outros participantes (por jogo, liberado após início)
6. Classificação do Grupo (turno atual + histórico de turnos)
7. Perfil / Notificações

## 8. API — Endpoints Resumidos

```
POST   /auth/login
POST   /auth/register

POST   /groups
POST   /groups/:id/join
GET    /groups/:id
GET    /groups/:id/members

GET    /rounds/current
GET    /rounds/:id/matches

POST   /predictions            (cria/edita palpite, valida prazo)
GET    /predictions/me/:roundId
GET    /predictions/match/:matchId  (só libera após início do jogo)

GET    /groups/:id/standings?turno=1
GET    /groups/:id/turno-winner/:turno
```

## 9. Requisitos Não Funcionais

- Notificações push confiáveis (retry em caso de falha)
- Consistência: nenhum palpite pode ser aceito após o fechamento, mesmo com latência de rede (validar sempre no backend, nunca confiar só no client)
- Histórico auditável de horários originais x remarcados dos jogos
- Escalável para múltiplos grupos e temporadas futuras (não travar em "Brasileirão 2026")

## 10. Roadmap Sugerido

**Fase 1 (MVP):** auth, grupos, sincronização de jogos via API externa, palpites, pontuação simples (placar exato), classificação, notificação 15min.
**Fase 2:** regra de pontuação em camadas (placar exato x resultado), visualização de palpites de terceiros, histórico de turnos.
**Fase 3:** regra de remarcação >3 dias, painel admin do grupo, estatísticas (% acerto, ranking geral).

## 11. Decisões já confirmadas

1. **Pontuação**: escolhida na criação do grupo (padrão = placar exato); trava assim que o primeiro palpite do turno é enviado.
2. **Fonte de dados**: `campeonato-brasileiro-api` (npm, gratuita) para o MVP, com abstração no backend para trocar por API paga depois.
3. **Jogo remarcado >3 dias**: pontua sempre para a rodada/turno original, só o prazo de palpite muda.
4. **Monetização**: grupos são gratuitos (sem plano pago no MVP).
5. **Limite de participantes por grupo**: sem limite.
6. **Escopo de temporadas**: o modelo de dados já suporta múltiplas temporadas/campeonatos (entidade `Championship/Season` desacoplada), mas no MVP o app cobre **apenas o Campeonato Brasileiro Série A**. Outras séries/campeonatos ficam para fases futuras, sem necessidade de retrabalho no modelo.

## 12. Pontos em Aberto (ainda vale decidir antes de codar)

1. Dentro da opção "camadas" de pontuação, quais valores exatos usar como sugestão padrão exibida ao admin (ex.: 3 pontos placar exato / 1 ponto só resultado)? Pode ficar livre para o admin definir os valores na criação do grupo, sem um padrão fixo do sistema.
