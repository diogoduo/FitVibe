# FitVibe

Feito pela **Duo**.

App de treino e dieta para quem faz musculação e quer controlar tudo sozinho: plano semanal,
registro de cada série (carga, reps, RIR e e1RM), progressão de carga, diário alimentar por
refeição com leitor de código de barras e evolução do peso. **Offline-first**: tudo é gravado
primeiro no celular, então funciona no subsolo da academia sem sinal, e sincroniza com o
servidor quando a conexão volta.

**React Native · Expo SDK 57 · TypeScript · Expo Router · NativeWind · SQLite · Supabase**

## Estrutura

```
duo-gym-diet/
├── src/
│   ├── app/                  # telas (Expo Router: cada arquivo é uma rota)
│   │   ├── (tabs)/           # as 5 abas
│   │   ├── cadastro, peso, medida, perfil, historico-metas
│   │   ├── biblioteca, exercicio/, catalogo/, sessao/, prescricao/, midia/...
│   │   ├── registro/ (treino em andamento), resumo/, historico-treinos
│   │   └── alimentos, alimento, alimento-editar, scanner, agua, refeicoes...
│   ├── components/ui/        # Screen, Card, Button, TextField, ChoiceChips, DateTimeField...
│   ├── db/                   # SQLite: schema.ts, client.ts, migrations/ (geradas)
│   ├── features/             # por funcionalidade: contas, consultas, gravações e cards
│   │   ├── goals/            # TMB, gasto total, macros, histórico de metas
│   │   ├── profile/          # perfil, formulário e cadastro
│   │   ├── weight/           # pesagens e tendência
│   │   ├── measurements/     # medidas e % de gordura
│   │   ├── exercises/        # catálogo (catalog/), biblioteca e exercícios próprios
│   │   ├── media/            # links e fotos/vídeos da galeria
│   │   ├── plan/             # plano semanal, prescrição e plano de exemplo
│   │   ├── workout/          # treino em tempo real, progressão, e1RM, recordes, descanso
│   │   ├── foods/            # TACO (taco/), busca, Open Food Facts, alimentos próprios
│   │   ├── diary/            # refeições, diário, refeições salvas, água
│   │   ├── account/          # conta nos Ajustes e a escolha de dados no primeiro login
│   │   └── social/           # perfil público, feed, posts, curtidas, comentários, fila de posts
│   ├── lib/                  # datas, números (pt-BR) e Supabase
│   ├── sync/                 # conta e sincronização (motor, Supabase, telas de status)
│   ├── theme/palette.js      # cores do app (fonte única para Tailwind e código nativo)
│   └── global.css            # entrada do Tailwind (NativeWind)
├── assets/exercises/         # fotos do catálogo (WebP, geradas pelo script)
├── scripts/                  # catálogo, TACO, SQL da sincronização, Supabase local, testes
├── drizzle.config.ts         # drizzle-kit (gera as migrações do SQLite)
├── supabase/config.toml      # Supabase local (Docker)
├── supabase/migrations/      # esquema do servidor (gerado de src/db/schema.ts)
└── tailwind.config.js        # tokens de cor como variáveis CSS
```

## Pré-requisitos

