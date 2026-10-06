import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
  type RecordingOptions,
} from 'expo-audio';
import { File } from 'expo-file-system';
import { useRef } from 'react';

/** Uma fala longa cabe folgado; passa disso, a caixa de fala para sozinha. */
export const MAX_RECORDING_SEC = 60;

/** m4a/AAC leve (~8 KB por segundo): voz não precisa de mais. Com o nível do som (metering). */
const OPTIONS: RecordingOptions = { ...RecordingPresets.LOW_QUALITY, isMeteringEnabled: true };

export type Recording = { base64: string; mimeType: string; durationMs: number };

/**
 * Gravar a fala para o assistente: pede o microfone, grava e, ao parar, devolve o áudio em
 * base64 (o arquivo é apagado na hora).
 */
export function useVoiceRecorder() {
  const recorder = useAudioRecorder(OPTIONS);
  const state = useAudioRecorderState(recorder, 100);
  // Duração pelo relógio: quem para pode ser um timer, com o estado de quando começou.
  const startedAt = useRef(0);

  const start = async (): Promise<'recording' | 'denied'> => {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) return 'denied';
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    startedAt.current = Date.now();
    return 'recording';
  };

  const finish = async (keep: boolean): Promise<Recording | null> => {
    const durationMs = startedAt.current ? Date.now() - startedAt.current : 0;
    startedAt.current = 0;
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false });
    const uri = recorder.uri;
    if (!uri) return null;
    const file = new File(uri);
    try {
      return keep ? { base64: await file.base64(), mimeType: 'audio/m4a', durationMs } : null;
    } finally {
      try {
        file.delete();
      } catch {
        // Já não existe: tudo bem.
      }
    }
  };

  return {
    state,
    start,
    /** Para e devolve o áudio. */
    stop: () => finish(true),
    /** Para e descarta. */
    cancel: () => finish(false),
  };
}
