# Funcionalidades, fase a fase

Como o FitVibe foi construído, em fases. Cada fase terminou com TypeScript, lint, testes,
`expo-doctor` e o bundle de iOS passando no PC e com o teste no iPhone (Expo Go).

| Fase | Conteúdo                                                                                                   | Status |
| ---- | ---------------------------------------------------------------------------------------------------------- | ------ |
| 0    | Fundação: Expo, NativeWind, abas, Supabase local, Jest                                                     | ✅     |
| 1    | Banco local (SQLite + Drizzle), perfil, TMB/GET, metas de macros, peso com média móvel, medidas            | ✅     |
| 2    | Biblioteca de exercícios, mídias, plano semanal e plano de exemplo                                         | ✅     |
| 3    | Treino em tempo real: aquecimento automático, e1RM, recordes, progressão, timer com notificação            | ✅     |
| 4    | Dieta: TACO offline, código de barras (Open Food Facts), diário por refeição, porções, água                | ✅     |
| 5    | Conta e sincronização: login, fila de envio, última alteração vence, RLS                                   | ✅     |
| 6    | Social: perfil com @usuário, seguir (com aprovação), feed, posts com foto, curtidas, comentários, bloquear | ✅     |
| 7    | Notificações dentro do app: sininho com contador, lista e aviso com o app aberto                           | ✅     |
| 8    | Lembretes de água e refeições, exportação CSV e PDF                                                        | ✅     |
| 9    | Dashboards: e1RM, peso, adesão à dieta, volume semanal por grupo muscular                                  | ✅     |
| 10   | Meta calórica adaptativa, fotos de progresso, tema claro                                                   | ✅     |
| —    | Interface nova (ícones, animações, vibração, gestos) e tutorial                                            | ✅     |
| 11   | Assistente por voz: fale o que comeu, bebeu, pesou, mediu ou treinou                                       | ✅     |

Tudo no plano gratuito: Supabase Free, Gemini (plano grátis) e Expo Go, sem conta paga da Apple.
Por isso as notificações da Fase 7 aparecem só dentro do app (push com o app fechado exige build
próprio e a conta de desenvolvedor da Apple).

## Fase 0 — Fundação

- Projeto criado com `create-expo-app` (SDK 57, React Native 0.86, React 19, TypeScript estrito)
  e limpo dos exemplos do template.
- **Abas nativas** (`expo-router/unstable-native-tabs`), com ícones SF Symbols no iOS e Material no
  Android (as abas de hoje estão na Fase 6).
- **NativeWind 4**: as cores ficam em `src/theme/palette.js` e viram variáveis CSS no Tailwind
  (`bg-surface`, `text-fg-muted`...). A paleta clara já nasceu definida e entrou na Fase 10 sem
  trocar classe nenhuma.
- **Supabase local** no Docker (`supabase/config.toml`), sem os serviços que o app não usa
  (realtime, edge functions, analytics).
- **Endereço do servidor sem IP fixo**: em desenvolvimento, o app usa o IP do PC que serve o Metro
  (`src/lib/supabase/config.ts`). O celular já alcança esse IP para baixar o código, então alcança
  o Supabase na mesma máquina. `EXPO_PUBLIC_SUPABASE_URL` sobrescreve (nuvem ou túnel).
- **Diagnóstico em Ajustes**: pinga `/auth/v1/health` com timeout e explica o que conferir quando
  falha (Wi-Fi, Supabase parado, permissão de Rede Local).
- Jest (`jest-expo`) com testes da resolução de URL e do health check; ESLint e Prettier
  (com ordenação de classes do Tailwind).

## Fase 1 — Perfil, metas, peso e medidas

- **Banco local** com `expo-sqlite` + **Drizzle**. O esquema fica em `src/db/schema.ts`; as
  migrações são geradas pelo `drizzle-kit` e rodam quando o app abre (a tela de abertura espera).
  As telas usam `useLiveQuery` e se atualizam sozinhas depois de cada gravação.
- **Pronto para a sincronização da Fase 5**: todo registro tem id UUID gerado no celular,
  `updated_at` para a última alteração vencer e exclusão lógica (`deleted_at`).
