import { Alert } from 'react-native';

import { replaceLocalWithAccount, signOut, type AccountResult } from '@/sync/account';

type Conflict = Extract<AccountResult, { status: 'conflict' }>;

/**
 * "other-account" só acontece com a conta vazia (conta nova): trocar os dados do celular pelos
 * dela é começar do zero, e o aviso diz isso com essas palavras.
 */
const PROMPTS: Record<
  Conflict['reason'],
  { title: string; message: string; confirm: string; busy: string }
> = {
  both: {
    title: 'Usar os dados da conta?',
    message:
      'Esta conta já tem dados salvos, e este celular também. Dá para trocar os dados do celular pelos da conta (os deste celular são apagados) ou cancelar e sair da conta.',
    confirm: 'Usar os da conta',
    busy: 'Baixando os dados da conta…',
  },
  'other-account': {
    title: 'Começar do zero nesta conta?',
    message:
      'Esta conta ainda não tem dados, e os deste celular são de outra conta (continuam salvos nela). Para usar esta, o celular é limpo e você faz o cadastro de novo. Ou cancele e saia.',
    confirm: 'Começar do zero',
    busy: 'Limpando o celular…',
  },
};

/**
 * Pergunta o que fazer quando o celular e a conta têm dados diferentes. Resolve com o resultado
 * de baixar a conta, ou null se a pessoa cancelou (e saiu da conta).
 */
export function askConflict(
  conflict: Conflict,
  onReplacing: (busyLabel: string) => void,
): Promise<AccountResult | null> {
  const prompt = PROMPTS[conflict.reason];
  return new Promise((resolve) =>
    Alert.alert(prompt.title, prompt.message, [
      {
        text: 'Cancelar',
        style: 'cancel',
        onPress: () => void signOut('keep').then(() => resolve(null)),
      },
      {
        text: prompt.confirm,
        style: 'destructive',
        onPress: () => {
          onReplacing(prompt.busy);
          void replaceLocalWithAccount(conflict.userId).then(resolve);
        },
      },
    ]),
  );
}
