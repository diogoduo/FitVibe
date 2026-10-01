import { Text, View } from 'react-native';

/** Mostrada se as migrações do banco local falharem ao abrir o app. */
export function DatabaseErrorScreen({ error }: { error: Error }) {
  return (
    <View className="flex-1 justify-center gap-3 bg-background px-6">
      <Text className="text-2xl font-bold text-fg">Não deu para abrir o banco de dados</Text>
      <Text className="text-base leading-6 text-fg-muted">
        Feche e abra o app de novo. Se continuar, mande esta mensagem para o desenvolvedor:
      </Text>
      <Text selectable className="font-mono text-sm text-danger">
        {error.message}
      </Text>
    </View>
  );
}
