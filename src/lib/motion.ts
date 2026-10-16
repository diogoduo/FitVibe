import {
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutDown,
  FadeOutLeft,
  LinearTransition,
  ZoomIn,
} from 'react-native-reanimated';

/**
 * Movimento do app, no vocabulário da Apple (Designing Fluid Interfaces): toda animação é uma
 * mola, que parte do valor que está na tela e pode ser interrompida no meio.
 *
 * - `dampingRatio`: 1 = assenta sem passar do ponto; < 1 = quica.
 * - `duration`: a duração percebida (a "response" da Apple), em ms. Não é um tempo fixo.
 *
 * Sem quique por padrão; quique só onde houve um gesto com impulso ou uma comemoração.
 * O Reanimated respeita sozinho o "Reduzir movimento" do sistema (ReduceMotion.System).
 */
export const SPRING = { dampingRatio: 1, duration: 350 } as const;
/** Toque: o botão afunda e volta rápido, sem quicar. */
export const SPRING_PRESS = { dampingRatio: 1, duration: 200 } as const;
/** Valores que mudam com os dados (barras, anéis): um pouco mais lento, para ler a mudança. */
export const SPRING_VALUE = { dampingRatio: 1, duration: 600 } as const;
/** Depois de um gesto (duplo toque) ou numa comemoração: um quique leve. */
export const SPRING_BOUNCY = { dampingRatio: 0.8, duration: 400 } as const;

/*
 * Entradas e saídas (layout animations). São funções porque os construtores do Reanimated
 * guardam estado: `.delay()` num objeto compartilhado mudaria todos os usos.
 */

/** Aparece no lugar (opacidade). */
export const enterFade = () => FadeIn.springify(SPRING.duration).dampingRatio(1);
/** Sobe um pouco enquanto aparece (cartões, listas). */
export const enterUp = (delayMs = 0) =>
  FadeInDown.springify(SPRING.duration).dampingRatio(1).delay(delayMs);
/** Cresce a partir do centro, com o quique leve (comemoração, curtida). */
export const enterPop = () =>
  ZoomIn.springify(SPRING_BOUNCY.duration).dampingRatio(SPRING_BOUNCY.dampingRatio);
/** Cresce a partir do centro, sem quique (selos e avisos que só aparecem). */
export const enterGrow = () => ZoomIn.springify(SPRING.duration).dampingRatio(1);

/** Some no lugar. */
export const exitFade = () => FadeOut.springify(SPRING_PRESS.duration).dampingRatio(1);
/** Desce enquanto some (o caminho de volta de `enterUp` para o que fica embaixo da tela). */
export const exitDown = () => FadeOutDown.springify(SPRING_PRESS.duration).dampingRatio(1);
/** Sai pela esquerda: o mesmo caminho do deslizar para apagar. */
export const exitLeft = () => FadeOutLeft.springify(SPRING_PRESS.duration).dampingRatio(1);

/** Os vizinhos se reacomodam quando um item entra ou sai da lista. */
export const layoutSpring = () => LinearTransition.springify(SPRING.duration).dampingRatio(1);
