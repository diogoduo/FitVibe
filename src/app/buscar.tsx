import { Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';

import { FormScroll } from '@/components/ui/form-scroll';
import { TextField } from '@/components/ui/text-field';
import { PersonRow } from '@/features/social/person-row';
import { useSearchProfiles } from '@/features/social/queries';
import { palette } from '@/theme/palette';

/** Buscar pessoas pelo @usuário ou pelo nome. */
export default function SearchPeopleScreen() {
  const [query, setQuery] = useState('');
  const results = useSearchProfiles(query);
  const typed = query.trim().replace(/^@/, '').length >= 2;

  return (
    <FormScroll>
      <Stack.Screen options={{ title: 'Buscar pessoas' }} />
      <TextField
        label="@usuário ou nome"
        value={query}
        onChangeText={setQuery}
        autoFocus
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="Ex.: anasouza"
      />
      {!typed ? (
        <Text className="text-base text-fg-muted">Digite pelo menos 2 letras.</Text>
      ) : results.isLoading ? (
        <ActivityIndicator color={palette.dark.primary} />
      ) : results.error ? (
        <Text className="text-base text-fg-muted">{results.error.message}</Text>
      ) : results.data?.length === 0 ? (
        <Text className="text-base text-fg-muted">Ninguém encontrado.</Text>
      ) : (
        results.data?.map((person) => (
          <PersonRow
            key={person.user_id}
            person={person}
            right={person.is_private ? <Text className="text-base">🔒</Text> : null}
          />
        ))
      )}
    </FormScroll>
  );
}
