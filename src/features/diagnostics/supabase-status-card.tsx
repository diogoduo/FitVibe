import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { getSupabaseConfig } from '@/lib/supabase/config';
import { checkSupabaseHealth, type HealthResult } from '@/lib/supabase/health';
import { palette } from '@/theme/palette';

type Status = { kind: 'checking' } | { kind: 'done'; result: HealthResult };

const CONFIG_HINTS = {
  'missing-url':
    'Não deu para descobrir o endereço do PC (o Metro está em modo túnel?). Defina EXPO_PUBLIC_SUPABASE_URL no .env.local.',
  'missing-key': 'Falta EXPO_PUBLIC_SUPABASE_KEY no .env.local (veja o .env.example).',
} as const;

/** Mostra se o celular alcança o Supabase. É o critério de pronto da Fase 0. */
export function SupabaseStatusCard() {
  const configResult = getSupabaseConfig();
  const config = configResult.ok ? configResult.config : null;
  const url = config?.url;
  const key = config?.key;
  const [status, setStatus] = useState<Status>({ kind: 'checking' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!url || !key) return;
    let stale = false;
    checkSupabaseHealth({ url, key }).then((result) => {
      if (!stale) setStatus({ kind: 'done', result });
    });
    return () => {
      stale = true;
    };
  }, [url, key, attempt]);

  const retry = () => {
    setStatus({ kind: 'checking' });
    setAttempt((n) => n + 1);
  };

  if (!configResult.ok) {
    return (
      <Card title="Servidor (Supabase)">
        <StatusLine color={palette.dark.warning} label="Não configurado" />
        <Text className="text-base leading-6 text-fg-muted">
          {CONFIG_HINTS[configResult.problem]}
        </Text>
      </Card>
    );
  }

  return (
    <Card title="Servidor (Supabase)">
      {status.kind === 'checking' ? (
        <View className="flex-row items-center gap-3">
          <ActivityIndicator color={palette.dark.primary} />
          <Text className="text-base text-fg">Testando conexão…</Text>
        </View>
      ) : status.result.ok ? (
        <StatusLine
          color={palette.dark.success}
          label={`Conectado em ${status.result.latencyMs} ms`}
        />
      ) : (
        <>
          <StatusLine color={palette.dark.danger} label="Sem conexão" />
          <Text className="text-base leading-6 text-fg-muted">
            {status.result.reason}. Confira se o PC e o iPhone estão na mesma Wi-Fi, se o Supabase
            está rodando (npm run db:start) e se o Expo Go tem permissão de Rede Local.
          </Text>
        </>
      )}

      <Text className="font-mono text-sm text-fg-muted">{url}</Text>

      <Pressable
        onPress={retry}
        disabled={status.kind === 'checking'}
        accessibilityRole="button"
        className="items-center rounded-xl bg-surface-2 py-3 active:opacity-70 disabled:opacity-50"
      >
        <Text className="text-base font-semibold text-primary">Testar de novo</Text>
      </Pressable>
    </Card>
  );
}

function StatusLine({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
      <Text className="text-lg font-semibold text-fg">{label}</Text>
    </View>
  );
}
