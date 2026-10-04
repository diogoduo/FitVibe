import { Alert, Text } from 'react-native';

import { Card } from '@/components/ui/card';
import { ToggleField } from '@/components/ui/toggle-field';
import { queryClient } from '@/lib/query-client';

import { updateMyProfile } from '../social/api';
import { socialKeys, useMySocialProfile } from '../social/queries';
import type { NotifyPrefs } from '../social/types';

const OPTIONS: { key: keyof NotifyPrefs; label: string; hint: string }[] = [
  {
    key: 'notify_follows',
    label: 'Seguidores',
    hint: 'Quem começou a te seguir, pedidos e pedidos aceitos.',
  },
  { key: 'notify_likes', label: 'Curtidas', hint: 'Quando curtirem seus posts.' },
  { key: 'notify_comments', label: 'Comentários', hint: 'Quando comentarem nos seus posts.' },
  {
    key: 'notify_posts',
    label: 'Posts de quem você segue',
    hint: 'Ex.: "anasouza postou o café da manhã".',
  },
];

/** Ajustes: o que entra no sininho. Vale na hora (salvo no servidor). */
export function NotificationSettingsCard() {
  const { data: me } = useMySocialProfile();
  if (!me) return null;

  const change = async (key: keyof NotifyPrefs, value: boolean) => {
    // Responde na hora; se o servidor recusar, volta como estava.
    queryClient.setQueryData(socialKeys.me, { ...me, [key]: value });
    try {
      const saved = await updateMyProfile({ [key]: value });
      queryClient.setQueryData(socialKeys.me, saved);
    } catch (error) {
      queryClient.setQueryData(socialKeys.me, me);
      Alert.alert('Não deu para salvar', String((error as Error).message));
    }
  };

  return (
    <Card icon="bell" title="Notificações">
      <Text className="text-base leading-6 text-fg-muted">
        Aparecem no 🔔 do Feed e num aviso no topo quando o app está aberto. Com o app fechado não
        chega aviso (precisaria de um app próprio na App Store, que é pago).
      </Text>
      {OPTIONS.map((option) => (
        <ToggleField
          key={option.key}
          label={option.label}
          hint={option.hint}
          value={me[option.key]}
          onChange={(value) => void change(option.key, value)}
        />
      ))}
    </Card>
  );
}
