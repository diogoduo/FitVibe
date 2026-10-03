import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatTimeAgo } from '@/lib/dates';
import { useNow } from '@/lib/use-now';
import {
  deleteAccount,
  resumeAccount,
  signOut,
  syncNow,
  type AccountResult,
} from '@/sync/account';
import { useSession, useSyncStatus } from '@/sync/hooks';
import { supabase } from '@/sync/supabase';
import { palette } from '@/theme/palette';

import { askConflict } from './conflict';

const changes = (n: number) => (n === 1 ? '1 alteração' : `${n} alterações`);

/** Ajustes: entrar na conta, ver se está sincronizado, sair e excluir a conta. */
export function AccountCard() {
  const { session, loaded } = useSession();
  const status = useSyncStatus();
  const now = useNow(30_000);
  const [busy, setBusy] = useState<string | null>(null);

  if (!supabase || !loaded) return null;

  const showError = (result: AccountResult | null) => {
    if (result?.status === 'error') Alert.alert('Não deu certo', result.message);
  };

  const run = async (label: string, action: () => Promise<AccountResult | null>) => {
    setBusy(label);
    try {
      showError(await action());
    } finally {
      setBusy(null);
    }
  };

  if (!session) {
    return (
      <Card title="Conta">
        <Text className="text-base leading-6 text-fg-muted">
          Sem conta, tudo fica só neste celular. Com uma conta, uma cópia vai para o servidor: dá
          para trocar de celular sem perder nada, e o perfil e o feed vão usar essa conta.
        </Text>
        <Button label="Entrar ou criar conta" onPress={() => router.push('/conta')} />
      </Card>
    );
  }

  const email = session.user.email ?? 'sua conta';

  // Entrou, mas fechou o app antes de escolher entre os dados do celular e os da conta.
  if (status.userId !== session.user.id) {
    const resume = () =>
      run('Conferindo a conta…', async () => {
        const result = await resumeAccount();
        if (result.status !== 'conflict') return result;
        return askConflict(result, () => setBusy('Baixando os dados da conta…'));
      });
    return (
      <Card title="Conta">
        <Text className="text-base text-fg">{email}</Text>
        <Text className="text-base leading-6 text-fg-muted">
          Falta escolher quais dados usar neste celular.
        </Text>
        {busy ? (
          <BusyLine label={busy} />
        ) : (
          <View className="flex-row gap-3">
            <Button label="Continuar" onPress={resume} grow />
            <Button
              label="Sair"
              variant="secondary"
              onPress={() => run('Saindo…', () => signOut('keep'))}
              grow
            />
          </View>
        )}
      </Card>
    );
  }

  const confirmSignOut = () =>
    Alert.alert(
      'Sair da conta?',
      status.pending > 0
        ? `${changes(status.pending)} ainda não foram para a conta. Saindo e mantendo, elas ficam neste celular e vão quando entrar de novo.`
        : 'Tudo o que está aqui já está salvo na conta.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair e manter neste celular', onPress: () => run('Saindo…', () => signOut('keep')) },
        {
          text: 'Sair e apagar deste celular',
          style: 'destructive',
          onPress: () => run('Enviando o que falta…', () => signOut('wipe')),
        },
      ],
    );

  const confirmDelete = () =>
    Alert.alert(
      'Excluir sua conta?',
      'A conta e tudo o que está salvo nela são apagados do servidor, e este celular volta para o cadastro. Não dá para desfazer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir conta',
          style: 'destructive',
          onPress: () => run('Excluindo…', deleteAccount),
        },
      ],
    );

  const syncing = status.syncing || busy != null;

  return (
    <Card title="Conta">
      <Text className="text-lg font-semibold text-fg">{email}</Text>

      {status.syncing ? (
        <BusyLine label="Sincronizando…" />
      ) : status.lastError ? (
        <View className="gap-1">
          <StatusLine color={palette.dark.danger} label="Não sincronizou" />
          <Text className="text-base leading-6 text-fg-muted">{status.lastError}</Text>
        </View>
      ) : (
        <StatusLine
          color={status.pending > 0 ? palette.dark.warning : palette.dark.success}
          label={
            status.lastSyncAt
              ? `Sincronizado ${formatTimeAgo(status.lastSyncAt, new Date(now))}`
              : 'Ainda não sincronizou'
          }
        />
      )}
      {status.pending > 0 && !status.syncing ? (
        <Text className="text-base text-fg-muted">
          {changes(status.pending)} para enviar à conta.
        </Text>
      ) : null}

      {busy ? <BusyLine label={busy} /> : null}

      <Button
        label="Sincronizar agora"
        variant="secondary"
        onPress={() => void syncNow()}
        disabled={syncing}
      />
      <View className="flex-row gap-3">
        <Button label="Sair" variant="secondary" onPress={confirmSignOut} disabled={syncing} grow />
        <Button
          label="Excluir conta"
          variant="danger"
          onPress={confirmDelete}
          disabled={syncing}
          grow
        />
      </View>
    </Card>
  );
}

function StatusLine({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
      <Text className="text-base font-semibold text-fg">{label}</Text>
    </View>
  );
}

function BusyLine({ label }: { label: string }) {
  return (
    <View className="flex-row items-center gap-3">
      <ActivityIndicator color={palette.dark.primary} />
      <Text className="text-base text-fg">{label}</Text>
    </View>
  );
}
