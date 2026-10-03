import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from '@/sync/supabase';

import { SocialError } from './api';

/** Foto escolhida ou já comprimida (uri local + tamanho em pixels). */
export type LocalPhoto = { uri: string; width: number; height: number };

/** Largura máxima: post 1080 px (como o Instagram), foto de perfil 400 px. JPEG a 70%. */
export const POST_PHOTO_WIDTH = 1080;
export const AVATAR_WIDTH = 400;
const JPEG_QUALITY = 0.7;

export async function pickPhoto(
  source: 'camera' | 'library',
  { square = false }: { square?: boolean } = {},
): Promise<LocalPhoto | null> {
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 1,
    allowsEditing: square,
    aspect: square ? [1, 1] : undefined,
  };
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      throw new SocialError('Sem permissão para a câmera. Libere nos Ajustes do iPhone.');
    }
  }
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled) return null;
  const asset = result.assets[0];
  return { uri: asset.uri, width: asset.width, height: asset.height };
}

/** Reduz para no máximo `maxWidth` e salva em JPEG (uma foto de 4 MB vira uns 200 KB). */
export async function compressPhoto(photo: LocalPhoto, maxWidth: number): Promise<LocalPhoto> {
  const context = ImageManipulator.manipulate(photo.uri);
  if (photo.width > maxWidth) context.resize({ width: maxWidth, height: null });
  const image = await context.renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY });
  return { uri: result.uri, width: result.width, height: result.height };
}

/** Envia um JPEG do celular para o Storage (repetir com o mesmo caminho substitui). */
export async function uploadJpeg(bucket: string, path: string, uri: string) {
  if (!supabase) throw new SocialError('Servidor não configurado.');
  // ArrayBuffer, como na documentação do Supabase para React Native.
  const body = await new File(uri).arrayBuffer();
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, body, { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;
}
