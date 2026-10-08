# Deploy

Tudo no plano gratuito: Supabase Free, Gemini (plano grátis) e EAS Update aberto pelo Expo Go.

## 1. Supabase na nuvem

1. Crie um projeto em [supabase.com](https://supabase.com) (plano Free).
2. **SQL Editor**: cole e rode, nesta ordem, os arquivos de `supabase/migrations`:
   1. `20261003120000_sincronizacao.sql` — tabelas sincronizadas, RLS e a última alteração vence;
   2. `20261003180000_social.sql` — perfil público, posts, curtidas, comentários e fotos;
   3. `20261003200000_notificacoes.sql` — notificações e Realtime;
   4. `20261006120000_assistente_cota.sql` — limite diário do assistente;
   5. `20261006140000_anotacoes_futebol_semana.sql` — anotações, futebol e os posts semana/futebol.

   Mudanças futuras no esquema também vão pelo SQL Editor, na ordem dos arquivos.

3. **Authentication → Sign In / Providers → Email**: deixe **Confirm email** ligado. Sem ele,
   qualquer um cria contas em massa ou com o e-mail de outra pessoa.
4. **Authentication → Emails → SMTP Settings**: o e-mail embutido do Supabase só entrega para
   quem é da equipe do projeto, e no máximo 2 por hora; sem SMTP próprio, ninguém de fora recebe o
   link de confirmação. Sem pagar nada, dá para usar um **Gmail** (de preferência uma conta só do
   app): ligue a [verificação em duas etapas](https://myaccount.google.com/signinoptions/twosv),
   crie uma [senha de app](https://myaccount.google.com/apppasswords) e preencha host
   `smtp.gmail.com`, porta 587, usuário = o endereço do Gmail, senha = a senha de app (16 letras,
   sem espaços) e o mesmo Gmail como remetente. O Gmail grátis manda cerca de 500 e-mails por dia.
   Com SMTP próprio o Supabase começa em 30 e-mails por hora (ajustável em **Authentication → Rate
   Limits**).
5. **Authentication → URL Configuration → Site URL**: a página que abre depois de tocar no link de
   confirmação. O repositório publica uma pelo GitHub Pages (pasta `site/`, workflow
   `pages.yml`; em **Settings → Pages**, a origem é **GitHub Actions**):
   `https://<usuário>.github.io/<repositório>/`. Ela diz "E-mail confirmado" ou, com link já usado
   ou expirado, o que fazer, e tira os códigos de acesso do endereço. A pessoa volta ao app e toca
   em "Já confirmei, entrar".
6. **Project Settings → API Keys**: copie a URL do projeto e a **publishable key** para o
   `.env.local` (a secreta nunca entra no app):
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_...
   ```
7. Reinicie com `npx expo start --clear` (sem o `--clear`, o Metro guarda os valores antigos).

O plano Free pausa o projeto depois de 7 dias sem uso (reativa no painel) e tem 500 MB de banco
e 1 GB de arquivos.

### Testes contra a nuvem

Com a confirmação de e-mail ligada, contas novas não entram na hora, então os testes que criam
várias contas (`test:sync`) rodam no Supabase local. Para os que precisam de uma pessoa só, crie
uma conta de teste pelo app, confirme o e-mail e ponha no `.env.local`:

```
TEST_ACCOUNT_EMAIL=...
TEST_ACCOUNT_PASSWORD=...
```

## 2. Assistente por voz

1. [Google AI Studio](https://aistudio.google.com/apikey) → **Create API key** (grátis, sem
   cartão).
2. Supabase → **Edge Functions → Secrets** → nome `GEMINI_API_KEY`, valor = a chave → Save.
   Para trocar a chave (por exemplo, se suspeitar que vazou), gere outra no AI Studio, apague a
   antiga lá e atualize este secret; a função lê o valor novo na hora.
3. Supabase → **Edge Functions → Deploy a new function → Via Editor** → apague o exemplo, cole o
   conteúdo de `supabase/functions/assistente/index.ts`, dê o nome `assistente` → **Deploy
   function**. Para atualizar, abra a função, cole a versão nova e faça o deploy de novo.
4. Confira se o SQL `20261006120000_assistente_cota.sql` foi rodado (passo 2 da seção 1).
5. `npm run test:assistente` manda frases reais e confere o que voltou.

O modelo e os limites (40 pedidos por pessoa por dia, áudio até ~1 MB, texto até 2.000
caracteres) ficam no topo da função (`MODEL` e `LIMITS`).

## 3. Publicar para o Expo Go (sem o PC ligado)

O app é publicado no **EAS Update** e aberto pelo **Expo Go**, sem build próprio e sem conta paga
da Apple.

- `app.json`: `owner` e `extra.eas.projectId` ligam o app ao projeto no expo.dev (criado com
  `npx eas-cli@latest init`); `runtimeVersion.policy = "sdkVersion"` (`exposdk:57.0.0`) é o que o
  Expo Go aceita. Não mude o `slug` nem o `owner`: o link de atualização depende deles.
- As variáveis `EXPO_PUBLIC_*` do `.env.local` precisam estar no ambiente `production` do EAS:
  `npx eas-cli@latest env:set production --name EXPO_PUBLIC_SUPABASE_URL --value ... --visibility plaintext`
  (e o mesmo para a chave publishable).
- **Publicar**: commit e `npm run publicar` (recusa se houver alteração sem commit e usa a mensagem
  do último commit). Sai para iPhone e Android juntos (`--platform all` no eas update não inclui a
  web). Os celulares baixam ao abrir o app, às vezes só na segunda abertura. O Android quase não
  foi testado: a gravação de voz lá foi trocada para m4a/AAC (o padrão era 3GP/AMR, que o Gemini
  não aceita).
- **Abrir**: o Expo Go só abre updates de projetos da conta logada nele ou de uma organização da
  qual a pessoa faz parte. Para outras pessoas testarem, ponha o projeto numa organização do Expo e
  convide cada uma como **Viewer** (só abre pelo Expo Go, não mexe em nada). O link é
  `exp://u.expo.dev/<projectId>?runtime-version=exposdk%3A57.0.0&channel-name=production`, ou o QR
  code de `https://qr.expo.dev/eas-update?projectId=<projectId>&runtimeVersion=exposdk:57.0.0&channel=production&slug=exp`.
  Para convidar alguém, mande a página do site (https://diogoduo.github.io/FitVibe/): sem os
  códigos do e-mail no endereço, ela mostra os passos e o botão que abre o app (o WhatsApp não
  deixa tocar em links `exp://`). A página de membros da organização no expo.dev é só para o dono.
- **Dados no Expo Go**: cada projeto publicado guarda os dados num espaço próprio (pelo dono do
  projeto). Trocar de dono ou abrir pela primeira vez começa vazio; entrar na conta baixa o que
  está na nuvem.
- **Limite**: o Expo Go roda um SDK por vez. Quando o Expo Go da App Store passar para o próximo
  SDK (App Store ou Play Store), o app para de abrir até o projeto ser atualizado e publicado de
  novo.
