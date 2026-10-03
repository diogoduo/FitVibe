import { router } from 'expo-router';
import { Text } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

/** Ajustes: refeições do dia. */
export function DietSettingsCard() {
  return (
    <Card title="Dieta">
      <Text className="text-base leading-6 text-fg-muted">
        Renomeie, reordene, esconda ou crie refeições. A meta de água fica em Perfil e metas.
      </Text>
      <Button
        label="Refeições do dia"
        variant="secondary"
        onPress={() => router.push('/refeicoes')}
      />
    </Card>
  );
}

/** Ajustes: de onde vêm os dados (as licenças pedem a citação). */
export function DataSourcesCard() {
  return (
    <Card title="Fontes dos dados">
      <Text className="text-sm leading-5 text-fg-muted">
        <Text className="font-semibold text-fg">Alimentos:</Text> Tabela Brasileira de Composição de
        Alimentos (TACO), 4ª edição, NEPA/UNICAMP, 2011; produtos do Open Food Facts
        (openfoodfacts.org), licença ODbL.
      </Text>
      <Text className="text-sm leading-5 text-fg-muted">
        <Text className="font-semibold text-fg">Fotos dos exercícios:</Text> free-exercise-db,
        domínio público (Unlicense).
      </Text>
    </Card>
  );
}
