import { Text } from 'react-native';

import type { Sex } from '@/db/schema';
import { formatDecimal } from '@/lib/numbers';

/** Linha do % de gordura estimado, ou o que falta medir para estimar. */
export function BodyFatNote({ sex, bodyFatPct }: { sex: Sex; bodyFatPct: number | null }) {
  if (bodyFatPct == null) {
    return (
      <Text className="text-sm leading-5 text-fg-muted">
        Para estimar o % de gordura, meça pescoço e{' '}
        {sex === 'male' ? 'abdômen' : 'cintura e quadril'}.
      </Text>
    );
  }
  return (
    <Text className="text-sm leading-5 text-fg-muted">
      <Text className="font-semibold text-fg">
        % de gordura estimado: {formatDecimal(bodyFatPct)}%
      </Text>{' '}
      (método da Marinha americana). É uma estimativa: serve para acompanhar a tendência, não como
      número exato.
    </Text>
  );
}
