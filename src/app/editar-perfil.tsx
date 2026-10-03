import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { FormScroll } from '@/components/ui/form-scroll';
import { TextField } from '@/components/ui/text-field';
import { ToggleField } from '@/components/ui/toggle-field';
import { newId } from '@/db/client';
import { getProfile } from '@/features/profile/queries';
import * as api from '@/features/social/api';
import { Avatar } from '@/features/social/avatar';
import {
  AVATAR_WIDTH,
  compressPhoto,
  pickPhoto,
  uploadJpeg,
  type LocalPhoto,
} from '@/features/social/photos';
import { republishToday } from '@/features/social/publish-day';
import { refreshSocial, socialKeys, useMySocialProfile } from '@/features/social/queries';
import { AVATARS, avatarPath } from '@/features/social/storage';
import type { SocialProfile, SocialProfileInput } from '@/features/social/types';
import { cleanUsername, suggestUsername, validateUsername } from '@/features/social/username';
import { queryClient } from '@/lib/query-client';
import { palette } from '@/theme/palette';

type AvatarChange = { kind: 'keep' } | { kind: 'new'; photo: LocalPhoto } | { kind: 'remove' };

/** Criar ou editar o perfil público. Só abre com conta (ver SocialGate). */
export default function EditSocialProfileScreen() {
  const { data: me, isPending, session, sessionLoaded } = useMySocialProfile();
  if (sessionLoaded && !session) {
    return (
      <Text className="flex-1 bg-background p-4 text-base text-fg-muted">
        Entre na sua conta para criar o perfil.
      </Text>
    );
  }
  if (!sessionLoaded || isPending || me === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={palette.dark.primary} />
      </View>
    );
  }
  // key: o formulário começa com os valores carregados.
  return <ProfileForm key={me?.user_id ?? 'novo'} me={me} />;
}

