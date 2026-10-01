# DuoGym&Diet

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
│   │   └── cadastro, peso, medida, perfil, historico-metas
│   ├── components/ui/        # Screen, Card, Button, TextField, ChoiceChips, DateTimeField...
│   ├── db/                   # SQLite: schema.ts, client.ts, migrations/ (geradas)
│   ├── features/             # por funcionalidade: contas, consultas, gravações e cards
│   │   ├── goals/            # TMB, gasto total, macros, histórico de metas
│   │   ├── profile/          # perfil, formulário e cadastro
│   │   ├── weight/           # pesagens e tendência
│   │   └── measurements/     # medidas e % de gordura
│   ├── lib/                  # datas, números (pt-BR) e Supabase
│   ├── theme/palette.js      # cores do app (fonte única para Tailwind e código nativo)
│   └── global.css            # entrada do Tailwind (NativeWind)
├── drizzle.config.ts         # drizzle-kit (gera as migrações do SQLite)
├── supabase/config.toml      # Supabase local (Docker)
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
npx expo login               # uma vez só: loga o Expo CLI na sua conta Expo
npm start                    # abre o Metro e mostra o QR code
```

No Expo Go, toque no ícone de conta (canto superior direito) e entre com a mesma conta do
`npx expo login`. Depois aponte a câmera do iPhone para o QR code do terminal. Na primeira vez,
permita o acesso à **Rede Local** quando o iOS pedir.

Na primeira vez, o app abre no cadastro. A aba **Ajustes** mostra se o celular alcança o
Supabase (**Conectado**).

Outros comandos: `npm test` (Jest), `npm run typecheck`, `npm run lint`, `npm run db:stop` e
`npm run db:generate` (gera a migração do SQLite depois de mudar `src/db/schema.ts`).
O Supabase Studio (interface do banco) fica em http://127.0.0.1:54323.

## Plano de desenvolvimento

| Fase | Conteúdo | Status |
|---|---|---|
| 0 | Fundação: Expo, NativeWind, tema escuro, abas, Supabase local, Jest | ✅ |
| 1 | Banco local (SQLite + Drizzle), perfil, TMB/GET, metas de macros, peso com média móvel, medidas | ✅ |
| 2 | Biblioteca de exercícios, mídias, plano semanal e seu treino pré-carregado | |
| 3 | Treino em tempo real: aquecimento automático, e1RM, recordes, progressão, timer com notificação | |
| 4 | Dieta: TACO offline, scanner (Open Food Facts), diário por refeição, porções, água | |
| 5 | Conta e sincronização: login, SyncQueue, Last-Write-Wins, RLS | |
| 6 | Lembretes de água e refeições, exportação CSV e PDF | |
| 7 | Dashboards: e1RM, peso, adesão à dieta, volume semanal por grupo muscular | |
| 8 | Meta calórica adaptativa, fotos de progresso, tema claro, acabamento | |

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

⚠️ **Validado no PC, falta validar no iPhone:** TypeScript, lint, 61 testes, `expo-doctor`
(21/21) e o bundle de iOS passaram. A aparência das telas, o teclado nos formulários e o seletor
de data nativo só dá para conferir no aparelho. O seletor de data do Android (diálogos do
Material 3) não foi testado em nenhum aparelho.