- **Cadastro inicial em 3 etapas** (dados pessoais e peso, rotina e objetivo, metas). Sem perfil,
  as rotas protegidas do Expo Router só deixam abrir o cadastro.
- **Contas** (`src/features/goals/energy.ts`): TMB por Mifflin-St Jeor, ou Katch-McArdle quando
  há % de gordura; gasto total = TMB × fator de atividade (1,2 a 1,9); ajuste do objetivo pelo
  ritmo (−0,5 kg/semana ≈ −550 kcal/dia, com 7.700 kcal/kg); proteína e gordura em g/kg sobre o
  peso de tendência e carboidrato com o resto. Avisa quando a meta fica abaixo da TMB.
- **Histórico de metas**: cada mudança vira uma versão com a data em que passou a valer (uma por
  dia). A adesão da Fase 9 compara cada dia com a meta daquele dia.
- **Peso**: tendência por média móvel exponencial (10% ao dia, pesagens do mesmo dia viram a
  média, dias sem pesagem contam) e variação da semana. Quando a tendência se afasta 1 kg da
  meta vigente, a aba Hoje sugere recalcular; "Agora não" só volta depois de mais 1 kg.
- **Medidas**: 10 medidas opcionais de um lado só e o % de gordura pelo método da Marinha
  americana, com a diferença de cada medida para a medição anterior.
- **Ajustes**: perfil e metas editáveis, histórico de metas e "Apagar todos os dados".
- **Testes**: 61 no Jest. As contas são funções puras; as gravações (cadastro em transação,
  versões de meta, exclusão lógica, apagar tudo) rodam num SQLite em memória (`sql.js`, só nos
  testes) com as mesmas migrações do app.

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
- **Planos prontos**: um treino de 4 dias com futebol na quinta e no domingo, com cargas de
  referência, e um treino A/B/C de 3 dias para iniciantes. "Montar do zero" começa vazio.
- **Hoje** mostra o treino do dia com os exercícios, ou a atividade com "Marcar como feito"; a
  semana na aba Treino mostra ✓ nas atividades feitas.
- **Testes**: 96 no Jest, incluindo a integridade do catálogo (fotos, músculos), a busca, a
  prescrição e o plano de exemplo montado num SQLite em memória.

## Fase 3 — Treino em tempo real

- **Começar um treino** do plano em qualquer dia (pelo Hoje, pela aba Treino ou pela tela do
  treino). O app copia os exercícios e a prescrição do dia: mudar o plano depois não mexe no
  histórico. Só um treino em andamento por vez; fechar o app não perde nada ("Continuar treino").
