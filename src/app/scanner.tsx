import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { lookupBarcode } from '@/features/foods/open-food-facts';
import { findFoodByBarcode, saveOffProduct } from '@/features/foods/repository';
import { rowKey } from '@/features/foods/food';
import { toInputText } from '@/lib/numbers';

type Params = { refeicao: string; dia: string };

/**
 * Lê o código de barras e acha o produto: primeiro no celular (já lido ou cadastrado antes),
 * depois no Open Food Facts. Sem resultado ou sem internet, abre o cadastro com o código.
 */
export default function ScannerScreen() {
  const { refeicao, dia } = useLocalSearchParams<Params>();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [status, setStatus] = useState<string | null>(null);
  const handled = useRef(false);

  const onScanned = async ({ data }: BarcodeScanningResult) => {
    if (handled.current) return;
    handled.current = true;
    const barcode = data.replace(/\D/g, '');

    const local = findFoodByBarcode(barcode);
    if (local) {
      router.replace({ pathname: '/alimento', params: { chave: rowKey(local.id), refeicao, dia } });
      return;
    }

    setStatus(`Procurando ${barcode}…`);
    const result = await lookupBarcode(barcode);
    if (result.status === 'found') {
      const chave = saveOffProduct(result.product);
      router.replace({ pathname: '/alimento', params: { chave, refeicao, dia } });
      return;
    }
    const prefill =
      result.status === 'incomplete'
        ? {
            nome: result.product.name,
            marca: result.product.brand ?? '',
            kcal: result.product.per100.kcal ? String(result.product.per100.kcal) : '',
            proteina: toInputText(result.product.per100.protein || null),
            carbo: toInputText(result.product.per100.carbs || null),
            gordura: toInputText(result.product.per100.fat || null),
            unidade: result.product.unit,
          }
        : {};
    router.replace({
      pathname: '/alimento-editar',
      params: {
        codigo: barcode,
        motivo: result.status === 'offline' ? 'offline' : result.status,
        refeicao,
        dia,
        ...prefill,
      },
    });
  };

  if (!permission) return <View className="flex-1 bg-black" />;

  if (!permission.granted) {
    return (
      <View className="flex-1 justify-center gap-4 bg-background px-6">
        <Stack.Screen options={{ title: 'Ler código' }} />
        <Text className="text-xl font-semibold text-fg">Precisa da câmera</Text>
        <Text className="text-base leading-6 text-fg-muted">
          A câmera é usada só para ler o código de barras do produto. Nada é gravado.
        </Text>
        {permission.canAskAgain ? (
          <Button label="Permitir câmera" onPress={requestPermission} />
        ) : (
          <Text className="text-base leading-6 text-fg-muted">
            Libere a câmera para o Expo Go nos Ajustes do iPhone e volte aqui.
          </Text>
        )}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <Stack.Screen options={{ title: 'Ler código' }} />
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
        onBarcodeScanned={status ? undefined : onScanned}
      />
      <View className="absolute inset-x-0 top-1/3 items-center" pointerEvents="none">
        <View className="h-40 w-72 rounded-2xl border-2 border-primary" />
      </View>
      <View
        className="absolute inset-x-0 bottom-0 items-center gap-3 bg-black/70 px-6 pt-4"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        {status ? (
          <View className="flex-row items-center gap-3">
            <Spinner />
            <Text className="text-base text-white">{status}</Text>
          </View>
        ) : (
          <Text className="text-center text-base text-white">
            Aponte para o código de barras da embalagem.
          </Text>
        )}
      </View>
    </View>
  );
}