- Node.js ≥ 20 e Docker Desktop (para o Supabase local).
- Celular com o app **Expo Go** (App Store / Play Store), na mesma Wi-Fi do PC.
- Conta gratuita da Expo ([expo.dev/signup](https://expo.dev/signup)). Desde o SDK 57, o Expo Go
  no iPhone só abre projetos em desenvolvimento se o Expo CLI e o Expo Go estiverem logados na
  **mesma conta**.

## Primeiros passos

```bash
npm install
cp .env.example .env.local   # preencha EXPO_PUBLIC_SUPABASE_KEY (veja abaixo)
npm run db:start             # sobe o Supabase local no Docker
npm run db:status            # mostra a "Publishable key" para o .env.local
npm run db:migrate           # cria as tabelas da sincronização no Supabase local
npx expo login               # uma vez só: loga o Expo CLI na sua conta Expo
npm start                    # abre o Metro e mostra o QR code
```

No Expo Go, toque no ícone de conta (canto superior direito) e entre com a mesma conta do
`npx expo login`. Depois aponte a câmera do iPhone para o QR code do terminal. Na primeira vez,
permita o acesso à **Rede Local** quando o iOS pedir.

Na primeira vez, o app abre no cadastro. A aba **Ajustes** mostra se o celular alcança o
Supabase (**Conectado**).

Outros comandos: `npm test` (Jest), `npm run test:sync` e `npm run test:sync:cloud` (testes de
integração contra o Supabase local ou o da nuvem; criam contas temporárias e as excluem no fim),
`npm run typecheck`, `npm run lint`, `npm run db:stop`, `npm run db:generate` (gera a migração
do SQLite depois de mudar `src/db/schema.ts`) e `npm run db:sync-sql` (regera o SQL do servidor e
os gatilhos da fila a partir do esquema).
O Supabase Studio (interface do banco) fica em http://127.0.0.1:54323.

## Plano de desenvolvimento

| Fase | Conteúdo | Status |
|---|---|---|
| 0 | Fundação: Expo, NativeWind, tema escuro, abas, Supabase local, Jest | ✅ |
| 1 | Banco local (SQLite + Drizzle), perfil, TMB/GET, metas de macros, peso com média móvel, medidas | ✅ |
| 2 | Biblioteca de exercícios, mídias, plano semanal e seu treino pré-carregado | ✅ |
| 3 | Treino em tempo real: aquecimento automático, e1RM, recordes, progressão, timer com notificação | ✅ |
| 4 | Dieta: TACO offline, scanner (Open Food Facts), diário por refeição, porções, água | ✅ |
| 5 | Conta e sincronização: login, fila de envio, última alteração vence, RLS | ✅ |
| 6 | Social: perfil com @usuário, seguir (com aprovação), feed, posts com foto e legenda, curtidas, comentários, bloquear | ✅ |
| 7 | Notificações dentro do app: sininho com contador, lista e aviso com o app aberto | |
| 8 | Lembretes de água e refeições, exportação CSV e PDF | |
| 9 | Dashboards: e1RM, peso, adesão à dieta, volume semanal por grupo muscular | |
| 10 | Meta calórica adaptativa, fotos de progresso, tema claro, acabamento | |

Tudo no plano gratuito: Supabase Free e Expo Go, sem conta paga da Apple. Por isso as
notificações da Fase 7 aparecem só dentro do app (push com o app fechado exige build próprio e a
conta de desenvolvedor da Apple).

## Fase 0 — Fundação

- Projeto criado com `create-expo-app` (SDK 57, React Native 0.86, React 19, TypeScript estrito)
  e limpo dos exemplos do template.
- **Abas nativas** (`expo-router/unstable-native-tabs`): Hoje, Treino, Dieta, Progresso e Ajustes,
  com ícones SF Symbols no iOS e Material no Android. As abas ainda sem conteúdo dizem em que
  fase cada coisa chega.
- **NativeWind 4** com tema escuro por padrão (`userInterfaceStyle: "dark"`). As cores ficam em
  `src/theme/palette.js` e viram variáveis CSS no Tailwind (`bg-surface`, `text-fg-muted`...).
  A paleta clara já está definida e entra na Fase 8 sem precisar trocar classe nenhuma.
- **Supabase local** no Docker (`supabase/config.toml`), sem os serviços que o app não usa
  (realtime, edge functions, analytics).
- **Endereço do servidor sem IP fixo**: em desenvolvimento, o app usa o IP do PC que serve o Metro
  (`src/lib/supabase/config.ts`). O celular já alcança esse IP para baixar o código, então alcança
  o Supabase na mesma máquina. `EXPO_PUBLIC_SUPABASE_URL` sobrescreve (nuvem ou túnel).
- **Diagnóstico em Ajustes**: pinga `/auth/v1/health` com timeout e explica o que conferir quando
  falha (Wi-Fi, Supabase parado, permissão de Rede Local).
- Jest (`jest-expo`) com testes da resolução de URL e do health check; ESLint e Prettier
  (com ordenação de classes do Tailwind).

✅ **Validado no PC e no iPhone:** TypeScript, lint, 9 testes, `expo-doctor` (21/21) e o bundle
de iOS compilado pelo Metro passaram no PC; no iPhone (Expo Go), o app abre e a aba Ajustes mostra
**Conectado** ao Supabase local por HTTP na rede local, sem precisar de túnel. Se um dia o iOS
bloquear essa conexão, a saída é um túnel HTTPS (`cloudflared tunnel --url http://localhost:54321`)
em `EXPO_PUBLIC_SUPABASE_URL`.

## Fase 1 — Perfil, metas, peso e medidas

- **Banco local** com `expo-sqlite` + **Drizzle**. O esquema fica em `src/db/schema.ts`; as
  migrações são geradas pelo `drizzle-kit` e rodam quando o app abre (a tela de abertura espera).
  As telas usam `useLiveQuery` e se atualizam sozinhas depois de cada gravação.
- **Pronto para a sincronização da Fase 5**: todo registro tem id UUID gerado no celular,
  `updated_at` para o Last-Write-Wins e exclusão lógica (`deleted_at`).
- **Cadastro inicial em 3 etapas** (dados pessoais e peso, rotina e objetivo, metas). Sem perfil,
  as rotas protegidas do Expo Router só deixam abrir o cadastro.
- **Contas** (`src/features/goals/energy.ts`): TMB por Mifflin-St Jeor, ou Katch-McArdle quando
  há % de gordura; gasto total = TMB × fator de atividade (1,2 a 1,9); ajuste do objetivo pelo
  ritmo (−0,5 kg/semana ≈ −550 kcal/dia, com 7.700 kcal/kg); proteína e gordura em g/kg sobre o
  peso de tendência e carboidrato com o resto. Avisa quando a meta fica abaixo da TMB.
- **Histórico de metas**: cada mudança vira uma versão com a data em que passou a valer (uma por
  dia). A adesão da Fase 7 vai comparar cada dia com a meta daquele dia.
- **Peso**: tendência por média móvel exponencial (10% ao dia, pesagens do mesmo dia viram a
  média, dias sem pesagem contam) e variação da semana. Quando a tendência se afasta 1 kg da
  meta vigente, a aba Hoje sugere recalcular; "Agora não" só volta depois de mais 1 kg.
- **Medidas**: 10 medidas opcionais de um lado só e o % de gordura pelo método da Marinha
  americana, com a diferença de cada medida para a medição anterior.
- **Ajustes**: perfil e metas editáveis, histórico de metas e "Apagar todos os dados".
- **Testes**: 61 no Jest. As contas são funções puras; as gravações (cadastro em transação,
  versões de meta, exclusão lógica, apagar tudo) rodam num SQLite em memória (`sql.js`, só nos
  testes) com as mesmas migrações do app.

✅ **Validado no PC e no iPhone:** TypeScript, lint, 61 testes, `expo-doctor` (21/21) e o bundle
de iOS passaram no PC; no iPhone (Expo Go), cadastro, metas, pesagens, medidas e o seletor de data
nativo funcionaram. O seletor de data do Android (diálogos do Material 3) ainda não foi testado
em nenhum aparelho.

## Fase 2 — Biblioteca, mídias e plano semanal

- **Catálogo base com 123 exercícios** comuns em academia, com nome, músculos e "como fazer" em
  português escritos para o app e duas fotos cada (início e fim do movimento). As fotos vêm do
  [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (domínio público, Unlicense) e
  são reduzidas para WebP de 480 px por `scripts/build-exercise-images.mjs` (3,6 MB no total).
  Ficam embutidas no app e funcionam sem internet.
- **Biblioteca** com busca sem acento (nome, músculo ou equipamento) e filtro por grupo muscular.
  Um exercício do catálogo vira "seu" quando entra no plano, ganha mídia ou é personalizado; dá
  para criar exercícios próprios (as máquinas da sua academia).
- **Exercício**: grupo principal e secundários (17 grupos, com o ombro dividido em anterior,
  lateral e posterior), equipamento, tipo de carga (kg, **placas** sem conversão, peso corporal ou
  tempo), unilateral, observação fixa e cargas de referência.
- **Mídias**: links (YouTube e Instagram abrem no app) e fotos/vídeos da galeria copiados para a
  pasta do app (`expo-image-picker`, `expo-file-system`, `expo-video`). O banco guarda só o
  nome do arquivo, porque o caminho da pasta muda quando o iOS atualiza o app.
- **Plano semanal** por dia da semana: treinos e atividades com horário (futebol), dia sem nada =
  descanso. Cada exercício do treino tem séries válidas, faixa de reps (ou tempo), RIR, última até
  a falha, aquecimento (completo, preparação ou direto), descanso, "subir a carga ao atingir X
  reps" e alternativas. Reordenação com ↑/↓.
- **Plano de exemplo** ("Usar plano de exemplo"): o treino real do autor, com 4 treinos, futebol
  na quinta (21h30) e no domingo (8h) e as cargas de referência. "Montar do zero" começa vazio.
- **Hoje** mostra o treino do dia com os exercícios, ou a atividade com "Marcar como feito"; a
  semana na aba Treino mostra ✓ nas atividades feitas.
- **Testes**: 96 no Jest, incluindo a integridade do catálogo (fotos, músculos), a busca, a
  prescrição e o plano de exemplo montado num SQLite em memória.

✅ **Validado no PC e no iPhone:** TypeScript, lint, 96 testes, `expo-doctor` (21/21) e o bundle
de iOS passaram no PC; no iPhone (Expo Go), plano de exemplo, prescrição, biblioteca, mídias e o
treino do dia funcionaram.

## Fase 3 — Treino em tempo real

- **Começar um treino** do plano em qualquer dia (pelo Hoje, pela aba Treino ou pela tela do
  treino). O app copia os exercícios e a prescrição do dia: mudar o plano depois não mexe no
  histórico. Só um treino em andamento por vez; fechar o app não perde nada ("Continuar treino").
- **Séries já preenchidas** (`src/features/workout/progression.ts`):
  - **aquecimento automático** sobre a carga da 1ª série válida: completo = 2 × 12 a ~40% e ~55%
    + 4 reps a ~70% e 2 a ~85%; preparação = 4 reps a ~80%;
  - **progressão dupla série por série**: a série que bateu o topo da faixa (ou o "subir ao
    atingir X") sobe a carga; a que não bateu repete a carga buscando +1 rep. Sem histórico, parte
    das cargas de referência do plano;
  - **incremento** por equipamento (halteres e barra +2 kg, polia +2,5, máquina +5, placas +1),
    editável em cada exercício.
- **Registro**: carga × reps (ou minutos), RIR nas séries válidas (a última já vem como "Falha") e
  ✓. Dá para trocar o exercício pela alternativa ou por outro da biblioteca antes de começar as
  séries, pular, pôr exercício extra e série a mais.
- **Descanso**: começa sozinho ao marcar a série (curto depois do aquecimento), com contagem,
  −15/+15 s, vibração e **notificação local** quando acaba (`expo-notifications`), mesmo com o
  app em segundo plano. A tela fica acesa durante o treino (`expo-keep-awake`).
- **e1RM** por Epley contando as reps na reserva (25 kg × 6 com RIR 1 = 7 reps até a falha).
  **Recordes** de e1RM, maior carga e mais reps com uma carga, avisados na hora; a primeira vez no
  exercício não conta como recorde.
- **Resumo** ao finalizar: duração, séries, volume (kg), séries por grupo muscular (secundário vale
  meia) e recordes. **Histórico de treinos** com resumo, edição e exclusão; na página do exercício,
  os recordes e as últimas vezes.
- **Testes**: 125 no Jest, incluindo dois treinos seguidos do plano de exemplo (aquecimento,
  sugestão, recordes), troca, extra e finalizar.

✅ **Validado no PC e no iPhone:** TypeScript, lint, 125 testes, `expo-doctor` (21/21) e o bundle
de iOS passaram no PC; no iPhone (Expo Go), o registro das séries, o timer com a notificação, a
progressão (↑) e os recordes funcionaram.

## Fase 4 — Dieta

- **TACO 4ª edição** (597 alimentos, NEPA/UNICAMP, 2011) embutida no app em JSON, gerada por
  `scripts/build-taco.mjs` a partir do CSV do projeto [brolesi/taco](https://github.com/brolesi/taco)
  (fixado num commit). Por 100 g: kcal, proteína, carboidrato, gordura e fibra.
- **Código de barras** (`expo-camera`): procura primeiro no celular e depois no
  [Open Food Facts](https://openfoodfacts.org) (licença ODbL, sem chave); o produto fica salvo no
  celular com a porção do rótulo. Produto não encontrado, incompleto ou sem internet: abre o
  cadastro com o código preenchido, e da próxima vez o leitor já reconhece.
- **Alimentos seus** com os valores do rótulo por 100 g ou por porção (o app converte e guarda a
  porção). **Porções salvas** por alimento ("1 pão francês = 50 g") e **favoritos**.
- **Bebidas em ml**: cada alimento é medido em g ou ml (valores por 100 g ou 100 ml). Produtos do
  Open Food Facts com porção/embalagem em ml entram em ml com a porção do rótulo ("lata 350 ml");
  bebidas, sucos e leites fluidos da TACO também (a TACO mede por peso: 1 ml conta como 1 g).
- **Busca** única nas três fontes, sem diferenciar acento: favoritos e recentes no topo, depois
  quem começa com o texto. O preparo (cru, cozido, grelhado...) aparece em destaque.
- **Diário por refeição** (6 padrão, editáveis em Ajustes): cada registro guarda uma cópia do
  nome e dos valores, então editar ou apagar o alimento depois não muda o passado. **Copiar de
  ontem** e **refeições salvas** ("Café padrão") para repetir com um toque.
- **Meta × consumo** do dia escolhido (com a meta que valia naquele dia, do histórico de metas),
  fibra e aviso ao passar. **Água**: meta de 35 ml por kg de peso de tendência (ou definida à mão
  em Perfil e metas), +250 / +500 / outro valor e desfazer.
- **Testes**: 151 no Jest, incluindo a TACO, a busca, a leitura da resposta do Open Food Facts
  (inclusive bebidas em ml), o formulário do rótulo e as gravações do diário.

✅ **Validado no PC e no iPhone:** TypeScript, lint, testes, `expo-doctor` (21/21) e o bundle de
iOS passaram no PC; no iPhone (Expo Go), diário, busca, porções, água e o leitor de código com o
Open Food Facts funcionaram. A unidade em ml veio de um teste no aparelho (refrigerante lido pelo
código não aceitava porção em ml).

## Fase 5 — Conta e sincronização

- **Conta opcional** (e-mail e senha, Supabase Auth). Sem conta, o app continua 100% local. A
  sessão fica salva no próprio SQLite (`expo-sqlite/localStorage`).
- **Fila de envio por gatilhos**: cada inserção ou alteração nas 20 tabelas sincronizadas cai em
  `sync_queue` (gatilhos SQLite gerados do esquema). Exclusões são marcadas (`deleted_at`), não
  apagadas, para a exclusão chegar no outro celular.
- **Última alteração vence**: cada registro tem `updated_at` do celular; o servidor recusa uma
  versão mais antiga do que a que já tem (gatilho `sync_before_write`), e o celular só aplica o que
  veio do servidor se for mais novo. Uma alteração feita durante o envio não se perde.
- **Download incremental**: por tabela, pelo carimbo do servidor (`server_updated_at`) com cursor
  (carimbo, id), páginas de 500 e 60 s de sobreposição para não perder nada.
- **Quando sincroniza**: ao abrir o app, ao voltar para ele, quando a internet volta e 5 s depois
  de cada alteração. Ajustes → Conta mostra quando foi a última vez, o que falta enviar, erros e o
  botão **Sincronizar agora**.
- **Primeiro login**: conta vazia recebe tudo do celular; celular vazio baixa tudo da conta; os
  dois com dados (ou dados de outra conta no celular) → o app pergunta se troca os do celular
  pelos da conta. Dá para entrar já no cadastro ("Já usa o app? Entrar na conta").
- **Sair**: mantendo os dados no celular, ou apagando deste celular (só depois de enviar o que
  falta). **Excluir conta** apaga a conta e tudo dela no servidor (`delete_my_account`).
- **Segurança**: RLS em todas as tabelas (cada conta só lê e grava o que é seu); o app usa só a
  chave **publishable**. A secreta (service_role) nunca entra no app.
- **Um esquema só**: `npm run db:sync-sql` gera o SQL do servidor
  (`supabase/migrations/…_sincronizacao.sql`) e os gatilhos do celular a partir de
  `src/db/schema.ts`, e um teste confere que os arquivos estão atualizados.
- **Fotos e vídeos dos exercícios** continuam só no celular onde foram adicionados (o registro
  sincroniza; no outro celular aparece "Em outro celular").
- **Testes**: 172 no Jest, incluindo o motor com dois celulares simulados, e 4 de integração
  contra um Supabase de verdade, local e na nuvem (`npm run test:sync` / `test:sync:cloud`): dois
  celulares, última alteração vence, paginação, RLS, primeiro login nos três casos, sair
  mantendo/apagando e excluir a conta.

### Supabase local sem a CLI

Neste PC o Windows bloqueia o executável da CLI do Supabase (Controle de Aplicativos). Os
contêineres criados na Fase 0 são controlados direto pelo Docker em
`scripts/supabase-local.mjs` (`db:start`, `db:stop`, `db:status`, `db:migrate`), e as migrações
ficam registradas na mesma tabela que a CLI usa.

### Supabase na nuvem (Free)

O app usa o projeto **FitVibe** (organização Duo, região us-east-1), já com o esquema aplicado e
a confirmação de e-mail desligada; o `.env.local` aponta para ele. Para montar outro projeto:

1. Crie um projeto em [supabase.com](https://supabase.com) (plano Free).
2. **SQL Editor** → cole e rode `supabase/migrations/20261003120000_sincronizacao.sql`.
3. **Authentication → Sign In / Providers → Email**: desligue **Confirm email** (o envio de
   e-mails do plano grátis é limitado a poucos por hora).
4. **Project Settings → API Keys**: copie a URL do projeto e a **publishable key** para o
   `.env.local`:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_...
   ```
5. Reinicie com `npx expo start --clear` (sem o `--clear`, o Metro guarda os valores antigos do
   `.env.local`) e rode `npm run test:sync:cloud`. Com a nuvem, o app sincroniza também
   fora da Wi-Fi de casa.

Mudanças futuras no esquema do servidor (novas migrações em `supabase/migrations`) também vão
pelo SQL Editor, na ordem dos arquivos.

O plano Free pausa o projeto depois de 7 dias sem uso (reativa no painel) e tem 500 MB de banco
e 1 GB de arquivos, de sobra para duas pessoas.

✅ **Validado no PC e no iPhone:** TypeScript, lint, testes, os testes de integração (local e
nuvem), `expo-doctor` (21/21) e o bundle de iOS passaram no PC; no iPhone, criar a conta e a
sincronização com o Supabase na nuvem funcionaram.

## Fase 6 — Social

- **Abas**: Hoje · Treino · Dieta · **Feed** · **Perfil**. O Progresso fica dentro do Perfil e os
  Ajustes no ⚙️ do Perfil.
- **Perfil público** (precisa de conta): foto, nome, @usuário, bio e contagens (posts,
  seguidores, seguindo). Começa **privado**: seguir vira pedido, e a pessoa aceita ou recusa em
  Perfil → "pedidos para seguir você". Ficar público aceita os pedidos pendentes.
- **O dia no perfil**: depois de cada sincronização, o celular publica o resumo de hoje com o que
  a pessoa escolheu mostrar (treino, dieta e água, peso; o peso começa desligado). Quem pode ver
  o perfil vê o dia mais recente.
- **Posts**: refeição (do cartão da refeição na Dieta), treino (do resumo do treino), metas, "meu
  dia" ou só foto, sempre com legenda e foto opcional (câmera ou galeria, reduzida para 1080 px em
  JPEG). O post guarda uma cópia dos dados: editar o diário depois não muda o post.
- **Sem internet**: o post entra numa fila no celular (`post_outbox`) e vai sozinho depois; o
  feed mostra "esperando internet", com tentar de novo e descartar. O id vem do celular, então
  reenviar não duplica.
- **Feed** (eu + quem sigo), curtir (responde na hora e desfaz se o servidor recusar),
  comentários (apaga quem escreveu ou o dono do post), buscar pessoas por @ ou nome, listas de
  seguidores, remover seguidor, **bloquear** (desfaz o seguir nos dois sentidos e esconde o perfil)
  e a lista de bloqueados nos Ajustes.
- **Regras no servidor**, não no app (`supabase/migrations/…_social.sql`): RLS em todas as tabelas
  e funções `can_view`, `posts_page`, `profile_view` etc. As fotos dos posts ficam num bucket
  privado: só quem pode ver o perfil recebe o link (assinado, vale 1 h). Fotos de perfil ficam
  num bucket público, como no Instagram. Excluir a conta apaga as fotos também.
- **Dados do servidor nas telas** com React Query (cache, recarregar ao voltar ao app e ao puxar a
  lista); trocar de conta limpa o cache.
- **Testes**: 181 no Jest (inclui as cópias dos dados para os posts e a fila) e 10 de integração
  contra o Supabase, 6 deles das regras do social: privado × aceito, curtidas e comentários,
  bloqueio, privado → público, fotos e @usuário repetido.

Para a nuvem: rode também `supabase/migrations/20261003180000_social.sql` no SQL Editor.

✅ **Validado no PC e no iPhone:** TypeScript, lint, testes, os 10 testes de integração (no
Supabase local e na nuvem), `expo-doctor` (21/21) e o bundle de iOS passaram no PC; nos dois
iPhones, perfil, seguir com aprovação, posts com foto, curtidas, comentários e o dia no perfil
funcionaram.
