import { useSyncExternalStore } from 'react';

import { db } from '@/db/client';
import { foods, type FoodKey } from '@/db/schema';

import { resolveFood } from '../foods/food';
import type { Draft, DraftItem } from './draft';

/**
 * O rascunho da conversa com o assistente, fora da tela: o leitor de código de barras, o
 * cadastro de alimento e a busca devolvem a escolha para cá (`pickFood`) e a tela de
 * conferência atualiza sozinha.
 */
let draft: Draft | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useAssistantDraft = () => useSyncExternalStore(subscribe, () => draft);
export const getAssistantDraft = () => draft;

export function setAssistantDraft(next: Draft | null) {
  draft = next;
  emit();
}

export function updateDraftItem(id: string, patch: (item: DraftItem) => DraftItem) {
  if (!draft) return;
  setAssistantDraft({
    ...draft,
    items: draft.items.map((item) => (item.id === id ? patch(item) : item)),
  });
}

export function removeDraftItem(id: string) {
  if (!draft) return;
  setAssistantDraft({ ...draft, items: draft.items.filter((item) => item.id !== id) });
}

/** A pessoa escolheu (ou cadastrou) o alimento de um item: some a dúvida. */
export function pickFood(itemId: string, key: FoodKey) {
  const food = resolveFood(key, db.select().from(foods).all());
  if (!food) return;
  updateDraftItem(itemId, (item) =>
    item.kind === 'food'
      ? {
          ...item,
          food,
          options: item.options.filter((option) => option.key !== key),
          question: null,
        }
      : item,
  );
}
