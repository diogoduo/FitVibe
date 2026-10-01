import { ComingInPhase } from '@/components/coming-in-phase';
import { Screen } from '@/components/ui/screen';

export default function DietScreen() {
  return (
    <Screen title="Dieta">
      <ComingInPhase
        phase={4}
        items={[
          'Diário por refeição com a tabela TACO offline',
          'Leitor de código de barras (Open Food Facts)',
          'Macros do dia × meta e contador de água',
        ]}
      />
    </Screen>
  );
}
