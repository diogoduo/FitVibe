/**
 * Repetições na reserva (RIR) de uma série válida. Falha = tentou a próxima e ela não saiu;
 * RIR 0 = não sobrava nenhuma, mas a pessoa parou sem tentar. Para o e1RM os dois contam igual
 * (nada na reserva). null = não informado.
 */
export const RIR_FAILURE = -1;

/** Ciclo do botão de RIR na série. */
export const RIR_CYCLE = [RIR_FAILURE, 0, 1, 2, 3, 4];

export const isFailure = (rir: number | null) => rir != null && rir <= RIR_FAILURE;

export function rirLabel(rir: number | null) {
  if (rir == null) return 'RIR —';
  return isFailure(rir) ? 'Falha' : `RIR ${rir}`;
}
