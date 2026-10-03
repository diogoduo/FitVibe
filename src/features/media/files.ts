import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

import { newId } from '@/db/client';
import type { ExerciseMedia } from '@/db/schema';

import { addFileMedia, deleteMediaRecord } from './repository';

/**
 * Fotos e vídeos ficam em <documentos do app>/media. O banco guarda só o nome do arquivo:
 * o caminho absoluto da pasta muda quando o iOS atualiza o app.
 */
const mediaDirectory = () => new Directory(Paths.document, 'media');

export function mediaFileUri(fileName: string): string {
  return new File(mediaDirectory(), fileName).uri;
}

/**
 * O arquivo está neste celular? A conta sincroniza o registro da mídia, mas a foto ou o vídeo
 * fica só no celular onde foi adicionado.
 */
export function mediaFileExists(fileName: string): boolean {
  return new File(mediaDirectory(), fileName).exists;
}

function extensionOf(name: string | null | undefined) {
  const match = name ? /\.[a-z0-9]{2,5}$/i.exec(name) : null;
  return match ? match[0].toLowerCase() : null;
}

/**
 * Abre a galeria, copia o que foi escolhido para a pasta de mídias e registra no exercício.
 * Retorna quantos itens entraram (0 se a pessoa cancelou).
 */
export async function pickMediaFromLibrary(exerciseId: string): Promise<number> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images', 'videos'],
    allowsMultipleSelection: true,
    quality: 0.8,
  });
  if (result.canceled) return 0;

  const directory = mediaDirectory();
  directory.create({ idempotent: true, intermediates: true });
  let added = 0;
  for (const asset of result.assets) {
    const kind = asset.type === 'video' ? 'video' : 'image';
    const id = newId();
    const extension =
      extensionOf(asset.fileName) ?? extensionOf(asset.uri) ?? (kind === 'video' ? '.mp4' : '.jpg');
    const fileName = `${id}${extension}`;
    await new File(asset.uri).copy(new File(directory, fileName));
    addFileMedia(exerciseId, { id, kind, fileName });
    added += 1;
  }
  return added;
}

/** Apaga a pasta de mídias inteira ("Apagar todos os dados"). */
export function deleteAllMediaFiles() {
  const directory = mediaDirectory();
  if (directory.exists) directory.delete();
}

/** Tira a mídia do exercício e apaga o arquivo do celular. */
export function deleteMedia(media: ExerciseMedia) {
  deleteMediaRecord(media);
  if (media.fileName) {
    const file = new File(mediaDirectory(), media.fileName);
    if (file.exists) file.delete();
  }
}
