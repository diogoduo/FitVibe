import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { AppState } from 'react-native';

/**
 * Cache dos dados que vêm do servidor (feed, perfis, comentários). Os dados pessoais continuam
 * no SQLite; aqui fica só o que é dos outros ou social. Recarrega ao voltar para o app e quando
 * a internet volta.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

focusManager.setEventListener((setFocused) => {
  const subscription = AppState.addEventListener('change', (state) =>
    setFocused(state === 'active'),
  );
  return () => subscription.remove();
});

onlineManager.setEventListener((setOnline) => {
  const subscription = Network.addNetworkStateListener((state) =>
    setOnline(state.isConnected !== false),
  );
  return () => subscription.remove();
});
