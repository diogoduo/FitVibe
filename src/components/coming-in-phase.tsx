import { Text } from 'react-native';

import { Card } from '@/components/ui/card';

type ComingInPhaseProps = {
  phase: number;
  items: string[];
};

/** Marcador das abas que ainda não têm conteúdo: diz em que fase do plano elas chegam. */
export function ComingInPhase({ phase, items }: ComingInPhaseProps) {
  return (
    <Card title={`Chega na Fase ${phase}`}>
      {items.map((item) => (
        <Text key={item} className="text-base leading-6 text-fg">
          • {item}
        </Text>
      ))}
    </Card>
  );
}