function ProfileForm({ me }: { me: SocialProfile | null }) {
  const [initialName] = useState(() => me?.display_name ?? getProfile()?.name ?? '');
  const [displayName, setDisplayName] = useState(initialName);
  const [username, setUsername] = useState(me?.username ?? suggestUsername(initialName));
  const [bio, setBio] = useState(me?.bio ?? '');
  const [isPrivate, setIsPrivate] = useState(me?.is_private ?? true);
  const [shareTraining, setShareTraining] = useState(me?.share_training ?? true);
  const [shareDiet, setShareDiet] = useState(me?.share_diet ?? true);
  const [shareBody, setShareBody] = useState(me?.share_body ?? false);
  const [avatar, setAvatar] = useState<AvatarChange>({ kind: 'keep' });
  const [showErrors, setShowErrors] = useState(false);
  const [busy, setBusy] = useState(false);

  const usernameError = validateUsername(username) ?? undefined;
  const nameError = displayName.trim() ? undefined : 'Digite um nome.';

  const choosePhoto = (source: 'camera' | 'library') =>
    pickPhoto(source, { square: true })
      .then((photo) => photo && setAvatar({ kind: 'new', photo }))
      .catch((error) => Alert.alert('Não deu para abrir', String((error as Error).message)));

  const changePhoto = () =>
    Alert.alert('Foto do perfil', undefined, [
      { text: 'Tirar foto', onPress: () => void choosePhoto('camera') },
      { text: 'Escolher da galeria', onPress: () => void choosePhoto('library') },
      ...(me?.avatar_path || avatar.kind === 'new'
        ? [
            {
              text: 'Remover foto',
              style: 'destructive' as const,
              onPress: () => setAvatar({ kind: 'remove' }),
            },
          ]
        : []),
      { text: 'Cancelar', style: 'cancel' },
    ]);

  const save = async () => {
    if (usernameError || nameError) {
      setShowErrors(true);
      return;
    }
    const input: SocialProfileInput = {
      username: username.trim(),
      display_name: displayName.trim(),
      bio: bio.trim() || null,
      is_private: isPrivate,
      share_training: shareTraining,
      share_diet: shareDiet,
      share_body: shareBody,
    };
    setBusy(true);
    try {
      let profile = me ? await api.updateMyProfile(input) : await api.createMyProfile(input);
      const oldAvatar = me?.avatar_path ?? null;
      if (avatar.kind === 'new') {
        const photo = await compressPhoto(avatar.photo, AVATAR_WIDTH);
        const path = avatarPath(profile.user_id, newId());
        await uploadJpeg(AVATARS, path, photo.uri);
        profile = await api.updateMyProfile({ avatar_path: path });
      } else if (avatar.kind === 'remove') {
        profile = await api.updateMyProfile({ avatar_path: null });
      }
      if (avatar.kind !== 'keep' && oldAvatar)
        await api.removeAvatarFile(oldAvatar).catch(() => {});

      const shareChanged =
        !me ||
        me.share_training !== shareTraining ||
        me.share_diet !== shareDiet ||
        me.share_body !== shareBody;
      if (shareChanged) await republishToday(profile).catch(() => {});

      queryClient.setQueryData(socialKeys.me, profile);
      await refreshSocial();
      router.back();
    } catch (error) {
      Alert.alert('Não deu para salvar', String((error as Error).message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormScroll>
      <Stack.Screen options={{ title: me ? 'Editar perfil' : 'Criar perfil' }} />

      <Pressable
        onPress={changePhoto}
        accessibilityRole="button"
        accessibilityLabel="Trocar foto do perfil"
        className="items-center gap-2 active:opacity-70"
      >
        <Avatar
          path={avatar.kind === 'keep' ? (me?.avatar_path ?? null) : null}
          localUri={avatar.kind === 'new' ? avatar.photo.uri : null}
          name={displayName || '?'}
          size={96}
        />
        <Text className="text-base font-semibold text-primary">
          {avatar.kind === 'new' || me?.avatar_path ? 'Trocar foto' : 'Escolher foto'}
        </Text>
      </Pressable>

      <TextField
        label="Nome"
        value={displayName}
        onChangeText={setDisplayName}
        maxLength={40}
        error={showErrors ? nameError : undefined}
      />
      <TextField
        label="@usuário"
        value={username}
        onChangeText={(text) => setUsername(cleanUsername(text))}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={20}
        error={showErrors ? usernameError : undefined}
        hint="Como as pessoas te acham. Letras minúsculas, números, ponto e _."
      />
      <TextField
        label="Bio"
        value={bio}
        onChangeText={setBio}
        multiline
        maxLength={150}
        placeholder="Ex.: Hipertrofia, 4x por semana + futebol"
      />

      <ToggleField
        label="Perfil privado"
        hint={
          isPrivate
            ? 'Só quem você aprovar vê seus posts e o seu dia.'
            : 'Qualquer pessoa no app vê seus posts e o seu dia.'
        }
        value={isPrivate}
        onChange={setIsPrivate}
      />

      <View className="gap-2">
        <Text className="text-sm font-semibold uppercase tracking-wider text-fg-muted">
          O seu dia no perfil
        </Text>
        <ToggleField
          label="Treino"
          hint="Treinos do dia: nome, duração, séries e volume."
          value={shareTraining}
          onChange={setShareTraining}
        />
        <ToggleField
          label="Dieta"
          hint="Calorias e macros contra a meta, refeições e água."
          value={shareDiet}
          onChange={setShareDiet}
        />
        <ToggleField
          label="Peso"
          hint="O peso de tendência. Fica desligado se você não quiser mostrar."
          value={shareBody}
          onChange={setShareBody}
        />
      </View>

      {busy ? (
        <View className="flex-row items-center justify-center gap-3 py-3.5">
          <ActivityIndicator color={palette.dark.primary} />
          <Text className="text-base text-fg">Salvando…</Text>
        </View>
      ) : (
        <Button label={me ? 'Salvar' : 'Criar perfil'} onPress={() => void save()} />
      )}
    </FormScroll>
  );
}
