import { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Pressable, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Icon } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { useColors, useScheme } from '@/theme/theme';

import { MAX_RECORDING_SEC, useVoiceRecorder, type Recording } from './use-voice-recorder';
import { levelFromMetering, VoiceButton } from './voice-button';

export type ComposerInput = { audio?: Recording; text?: string };

const clock = (ms: number) => {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

/**
 * Falar ou digitar para o assistente. Grande na primeira fala; compacto ("responder ou
 * completar") quando já há um rascunho na tela.
 */
export function Composer({
  onSubmit,
  busy,
  compact,
  autoStart,
}: {
  onSubmit: (input: ComposerInput) => void;
  /** Esperando a resposta: não grava nem envia. */
  busy?: boolean;
  compact?: boolean;
  /** Começa a gravar ao abrir (tocou no microfone do Hoje). */
  autoStart?: boolean;
}) {
  const colors = useColors();
  const scheme = useScheme();
  const voice = useVoiceRecorder();
  const [recording, setRecording] = useState(false);
  const [text, setText] = useState('');
  const started = useRef(false);
  // Limite de tempo: para sozinho e manda o que gravou.
  const limit = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearLimit = () => {
    if (limit.current) clearTimeout(limit.current);
    limit.current = null;
  };

  const start = async () => {
    try {
      const status = await voice.start();
      if (status === 'denied') {
        Alert.alert(
          'Precisa do microfone',
          'Libere o microfone para o Expo Go nos Ajustes do iPhone. Enquanto isso, dá para digitar.',
          [
            { text: 'Agora não', style: 'cancel' },
            { text: 'Abrir Ajustes', onPress: () => void Linking.openSettings() },
          ],
        );
        return;
      }
      setRecording(true);
      clearLimit();
      limit.current = setTimeout(() => void stop(), MAX_RECORDING_SEC * 1000);
    } catch (error) {
      Alert.alert('Não deu para gravar', error instanceof Error ? error.message : String(error));
    }
  };

  const stop = async () => {
    clearLimit();
    setRecording(false);
    const audio = await voice.stop().catch(() => null);
    // Toque sem querer (menos de meio segundo): não manda nada.
    if (audio && audio.durationMs >= 500) onSubmit({ audio });
  };

  const cancel = async () => {
    clearLimit();
    setRecording(false);
    await voice.cancel().catch(() => null);
  };

  // Abriu pelo microfone do Hoje: já começa a ouvir.
  useEffect(() => {
    if (!autoStart || started.current) return;
    started.current = true;
    void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  // Fechou a tela gravando: o timer não dispara depois.
  useEffect(() => clearLimit, []);

  const sendText = () => {
    const value = text.trim();
    if (!value || busy) return;
    setText('');
    onSubmit({ text: value });
  };

  const level = levelFromMetering(voice.state.metering);

  const textBox = (
    <View className="flex-row items-end gap-2 rounded-2xl border border-line bg-surface-2 py-1.5 pl-3 pr-1.5">
      <TextInput
        value={text}
        onChangeText={setText}
        editable={!busy && !recording}
        placeholder={compact ? 'Responder ou completar…' : 'Ou digite aqui…'}
        placeholderTextColor={colors['fg-muted']}
        keyboardAppearance={scheme}
        multiline
        maxLength={1000}
        accessibilityLabel="Escrever para o assistente"
        className="max-h-32 flex-1 py-1.5 text-base text-fg"
      />
      <PressableScale
        onPress={sendText}
        disabled={!text.trim() || busy}
        haptic="tap"
        scaleTo={0.85}
        accessibilityRole="button"
        accessibilityLabel="Enviar"
        className="disabled:opacity-40"
      >
        <Icon name="send" size={32} color={colors.primary} />
      </PressableScale>
    </View>
  );

  if (compact) {
    return (
      <View className="gap-2">
        <View className="flex-row items-center gap-1">
          <VoiceButton
            recording={recording}
            level={level}
            onPress={recording ? stop : start}
            size={44}
            disabled={busy}
          />
          <View className="flex-1">
            {recording ? (
              <RecordingStatus ms={voice.state.durationMillis} onCancel={cancel} />
            ) : (
              textBox
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="items-center gap-2">
      <VoiceButton
        recording={recording}
        level={level}
        onPress={recording ? stop : start}
        disabled={busy}
      />
      {recording ? (
        <RecordingStatus ms={voice.state.durationMillis} onCancel={cancel} />
      ) : (
        <Text className="text-center text-base text-fg-muted">
          Toque no microfone e fale o que comeu, bebeu ou treinou.
        </Text>
      )}
      <View className="w-full pt-3">{textBox}</View>
    </View>
  );
}

function RecordingStatus({ ms, onCancel }: { ms: number; onCancel: () => void }) {
  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(150)}
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 }}
    >
      <Text className="text-base font-semibold text-danger">
        Ouvindo… {clock(ms)} / {clock(MAX_RECORDING_SEC * 1000)}
      </Text>
      <Pressable onPress={onCancel} accessibilityRole="button" hitSlop={10}>
        <Text className="text-base font-semibold text-fg-muted">Cancelar</Text>
      </Pressable>
    </Animated.View>
  );
}
