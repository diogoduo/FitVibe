import * as Haptics from 'expo-haptics';
import { usePathname } from 'expo-router';
import { useEffect } from 'react';

import { supabase } from '@/sync/supabase';

import { useMySocialProfile, refreshSocial } from '../social/queries';
import { getNotification } from './api';
import { notificationRoute, notificationText } from './describe';
import { showToast } from './toast';

/** Tela atual: na lista de notificações, a que chega só entra na lista (sem o aviso no topo). */
let currentPath = '';

async function announce(id: string) {
  // Curtidas, comentários e posts também mudam contagens no feed: recarrega o social.
  await refreshSocial();
  if (currentPath === '/notificacoes') return;
  try {
    const notification = await getNotification(id);
    if (!notification) return;
    showToast({
      id: notification.id,
      name: notification.display_name,
      avatarPath: notification.avatar_path,
      text: notificationText(notification),
      route: notificationRoute(notification),
    });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // Sem internet agora: o sininho mostra quando der.
  }
}

/**
 * Com o app aberto, escuta as notificações novas desta conta (Supabase Realtime, só as minhas
 * pelo RLS) e mostra o aviso no topo. Com o app fechado não chega nada (sem push no plano grátis).
 */
export function NotificationsProvider() {
  const pathname = usePathname();
  const { data: me } = useMySocialProfile();
  const userId = me?.user_id ?? null;

  useEffect(() => {
    currentPath = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!supabase || !userId) return;
    const client = supabase;
    const channel = client
      .channel(`notificacoes:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const id = (payload.new as { id?: string }).id;
          if (id) void announce(id);
        },
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [userId]);

  return null;
}
