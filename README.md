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
│   ├── components/           # componentes compartilhados (ui/: Screen, Card)
│   ├── features/             # código por funcionalidade (diagnostics/...)
│   ├── lib/                  # integrações (supabase/: config e health check)
│   ├── theme/palette.js      # cores do app (fonte única para Tailwind e código nativo)
│   └── global.css            # entrada do Tailwind (NativeWind)
├── supabase/config.toml      # Supabase local (Docker)
└── tailwind.config.js        # tokens de cor como variáveis CSS
```

## Pré-requisitos

- Node.js ≥ 20 e Docker Desktop (para o Supabase local).
- Celular com o app **Expo Go** (App Store / Play Store), na mesma Wi-Fi do PC.

## Primeiros passos

```bash
npm install
cp .env.example .env.local   # preencha EXPO_PUBLIC_SUPABASE_KEY (veja abaixo)
npm run db:start             # sobe o Supabase local no Docker
npm run db:status            # mostra a "Publishable key" para o .env.local
npm start                    # abre o Metro e mostra o QR code
```

No iPhone, aponte a câmera para o QR code e abra no Expo Go. Na primeira vez, permita o acesso à
**Rede Local** quando o iOS pedir.

A aba **Ajustes** mostra se o celular alcança o Supabase. Se aparecer **Conectado**, a Fase 0
está funcionando.

Outros comandos: `npm test` (Jest), `npm run typecheck`, `npm run lint`, `npm run db:stop`.
O Supabase Studio (interface do banco) fica em http://127.0.0.1:54323.

## Plano de desenvolvimento

| Fase | Conteúdo | Status |
|---|---|---|
| 0 | Fundação: Expo, NativeWind, tema escuro, abas, Supabase local, Jest | ✅ |
| 1 | Banco local (SQLite + Drizzle), perfil, TMB/GET, metas de macros, peso com média móvel, medidas | |
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

⚠️ **Validado no PC, falta validar no iPhone:** TypeScript, lint, 9 testes, `expo-doctor` (21/21)
e o bundle de iOS compilado pelo Metro passaram, e o Supabase respondeu pelo IP de rede do PC.
A aparência das telas e a conexão iPhone → PC (o iOS pode bloquear HTTP sem criptografia) só dá
para confirmar no aparelho. Se o iOS bloquear, a saída é um túnel HTTPS
(`cloudflared tunnel --url http://localhost:54321`) em `EXPO_PUBLIC_SUPABASE_URL`.
