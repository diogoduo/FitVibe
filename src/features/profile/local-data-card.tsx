import { Alert, Text } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

import { deleteAllMediaFiles } from '../media/files';
import { cancelRestNotification } from '../workout/rest';
import { wipeAllData } from './repository';

/** Ajustes: onde os dados ficam e o botão de apagar tudo (volta para o cadastro). */
export function LocalDataCard() {
  const confirmWipe = () =>
    Alert.alert(
      'Apagar todos os dados?',
      'Perfil, metas, pesagens, medidas, plano, exercícios e mídias serão apagados deste celular. Não dá para desfazer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar tudo',
          style: 'destructive',
          onPress: () => {
            wipeAllData();
            deleteAllMediaFiles();
            cancelRestNotification();
          },
        },
      ],
    );

  return (
    <Card title="Seus dados">
      <Text className="text-base leading-6 text-fg-muted">
        Tudo fica salvo só neste celular e funciona sem internet. A cópia no servidor chega com a
        conta e a sincronização (Fase 5).
      </Text>
      <Button label="Apagar todos os dados" variant="danger" onPress={confirmWipe} />
    </Card>
  );
}
