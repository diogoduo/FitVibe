import { Directory, File, Paths } from 'expo-file-system';

/** Fotos de progresso em <documentos>/progresso (o banco guarda só o nome do arquivo). */
const directory = () => new Directory(Paths.document, 'progresso');

export const progressPhotoUri = (fileName: string) => new File(directory(), fileName).uri;

/** Move a foto (já comprimida) para a pasta das fotos de progresso. */
export function storeProgressPhoto(uri: string, fileName: string) {
  const folder = directory();
  folder.create({ idempotent: true, intermediates: true });
  new File(uri).move(new File(folder, fileName), { overwrite: true });
}

export function deleteProgressPhotoFile(fileName: string) {
  const file = new File(directory(), fileName);
  if (file.exists) file.delete();
}

/** "Apagar todos os dados": a pasta inteira. */
export function deleteAllProgressPhotos() {
  const folder = directory();
  if (folder.exists) folder.delete();
}
