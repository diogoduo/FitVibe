import { Alert } from 'react-native';

import { replaceLocalWithAccount, signOut, type AccountResult } from '@/sync/account';

type Conflict = Extract<AccountResult, { status: 'conflict' }>;

const MESSAGES: Record<Conflict['reason'], string> = {
  both: 'Esta conta já tem dados salvos, e este celular também. Dá para trocar os dados do celular pelos da conta (os deste celular são apagados) ou cancelar e sair da conta.',
  'other-account':
    'Os dados deste celular são de outra conta. Dá para trocá-los pelos desta conta (continuam salvos na outra) ou cancelar e sair.',
};

/**
 * Pergunta o que fazer quando o celular e a conta têm dados diferentes. Resolve com o resultado
 * de baixar a conta, ou null se a pessoa cancelou (e saiu da conta).
 */
export function askConflict(
  conflict: Conflict,
  onReplacing: () => void,
): Promise<AccountResult | null> {
  return new Promise((resolve) =>
    Alert.alert('Usar os dados da conta?', MESSAGES[conflict.reason], [
      {
        text: 'Cancelar',
        style: 'cancel',
        onPress: () => void signOut('keep').then(() => resolve(null)),
      },
      {
        text: 'Usar os da conta',
        style: 'destructive',
        onPress: () => {
          onReplacing();
          void replaceLocalWithAccount(conflict.userId).then(resolve);
        },
      },
    ]),
  );
}
