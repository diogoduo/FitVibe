import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { celebrate } from '@/components/ui/celebration';
import { FormScroll } from '@/components/ui/form-scroll';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { showUndo } from '@/components/ui/undo-bar';
import { AssistantError } from '@/features/assistant/api';
import { Composer, type ComposerInput } from '@/features/assistant/composer';
import { pendingItems } from '@/features/assistant/draft';
import { DraftReview } from '@/features/assistant/draft-review';
import { markAssistantNoticeSeen, useAssistantNoticeSeen } from '@/features/assistant/notice';
import { saveDraft } from '@/features/assistant/save';
import {
  getAssistantDraft,
  setAssistantDraft,
  useAssistantDraft,
} from '@/features/assistant/store';
import { understand } from '@/features/assistant/understand';
import { RECORD_LABELS } from '@/features/workout/records';
import { haptics } from '@/lib/haptics';
import { useSession } from '@/sync/hooks';
import { useColors } from '@/theme/theme';

type Params = { modo?: 'voz' | 'texto' };

const EXAMPLES = [
  '“Almocei 200 de arroz, 100 de feijão e 2 bifes grelhados”',
  '“Bebi 500 ml de água” · “Pesei 86,2”',
  '“Supino 30 quilos, 8 repetições” (com o treino aberto)',
];

/**
 * Assistente: fala (ou texto) → o que a IA entendeu → conferir → salvar tudo de uma vez.
 * Quando a IA tem dúvida, pergunta; dá para responder falando de novo.
 */
