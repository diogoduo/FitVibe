import { router } from 'expo-router';
import { useRef, useState, type ComponentType } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import {
  ChartDemo,
  LikeDemo,
  RingsDemo,
  SetDemo,
  SettingsDemo,
  SwipeDemo,
} from '@/features/tutorial/demos';
import { markTutorialSeen } from '@/features/tutorial/seen';
import { haptics } from '@/lib/haptics';
import { useColors } from '@/theme/theme';

type Slide = { icon: IconName; kicker?: string; title: string; text: string; Demo: ComponentType };

const SLIDES: Slide[] = [
  {
    icon: 'sun',
    kicker: 'Bem-vindo ao FitVibe',
    title: 'Seu dia num olhar',
    text: "No Hoje, os anéis mostram calorias, proteína e água. Os atalhos registram um copo d'água, o peso, uma refeição ou abrem o treino.",
    Demo: RingsDemo,
  },
  {
    icon: 'dumbbell',
    title: 'Treino guiado',
    text: 'Seu plano da semana já sabe o que vem hoje. Cada série chega com a carga sugerida; marque ✓, o descanso conta sozinho e o app comemora os recordes.',
    Demo: SetDemo,
  },
  {
    icon: 'fork',
    title: 'Dieta sem esforço',
    text: 'Busque na tabela TACO ou leia o código de barras. Copie de ontem, salve refeições e deslize um alimento para tirá-lo.',
    Demo: SwipeDemo,
  },
  {
    icon: 'chart',
    title: 'Progresso de verdade',
    text: 'Em Perfil → Progresso: peso com tendência, força por exercício, volume por músculo, o seu gasto real e as fotos de antes e depois.',
    Demo: ChartDemo,
  },
  {
    icon: 'people',
    title: 'Treine junto',
    text: 'Crie seu @usuário, siga os amigos e poste refeições, treinos e o seu dia. Toque duas vezes numa foto para curtir.',
    Demo: LikeDemo,
  },
  {
    icon: 'gear',
    title: 'Do seu jeito',
    text: 'Lembretes de água e refeições, tema claro ou escuro, relatório em PDF e a sua conta: tudo no ⚙️ do Perfil.',
    Demo: SettingsDemo,
  },
];

/** Mini tutorial: 6 telas com uma demonstração animada cada. Aparece uma vez (e nos Ajustes). */
export default function TutorialScreen() {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const last = index === SLIDES.length - 1;

  const finish = () => {
    markTutorialSeen();
    haptics.success();
    router.back();
  };
  const goTo = (next: number) => {
    scroll.current?.scrollTo({ x: next * width, animated: true });
    setIndex(next);
  };

  return (
    <View
      className="flex-1 bg-background"
      style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }}
    >
      <View className="flex-row items-center justify-between px-5 py-2">
        <Text className="text-sm font-semibold text-fg-muted">
          {index + 1} de {SLIDES.length}
        </Text>
        <Pressable onPress={finish} accessibilityRole="button" hitSlop={10}>
          <Text className="text-base font-semibold text-primary">Pular</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scroll}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const next = Math.round(event.nativeEvent.contentOffset.x / width);
          if (next !== index) haptics.select();
          setIndex(next);
        }}
        className="flex-1"
      >
        {SLIDES.map((slide, slideIndex) => (
          <View key={slide.title} style={{ width }} className="justify-center gap-5 px-6">
            {/* Só a tela visível monta: as animações recomeçam ao chegar nela. */}
            {slideIndex === index ? <SlideContent slide={slide} /> : null}
          </View>
        ))}
      </ScrollView>

      <View className="flex-row justify-center gap-2 py-4">
        {SLIDES.map((slide, dot) => (
          <Pressable
            key={slide.title}
            onPress={() => goTo(dot)}
            accessibilityRole="button"
            accessibilityLabel={`Ir para ${slide.title}`}
            hitSlop={6}
          >
            <View
              className="h-2 rounded-full"
              style={{
                width: dot === index ? 24 : 8,
                backgroundColor: dot === index ? colors.primary : colors.line,
              }}
            />
          </Pressable>
        ))}
      </View>

      <View className="px-5">
        <Button
          label={last ? 'Começar' : 'Próximo'}
          icon={last ? 'check' : 'chevronRight'}
          onPress={last ? finish : () => goTo(index + 1)}
        />
      </View>
    </View>
  );
}

function SlideContent({ slide }: { slide: Slide }) {
  const colors = useColors();
  const { Demo } = slide;
  return (
    <>
      <Animated.View entering={ZoomIn.springify().damping(13)} style={{ alignItems: 'center' }}>
        <View
          className="h-20 w-20 items-center justify-center rounded-full"
          style={{ backgroundColor: `${colors.primary}26` }}
        >
          <Icon name={slide.icon} size={38} color={colors.primary} />
        </View>
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(120).duration(400)} style={{ gap: 8 }}>
        {slide.kicker ? (
          <Text className="text-center text-sm font-semibold uppercase tracking-wider text-primary">
            {slide.kicker}
          </Text>
        ) : null}
        <Text className="text-center text-3xl font-extrabold tracking-tight text-fg">
          {slide.title}
        </Text>
        <Text className="text-center text-base leading-6 text-fg-muted">{slide.text}</Text>
      </Animated.View>
      <Animated.View entering={FadeInUp.delay(260).duration(450)}>
        <Demo />
      </Animated.View>
    </>
  );
}