- **Séries já preenchidas** (`src/features/workout/progression.ts`):
  - **aquecimento automático** sobre a carga da 1ª série válida: completo = 2 × 12 a ~40% e ~55%
    - 4 reps a ~70% e 2 a ~85%; preparação = 4 reps a ~80%;
  - **progressão dupla série por série**: a série que bateu o topo da faixa (ou o "subir ao
    atingir X") sobe a carga; a que não bateu repete a carga buscando +1 rep. Sem histórico, parte
    das cargas de referência do plano;
  - **incremento** por equipamento (halteres e barra +2 kg, polia +2,5, máquina +5, placas +1),
    editável em cada exercício.
- **Registro**: carga × reps (ou minutos), RIR nas séries válidas (a última já vem como "Falha") e
  ✓. Dá para trocar o exercício pela alternativa ou por outro da biblioteca antes de começar as
  séries, pular, pôr exercício extra e série a mais; deslizar uma série para a esquerda a exclui.
- **Descanso**: começa sozinho ao marcar a série (curto depois do aquecimento), com contagem,
  −15/+15 s, vibração e **notificação local** quando acaba (`expo-notifications`), mesmo com o
  app em segundo plano. A tela fica acesa durante o treino (`expo-keep-awake`).
- **e1RM** por Epley contando as reps na reserva (25 kg × 6 com RIR 1 = 7 reps até a falha).
  **Recordes** de e1RM, maior carga e mais reps com uma carga, avisados na hora. A comparação
  inclui as cargas de referência do exercício, então o 1º treino no app já comemora quando passa
  delas.
- **Resumo** ao finalizar: duração, séries, volume (kg), séries por grupo muscular (secundário vale
  meia) e recordes. **Histórico de treinos** com resumo, edição e exclusão; na página do exercício,
  os recordes e as últimas vezes.
- **Testes**: 125 no Jest, incluindo dois treinos seguidos do plano de exemplo (aquecimento,
  sugestão, recordes), troca, extra e finalizar.

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

## Fase 5 — Conta e sincronização

- **Conta opcional** (e-mail e senha, Supabase Auth, com confirmação por e-mail). Sem conta, o app
  continua 100% local. A sessão fica salva no próprio SQLite (`expo-sqlite/localStorage`).
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
- **Testes**: 172 no Jest, incluindo o motor com dois celulares simulados, e de integração contra
  um Supabase de verdade (`npm run test:sync`): dois celulares, última alteração vence,
  paginação, RLS, primeiro login nos três casos, sair mantendo/apagando e excluir a conta.

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
- **Testes**: 181 no Jest (inclui as cópias dos dados para os posts e a fila) e 6 de integração
  das regras do social: privado × aceito, curtidas e comentários, bloqueio, privado → público,
  fotos e @usuário repetido.

## Fase 7 — Notificações dentro do app

- **No banco** (`supabase/migrations/…_notificacoes.sql`): gatilhos criam a notificação de quem
  recebe quando alguém **te segue**, **pede para seguir**, **aceita seu pedido**, **curte**,
  **comenta** ou **posta** (para quem segue). Respeitam o bloqueio e o que a pessoa escolheu
  receber; ninguém consegue criar aviso falso (só os gatilhos inserem) e de cada notificação só
  dá para mudar o "lida". Descurtir, apagar o comentário ou cancelar o pedido apaga o aviso.
- **Textos** como no Instagram: "anasouza postou o café da manhã", "comentou na sua foto:
  'Boa!'", "curtiu seu post do treino Pernas", "pediu para seguir você".
- **🔔 no topo do Feed** e o número de não lidas no **ícone da aba Feed** (visível de qualquer
  aba). A lista leva ao post ou ao perfil, e os pedidos têm Aceitar/Recusar ali mesmo; "Seguir de
  volta" em quem começou a te seguir. Abrir a lista marca tudo como lido.
- **Aviso no topo** quando chega algo com o app aberto, pelo Supabase Realtime (só as suas, pelo
  RLS), com uma vibração leve. Se o Realtime cair, o contador confere de novo a cada minuto.
- **Preferências** nos Ajustes: seguidores, curtidas, comentários e posts de quem você segue.
- **Sem push com o app fechado**: exigiria build próprio e a conta paga da Apple.
- **Testes**: 186 no Jest (inclui os textos) e 4 de integração das notificações (pedido, aceite e
  cancelamento; post, curtida e comentário; preferências e bloqueio; segurança).
  `npm run test:realtime` testa o aviso em tempo real na nuvem (o Supabase local roda sem
  Realtime) e confere que uma conta não recebe o aviso de outra.

## Fase 8 — Lembretes e exportação

- **Lembretes** (Ajustes → Lembretes): notificações locais agendadas no próprio celular, então
  chegam **com o app fechado** e sem servidor. Água de 1 h, 1h30, 2 h ou 3 h, entre um horário e
  outro, dizendo quanto falta para a meta; e um horário por refeição. O planejamento é data por
  data para os próximos 3 dias (no máximo 50, abaixo do limite de 64 do iOS), refeito a cada
  mudança: a água para quando bate a meta e a refeição já registrada não toca. Tocar abre o Hoje
  ou a Dieta. "Testar agora" manda um em 5 segundos. Os ajustes ficam só neste celular
  (`app_settings`, não sincroniza).
- **Exportar** (Ajustes → Exportar): período de 7, 30 ou 90 dias ou tudo.
  - **Planilhas CSV** do diário alimentar, água, treinos (uma linha por série), peso (com a
    tendência), medidas e metas, no padrão do Excel brasileiro (separador ";", vírgula decimal,
    UTF-8 com BOM) e com proteção contra fórmula em texto.
  - **Relatório em PDF** (A4, `expo-print`): média de calorias e macros contra a meta, dias na
    meta (±10%), água, treinos com recordes, a curva do peso (SVG) e a diferença das medidas.
  - Sai pela tela de compartilhar do iPhone (Arquivos, WhatsApp, e-mail).
- **Testes**: 195 no Jest, incluindo o planejamento dos lembretes, o formato do CSV, as planilhas
  e os números do relatório.

## Fase 9 — Dashboards

Perfil → **Progresso**, com gráficos em `react-native-svg` (feitos à mão, sem biblioteca de
gráficos; tocar ou arrastar mostra o valor do ponto):

- **Peso**: pesagens (pontos) e tendência (linha) em 30 dias, 90 dias, 6 meses ou 1 ano, com o
  ritmo em kg por semana.
- **Força**: escolha o exercício (os mais feitos primeiro) e veja a melhor série de cada treino:
  e1RM para carga em kg e placas, mais repetições no peso corporal, maior tempo nos de tempo; o
  melhor de todos e quanto mudou desde a primeira vez.
- **Volume por músculo**: séries válidas por grupo muscular na semana (principal 1, secundário
  meia), em verde dentro da faixa de 10 a 20 por semana; navega pelas últimas 8 semanas e mostra
  o total de séries de cada uma.
- **Dieta**: calorias de cada dia contra a meta daquele dia (verde na meta ±10%, amarelo acima),
  dias na meta, média de calorias e proteína e água, em 7, 14 ou 30 dias.
- **Medidas**: evolução de cada medida com pelo menos dois registros.
- As contas ficam em `src/features/progress/data.ts` (testadas sem banco); as telas usam
  consultas que se atualizam sozinhas.
- **Testes**: 199 no Jest.

## Fase 10 — Meta adaptativa, fotos de progresso e tema claro

- **Meta adaptativa** (`src/features/goals/adaptive.ts`): o gasto real das últimas 3 semanas é a
  média do que foi comido menos o que a tendência do peso mostra que sobrou (7.700 kcal por kg).
  Com pelo menos 14 dias registrados e pesagens no começo e no fim, o **Hoje** sugere a meta nova
  (gasto real ± o ritmo escolhido), andando no máximo 250 kcal por vez e nunca abaixo de 1.200;
  "Agora não" esconde por 7 dias. Aceitar vira a meta de calorias definida à mão (dá para tirar
  em Perfil e metas). O **Progresso** mostra o gasto real ou o que falta para estimá-lo.
- **Fotos de progresso**: frente, lado e costas por dia, comparação antes × depois da mesma pose
  com a diferença da tendência do peso, tela cheia com compartilhar e excluir. Por privacidade,
  ficam **só neste celular** (tabela local, não sincroniza).
- **Tema claro** (Ajustes → Aparência: escuro, claro ou o do iPhone), na hora. O mecanismo atual
  está descrito em "Interface nova" abaixo.
- **Seus dados** (Ajustes) diz o que fica só no celular.
- **Testes**: 204 no Jest (inclui a meta adaptativa e as fotos).

## Interface nova e tutorial

- **Base visual** (`src/components/ui`): ícones `Icon` (SF Symbols no iPhone, com animação, e
  Material Symbols no Android; nomes conferidos pelo TypeScript), `PressableScale` (o toque
  "afunda" e volta com mola), vibração em `src/lib/haptics.ts`, barras e números animados,
  esqueletos no lugar dos carregamentos e cartões com ícone. As telas entram deslizando.
- **Hoje**: saudação pelo nome, atalhos (+250 ml de água, refeição, peso, treino) e anéis estilo
  Apple Watch de calorias, proteína e água (`ActivityRings`, react-native-svg + Reanimated).
- **Treino**: cartão "Treinar agora" no topo da aba, com o treino de hoje (▶ Começar treino) e os
  outros da semana (dá para treinar num dia de descanso); ✓ da série com mola e vibração; recorde
  batido solta confete e um troféu no meio da tela (`CelebrationOverlay`).
- **Gestos**: deslize para a esquerda e solte para tirar um alimento, excluir uma pesagem ou uma
  série, com "Desfazer" embaixo da tela por alguns segundos.
- **Tema claro/escuro**: um mecanismo só. As duas paletas são variáveis CSS no
  `tailwind.config.js` (clara em `:root`, escura em `prefers-color-scheme: dark`) e o app força
  o modo com `Appearance.setColorScheme`, que o NativeWind, os componentes nativos e
  `useColors()` seguem. Componentes do Reanimated não recebem `className` (o NativeWind
  congelaria o estilo animado): o `PressableScale` anima um envoltório e o `Pressable` de dentro
  leva as classes, menos as de posição (`flex-1`, `self-*`), que ficam só no envoltório.
- **Feed**: duplo toque na foto ou no conteúdo para curtir (coração grande), coração que "pula",
  selo do tipo do post e da notificação.
- **Tutorial**: carrossel de 7 telas com uma demonstração animada em cada (aparece uma vez depois
  do cadastro ou da atualização; Ajustes → Sobre → "Ver o tutorial de novo") e uma dica curta no
  topo de cada aba, que some com "Entendi". O que já foi visto fica só neste celular.
- **Testes**: 205 no Jest.

## Fase 11 — Assistente por voz

- **Onde**: card "Registrar falando" no topo do Hoje (🎤 já começa a ouvir; ⌨️ para digitar),
  🎤 no topo da Dieta e no treino em andamento.
- **Como**: você fala (até 1 minuto) ou digita, por exemplo _"almocei 200 de arroz, 100 de
  feijão, 2 bifes grelhados e uma coquinha zero, e bebi 500 de água"_. O app manda a fala e os
  dados do momento (refeições, medidas, treino em andamento, treinos do plano e o catálogo de
  alimentos em códigos curtos: TACO + os seus) para a Edge Function `assistente`, que monta as
  instruções e chama o Gemini 3.5 Flash-Lite (grátis e aceita áudio). A resposta é uma lista em
  JSON com formato fixo. A IA escolhe o **código** do alimento; as kcal e os macros saem do banco
  do app.
- **Conferir**: a lista aparece por refeição, com as quantidades editáveis (≈ quando estimadas),
  as dúvidas em amarelo e as opções parecidas para trocar com um toque. Alimento desconhecido:
  **Ler código** (o leitor de sempre), **Digitar os macros** (o cadastro, já com o nome) ou
  **Buscar outro**; a escolha volta para a conferência. Dá para responder ou completar falando de
  novo (a IA devolve a lista inteira atualizada). **Salvar** grava tudo de uma vez e mostra
  "Desfazer".
- **Também registra**: água, peso, medidas (uma medição por dia), séries no treino em andamento
  (a próxima série válida; o recorde comemora) e "vou treinar perna" (botão para começar).
- **A TACO não tem macarrão cozido**: a IA registra o cru com o peso equivalente (cozido = 2,5 ×
  cru) e explica na linha, para as kcal ficarem certas.
- **Proteção da cota**: as instruções e o formato da resposta ficam na função, que confere cada
  campo vindo do app (tamanho, formato, sem quebras de linha) e ignora qualquer instrução dele.
  Áudio até ~1 MB, texto até 2.000 caracteres e **40 pedidos por pessoa por dia**
  (`assistant_usage`, contado no horário de Brasília).
- **Privacidade**: o aviso aparece na primeira vez. No plano grátis o Google pode usar o que for
  enviado para melhorar os produtos dele; a função manda `store: false` e o áudio é apagado do
  celular logo depois do envio. Só quem está logado consegue usar.
- **Código**: `supabase/functions/assistente/index.ts` (instruções, validação, cota e a chamada ao
  Gemini) e `src/features/assistant` (dados do pedido, catálogo, leitura da resposta, rascunho,
  gravação e as telas).
- **Testes**: a validação da função (recusa instrução do app, textos e áudios grandes, dados
  tortos) roda no Jest; `npm run test:assistente` manda frases reais ao Gemini: o exemplo do
  almoço, peso + medida + refeição pela hora, responder a uma pergunta e o treino.
