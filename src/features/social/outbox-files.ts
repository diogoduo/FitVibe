import { Directory, File, Paths } from 'expo-file-system';

import type { LocalPhoto } from './photos';

/** Fotos de posts esperando envio (o cache do sistema pode ser limpo a qualquer hora). */
const outboxDirectory = () => new Directory(Paths.document, 'outbox');

export const outboxPhotoUri = (name: string) => new File(outboxDirectory(), name).uri;

/** Guarda a foto já comprimida na pasta da fila. */
export function moveToOutbox(photo: LocalPhoto, name: string): LocalPhoto & { name: string } {
  const directory = outboxDirectory();
  directory.create({ idempotent: true, intermediates: true });
  const target = new File(directory, name);
  new File(photo.uri).move(target);
  return { ...photo, uri: target.uri, name };
}

export function deleteOutboxPhoto(name: string) {
  const file = new File(outboxDirectory(), name);
  if (file.exists) file.delete();
}

/** "Apagar todos os dados": some a pasta inteira. */
export function deleteAllOutboxPhotos() {
  const directory = outboxDirectory();
  if (directory.exists) directory.delete();
}
