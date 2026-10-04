import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { HeaderButton } from '@/components/ui/header-button';
import { Screen } from '@/components/ui/screen';
import { MeasurementsCard } from '@/features/measurements/measurements-card';
import { DietCard } from '@/features/progress/diet-card';
import { MeasurementChartCard } from '@/features/progress/measurement-chart-card';
import { StrengthCard } from '@/features/progress/strength-card';
import { VolumeCard } from '@/features/progress/volume-card';
import { WeightChartCard } from '@/features/progress/weight-chart-card';
import { DaySummary } from '@/features/social/day-summary';
import { PostCard } from '@/features/social/post-card';
import { ProfileHeader } from '@/features/social/profile-header';
import { useFollowRequests, useProfileView, useUserPosts } from '@/features/social/queries';
import { SocialGate } from '@/features/social/social-gate';
import type { SocialProfile } from '@/features/social/types';
import { useTodaySnapshot } from '@/features/social/use-today-snapshot';
import { WeightHistoryCard } from '@/features/weight/weight-history-card';

type Section = 'hoje' | 'posts' | 'progresso';

const SECTIONS: { value: Section; label: string }[] = [
  { value: 'hoje', label: 'Hoje' },
  { value: 'posts', label: 'Posts' },
  { value: 'progresso', label: 'Progresso' },
];

/** Aba Perfil: o meu perfil público (Hoje e Posts), o Progresso e o ⚙️ dos Ajustes. */
export default function MyProfileScreen() {
  const [section, setSection] = useState<Section>('hoje');

  return (
    <Screen
      title="Perfil"
      action={<HeaderButton icon="⚙️" label="Ajustes" onPress={() => router.push('/ajustes')} />}
    >
      {/* Sem conta ou sem perfil social, o Progresso aparece direto embaixo do aviso. */}
      <SocialGate
        wrap={(content) => (
          <>
            {content}
            <Progress />
          </>
        )}
      >
        {(me) => (
          <>
            <MyHeader me={me} />
            <ChoiceChips options={SECTIONS} value={section} onChange={setSection} />
            {section === 'hoje' ? <MyDay me={me} /> : null}
            {section === 'posts' ? <MyPosts me={me} /> : null}
            {section === 'progresso' ? <Progress /> : null}
          </>
        )}
      </SocialGate>
    </Screen>
  );
}

function MyHeader({ me }: { me: SocialProfile }) {
  const { data: view } = useProfileView(me.username);
  const requests = useFollowRequests();
  const pending = requests.data?.length ?? 0;

  return (
    <View className="gap-4">
      {view ? (
        <ProfileHeader
          view={view}
          actions={
            <>
              <Button
                label="Editar perfil"
                variant="secondary"
                onPress={() => router.push('/editar-perfil')}
                grow
              />
              <Button
                label="Buscar pessoas"
                variant="secondary"
                onPress={() => router.push('/buscar')}
                grow
              />
            </>
          }
        />
      ) : (
        <Spinner />
      )}
      {pending > 0 ? (
        <Pressable
          onPress={() => router.push('/solicitacoes')}
          accessibilityRole="button"
          className="flex-row items-center justify-between rounded-2xl border border-primary bg-primary/15 px-4 py-3 active:opacity-70"
        >
          <Text className="text-base font-semibold text-primary">
            {pending === 1 ? '1 pedido para seguir você' : `${pending} pedidos para seguir você`}
          </Text>
          <Text className="text-lg text-primary">›</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function MyDay({ me }: { me: SocialProfile }) {
  const snapshot = useTodaySnapshot(me.share_training, me.share_diet, me.share_body);
  const nothingShared = !me.share_training && !me.share_diet && !me.share_body;
  return (
    <Card title="Seu dia hoje">
      {nothingShared ? (
        <Text className="text-base leading-6 text-fg-muted">
          Você não compartilha nada do seu dia no perfil. Ligue em Editar perfil.
        </Text>
      ) : (
        <DaySummary snapshot={snapshot} />
      )}
      <Text className="text-sm leading-5 text-fg-muted">
        {me.is_private
          ? 'Só quem você aprovou vê isto no seu perfil.'
          : 'Seu perfil é público: qualquer pessoa no app vê isto.'}
      </Text>
      <Button
        label="Postar meu dia"
        variant="secondary"
        onPress={() => router.push({ pathname: '/novo-post', params: { tipo: 'day' } })}
      />
    </Card>
  );
}

function MyPosts({ me }: { me: SocialProfile }) {
  const posts = useUserPosts(me.user_id);
  const list = posts.data?.pages.flat() ?? [];
  if (posts.isLoading) return <Spinner />;
  if (list.length === 0) {
    return (
      <Card>
        <Text className="text-base leading-6 text-fg-muted">Você ainda não postou nada.</Text>
        <Button label="Novo post" onPress={() => router.push('/novo-post')} />
      </Card>
    );
  }
  return (
    <>
      {list.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      {posts.hasNextPage ? (
        <Button
          label={posts.isFetchingNextPage ? 'Carregando…' : 'Ver mais'}
          variant="secondary"
          disabled={posts.isFetchingNextPage}
          onPress={() => void posts.fetchNextPage()}
        />
      ) : null}
    </>
  );
}

/** Progresso: peso, força, volume por músculo, dieta e medidas, com gráficos. */
function Progress() {
  return (
    <>
      <WeightChartCard />
      <WeightHistoryCard />
      <StrengthCard />
      <VolumeCard />
      <DietCard />
      <MeasurementChartCard />
      <MeasurementsCard />
    </>
  );
}