export default function AssistantScreen() {
  const { modo } = useLocalSearchParams<Params>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { session, loaded } = useSession();
  const noticeSeen = useAssistantNoticeSeen();
  const draft = useAssistantDraft();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AssistantError | null>(null);
  // A última fala, para "Tentar de novo".
  const [lastInput, setLastInput] = useState<ComposerInput | null>(null);

  // Ao fechar a tela, a conversa acaba.
  useEffect(() => () => setAssistantDraft(null), []);

  const submit = async (input: ComposerInput) => {
    setLastInput(input);
    setBusy(true);
    setError(null);
    try {
      const next = await understand({ ...input, previous: getAssistantDraft() });
      haptics.success();
      setAssistantDraft(next);
    } catch (caught) {
      haptics.warning();
      setError(
        caught instanceof AssistantError
          ? caught
          : new AssistantError('failed', caught instanceof Error ? caught.message : String(caught)),
      );
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    if (!draft) return;
    const result = saveDraft(draft);
    if (result.count === 0) return;
    haptics.success();
    if (result.records.length > 0) {
      celebrate(
        'Novo recorde!',
        result.records
          .map(
            (record) =>
              `${record.exerciseName}: ${record.kinds.map((kind) => RECORD_LABELS[kind].toLowerCase()).join(', ')}`,
          )
          .join('\n'),
      );
    }
    showUndo(
      result.count === 1 ? '1 registro salvo.' : `${result.count} registros salvos.`,
      result.undo,
    );
    setAssistantDraft(null);
    router.back();
  };

  const pending = draft ? pendingItems(draft).length : 0;
  const toSave = draft
    ? draft.items.filter((item) => item.kind !== 'start' && (item.kind !== 'food' || item.food))
        .length
    : 0;
  const ready = loaded && session != null && noticeSeen === true;

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: 'Assistente' }} />
      <FormScroll>
        {loaded && !session ? (
          <Card icon="lock" title="Precisa de conta">
            <Text className="text-base leading-6 text-fg">
              O assistente usa a internet e só funciona com a conta do FitVibe.
            </Text>
            <Button label="Entrar ou criar conta" onPress={() => router.replace('/conta')} />
          </Card>
        ) : null}

        {session && noticeSeen === false ? (
          <Card icon="info" title="Como funciona">
            <Text className="text-base leading-6 text-fg">
              Você fala (ou digita) e o Gemini, a IA do Google, separa os alimentos, as quantidades
              e a refeição. As calorias vêm do banco do app, e nada é salvo antes de você conferir.
            </Text>
            <Text className="text-sm leading-5 text-fg-muted">
              O áudio e o texto vão para o Google e não ficam no celular. No plano grátis, o Google
              pode usar o que for enviado para melhorar os produtos dele.
            </Text>
            <Button label="Entendi" onPress={markAssistantNoticeSeen} />
          </Card>
        ) : null}

        {ready && !draft ? (
          <Animated.View entering={FadeIn.duration(200)} style={{ gap: 20, paddingTop: 8 }}>
            <Composer onSubmit={submit} busy={busy} autoStart={modo === 'voz'} />
            {!busy && !error ? (
              <View className="gap-1.5 px-1">
                <Text className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                  Exemplos
                </Text>
                {EXAMPLES.map((example) => (
                  <Text key={example} className="text-sm leading-5 text-fg-muted">
                    {example}
                  </Text>
                ))}
              </View>
            ) : null}
          </Animated.View>
        ) : null}

        {busy ? <Thinking /> : null}

        {error ? (
          <Animated.View entering={FadeInDown.duration(200)}>
            <Card icon="info" iconColor={colors.danger} title="Não deu certo">
              <Text className="text-base leading-6 text-fg">{error.message}</Text>
              {error.detail && error.code === 'failed' ? (
                <Text className="text-xs text-fg-muted" selectable>
                  {error.detail}
                </Text>
              ) : null}
              <View className="flex-row gap-3">
                <Button label="Registrar à mão" variant="secondary" onPress={router.back} grow />
                {lastInput && error.code !== 'not_installed' && error.code !== 'no_key' ? (
                  <Button label="Tentar de novo" onPress={() => void submit(lastInput)} grow />
                ) : null}
              </View>
            </Card>
          </Animated.View>
        ) : null}

        {draft ? (
          <Animated.View entering={FadeInDown.duration(250)} style={{ gap: 12 }}>
            <Card icon="waveform" title="Você disse">
              {draft.transcripts.map((transcript, index) => (
                <Text key={index} className="text-base italic leading-6 text-fg">
                  “{transcript}”
                </Text>
              ))}
            </Card>

            {draft.questions.length > 0 ? (
              <Card icon="question" iconColor={colors.warning} title="Dúvidas">
                {draft.questions.map((question) => (
                  <Text key={question} className="text-base leading-6 text-warning">
                    {question}
                  </Text>
                ))}
                <Text className="text-sm text-fg-muted">
                  Responda falando ou digitando aqui embaixo.
                </Text>
              </Card>
            ) : null}

            {draft.items.length > 0 ? (
              <DraftReview draft={draft} />
            ) : (
              <Text className="px-1 text-base text-fg-muted">
                Nada para registrar nessa fala. Tente de novo, com o alimento e a quantidade.
              </Text>
            )}

            <View className="gap-1.5 pt-1">
              <Text className="px-1 text-xs font-semibold uppercase tracking-wider text-fg-muted">
                Faltou algo? Responder ou completar
              </Text>
              <Composer onSubmit={submit} busy={busy} compact />
            </View>
          </Animated.View>
        ) : null}
      </FormScroll>

      {draft && !busy && toSave > 0 ? (
        <Animated.View
          entering={FadeInDown.duration(200)}
          style={{
            gap: 6,
            borderTopWidth: 1,
            borderTopColor: colors.line,
            backgroundColor: colors.background,
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: insets.bottom + 12,
          }}
        >
          {pending > 0 ? (
            <Text className="text-center text-sm text-warning">
              {pending === 1
                ? 'Falta escolher 1 alimento (ou tirar com o X).'
                : `Faltam escolher ${pending} alimentos (ou tirar com o X).`}
            </Text>
          ) : null}
          <Button
            label={toSave === 1 ? 'Salvar 1 registro' : `Salvar ${toSave} registros`}
            icon="checkCircle"
            haptic={null}
            disabled={pending > 0}
            onPress={save}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

function Thinking() {
  const colors = useColors();
  return (
    <Animated.View entering={FadeIn.duration(200)}>
      <Card>
        <View className="flex-row items-center gap-3">
          <Spinner />
          <Text className="text-base font-semibold text-fg">Entendendo…</Text>
          <View className="flex-1" />
          <Icon name="sparkles" size={18} color={colors.primary} />
        </View>
        <Skeleton height={14} width="85%" />
        <Skeleton height={14} width="60%" />
        <Skeleton height={14} width="72%" />
      </Card>
    </Animated.View>
  );
}
