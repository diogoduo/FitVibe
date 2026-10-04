import { Alert, Text } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { signOut, wipeDevice } from '@/sync/account';
import { useSession } from '@/sync/hooks';

/** Ajustes: onde os dados ficam e o botão de apagar tudo deste celular (volta para o cadastro). */
export function LocalDataCard() {
  const { session } = useSession();

  const wipe = async () => {
    if (!session) {
      wipeDevice();
      return;
    }
    // Com conta: envia o que falta, sai e apaga. Os dados continuam salvos na conta.
    const result = await signOut('wipe');
    if (result.status === 'error') Alert.alert('Não deu para apagar', result.message);
  };

  const confirmWipe = () =>
    Alert.alert(
      'Apagar todos os dados deste celular?',
      session
        ? 'Perfil, metas, pesagens, treinos, dieta e mídias saem deste celular e você sai da conta. O que já está na conta continua lá.'
        : 'Perfil, metas, pesagens, treinos, dieta e mídias serão apagados. Sem conta, não dá para desfazer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Apagar tudo', style: 'destructive', onPress: () => void wipe() },
      ],
    );

  return (
    <Card icon="lock" title="Seus dados">
      <Text className="text-base leading-6 text-fg-muted">
        Tudo fica salvo neste celular e funciona sem internet.{' '}
        {session
          ? 'Com a conta, uma cópia vai para o servidor sempre que houver conexão. Ficam só neste celular: as fotos de progresso, os vídeos e fotos dos exercícios, os lembretes e o tema.'
          : 'Crie uma conta para ter uma cópia no servidor.'}
      </Text>
      <Button label="Apagar todos os dados" variant="danger" onPress={confirmWipe} />
    </Card>
  );
}
