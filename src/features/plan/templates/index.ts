import { AVANCADO_4X } from './avancado-4x';
import { INICIANTE_3X } from './iniciante-3x';
import type { PlanTemplate } from './template';

export { createPlanFromTemplate } from './template';
export { AVANCADO_4X, INICIANTE_3X };

/** Planos prontos oferecidos na aba Treino quando ainda não há plano. */
export const PLAN_TEMPLATES: PlanTemplate[] = [AVANCADO_4X, INICIANTE_3X];
