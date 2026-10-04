import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getSupabaseConfig } from '@/lib/supabase/config';
import { checkSupabaseHealth, type HealthResult } from '@/lib/supabase/health';
import { useColors } from '@/theme/theme';

type Status = { kind: 'checking' } | { kind: 'done'; result: HealthResult };

const CONFIG_HINTS = {
  'missing-url':
    'Não deu para descobrir o endereço do PC (o Metro está em modo túnel?). Defina EXPO_PUBLIC_SUPABASE_URL no .env.local.',
  'missing-key': 'Falta EXPO_PUBLIC_SUPABASE_KEY no .env.local (veja o .env.example).',
} as const;

/** Mostra se o celular alcança o Supabase. É o critério de pronto da Fase 0. */
export function SupabaseStatusCard() {
  const colors = useColors();
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
      <Card icon="cloud" title="Servidor (Supabase)">
        <StatusLine color={colors.warning} label="Não configurado" />
        <Text className="text-base leading-6 text-fg-muted">
          {CONFIG_HINTS[configResult.problem]}
        </Text>
      </Card>
    );
  }

  return (
    <Card icon="cloud" title="Servidor (Supabase)">
      {status.kind === 'checking' ? (
        <View className="flex-row items-center gap-3">
          <Spinner />
          <Text className="text-base text-fg">Testando conexão…</Text>
        </View>
      ) : status.result.ok ? (
        <StatusLine color={colors.success} label={`Conectado em ${status.result.latencyMs} ms`} />
      ) : (
        <>
          <StatusLine color={colors.danger} label="Sem conexão" />
          <Text className="text-base leading-6 text-fg-muted">
            {status.result.reason}.{' '}
            {url?.startsWith('https:')
              ? 'Confira a internet. No plano grátis, o Supabase pausa o projeto depois de 7 dias sem uso: reative no painel.'
              : 'Confira se o PC e o iPhone estão na mesma Wi-Fi, se o Supabase está rodando (npm run db:start) e se o Expo Go tem permissão de Rede Local.'}
          </Text>
        </>
      )}

      <Text className="font-mono text-sm text-fg-muted">{url}</Text>

      <Button
        label="Testar de novo"
        variant="secondary"
        onPress={retry}
        disabled={status.kind === 'checking'}
      />
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
