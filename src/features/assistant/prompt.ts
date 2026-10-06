import { formatDayKey, isoWeekday, toDayKey, weekdayName } from '@/lib/dates';

import { MEASUREMENT_FIELDS } from '../measurements/measurement-form';
import type { FoodCatalog } from './catalog';

/** O que o app conta para a IA sobre o momento: refeições, treino, plano e alimentos. */
export type AssistantContext = {
  now: Date;
  meals: readonly { id: string; name: string }[];
  catalog: FoodCatalog;
  /** Exercícios do treino em andamento (vazio se não há treino). */
  exercises: readonly { code: string; entryId: string; name: string }[];
  /** Treinos do plano, para "vou treinar perna". */
  sessions: readonly { code: string; id: string; name: string; weekday: number }[];
};

/** A conversa até aqui, quando a pessoa responde a uma pergunta. */
export type PreviousTurn = { transcript: string; questions: readonly string[] };

const RULES = `Você é o assistente do FitVibe, um app de dieta e treino. A pessoa fala (áudio) ou digita, em português do Brasil, o que comeu, bebeu, pesou, mediu ou treinou. Transforme isso em registros.

Regras gerais:
- transcript: o que a pessoa disse, como texto (transcreva o áudio; se veio texto, copie).
- Um item por alimento, bebida ou registro. Nunca invente nada que a pessoa não disse.
- Campos que não se aplicam ao tipo do item: null (options = [], estimated = false).
- day: 0 = hoje, -1 = ontem ("ontem jantei..."). Padrão 0.
- question: só quando algo importante ficou incerto (qual alimento, quanto); pergunta curta, em português. Senão null.
- questions: dúvidas gerais que não cabem num item (ex.: um trecho que você não entendeu). Senão [].

Alimentos e bebidas (kind "food"):
- meal: o nome EXATO de uma refeição da lista quando a pessoa disser ("almocei" = Almoço, "no café da manhã" = Café da manhã, "jantei" = Jantar, "antes do treino" = Pré-treino, "lanchei" = Lanche da tarde). Se ela não disser, null.
- food: o código (ex.: t3, u2) do alimento do catálogo que é o MESMO alimento. Prefira os marcados com * (a pessoa já usa). Respeite o preparo dito (grelhado, frito, cozido, cru). Sem preparo dito, arroz, feijão, macarrão, carnes e ovos são os prontos para comer (cozido/grelhado), nunca crus. "Bife" sem corte dito: um bife bovino grelhado comum (ex.: contra-filé grelhado). Marca ou produto específico que não está no catálogo (ex.: Coca-Cola Zero não é "Refrigerante, tipo cola"): food = null.
- options: até 3 códigos de alternativas próximas quando houver dúvida real entre elas (ex.: feijão carioca × preto). Senão [].
- name: nome curto e claro do que a pessoa quis dizer ("Coca-Cola Zero", "Bife grelhado").
- amount: quantidade TOTAL em g, ou em ml para itens marcados (ml) e bebidas. "200 de arroz" = 200 g; "meio quilo" = 500. Unidades (2 bifes, 1 lata, 1 copo, 1 colher, 1 fatia, 1 prato, 1 unidade): use a porção entre colchetes do item, se houver; senão uma porção típica brasileira (bife ≈ 100 g, lata = 350 ml, copo = 200 ml, colher de sopa ≈ 25 g, fatia de pão de forma ≈ 25 g, ovo ≈ 50 g, banana ≈ 90 g, prato de arroz ≈ 150 g, concha de feijão ≈ 100 g) e marque estimated = true. Sem quantidade dita: uma porção comum, estimated = true.

Água (kind "water"): só água pura. amount em ml ("2 copos" = 400, "uma garrafinha" = 500; estimated = true quando estimar). Suco, café, refrigerante etc. são "food".

Peso corporal (kind "weight"): amount em kg ("pesei 86,2" = 86.2).

Medidas do corpo (kind "measurement"): field = uma chave da lista de medidas; amount em cm. Um item por medida.

Séries de treino (kind "set"): só se houver treino em andamento. exercise = código do exercício da lista. load = kg (null se só o peso do corpo), reps = repetições, rir só se a pessoa disser ("faltando 1" = 1, "até a falha" = 0). Um item por série: "3 séries de 10 com 30" = 3 itens.

Começar treino (kind "start_workout"): session = código do treino do plano ("vou treinar perna", "começar o treino de hoje" = o treino de hoje).`;

/** As instruções completas, com os dados do celular. */
export function buildSystemPrompt(context: AssistantContext): string {
  const day = toDayKey(context.now);
  const time = `${String(context.now.getHours()).padStart(2, '0')}:${String(
    context.now.getMinutes(),
  ).padStart(2, '0')}`;
  const weekday = isoWeekday(day);
  const sessions = context.sessions.length
    ? context.sessions
        .map(
          (session) =>
            `${session.code} ${session.name} (${weekdayName(session.weekday).toLowerCase()}` +
            `${session.weekday === weekday ? ', hoje' : ''})`,
        )
        .join('\n')
    : '(sem plano de treino)';
  const exercises = context.exercises.length
    ? context.exercises.map((exercise) => `${exercise.code} ${exercise.name}`).join('\n')
    : '(nenhum treino em andamento: não use kind "set")';

  return [
    RULES,
    `Agora: ${weekdayName(weekday).toLowerCase()}, ${formatDayKey(day)}, ${time}.`,
    `Refeições:\n${context.meals.map((meal) => meal.name).join('\n')}`,
    `Medidas (chave = nome):\n${MEASUREMENT_FIELDS.map((field) => `${field.key} = ${field.label}`).join('\n')}`,
    `Treino em andamento:\n${exercises}`,
    `Treinos do plano:\n${sessions}`,
    `Catálogo de alimentos (código nome; * = a pessoa já usa; (ml) = medido em ml; [porções]):\n${context.catalog.text}`,
  ].join('\n\n');
}

export type InputPart =
  { type: 'text'; text: string } | { type: 'audio'; data: string; mime_type: string };

/** O que vai junto das instruções: a fala (ou o texto) e, se houver, a conversa anterior. */
export function buildInput(input: {
  text?: string;
  audio?: { base64: string; mimeType: string };
  previous?: PreviousTurn | null;
}): InputPart[] {
  const parts: InputPart[] = [];
  if (input.previous) {
    const asked = input.previous.questions.length
      ? `\nVocê perguntou: ${input.previous.questions.join(' ')}`
      : '';
    parts.push({
      type: 'text',
      text:
        `Antes a pessoa disse: "${input.previous.transcript}"${asked}\n` +
        'Agora ela completa ou corrige (a seguir). Devolva a lista COMPLETA e atualizada, juntando ' +
        'o que ela disse antes com o que diz agora; no transcript, só a fala nova.',
    });
  }
  if (input.audio) {
    parts.push({ type: 'audio', data: input.audio.base64, mime_type: input.audio.mimeType });
  }
  if (input.text?.trim()) parts.push({ type: 'text', text: input.text.trim() });
  return parts;
}
