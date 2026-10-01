import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { FormScroll } from '@/components/ui/form-scroll';
import { TextField } from '@/components/ui/text-field';
import { normalizeUrl } from '@/features/media/links';
import { addLink } from '@/features/media/repository';

/** Adicionar um link (YouTube, Instagram, qualquer site) a um exercício. */
export default function AddLinkScreen() {
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>();
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [showError, setShowError] = useState(false);

  const normalized = normalizeUrl(url);

  const save = () => {
    if (!normalized) {
      setShowError(true);
      return;
    }
    addLink(exerciseId, normalized, title.trim() || null);
    router.back();
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Adicionar link' }} />
      <FormScroll>
        <TextField
          label="Link"
          value={url}
          onChangeText={setUrl}
          placeholder="https://youtu.be/..."
          keyboardType="url"
          autoCapitalize="none"
          autoFocus
          error={showError && !normalized ? 'Cole um link válido' : undefined}
          hint="Links do YouTube e do Instagram abrem direto no app, se você tiver."
        />
        <TextField
          label="Título (opcional)"
          value={title}
          onChangeText={setTitle}
          placeholder="Ex.: dica de execução do professor"
          maxLength={80}
        />
        <Button label="Salvar" onPress={save} />
      </FormScroll>
    </>
  );
}
