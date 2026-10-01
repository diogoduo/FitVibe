/**
 * Baixa as fotos do catálogo de exercícios (free-exercise-db, domínio público/Unlicense),
 * reduz para WebP de 480 px e gera src/features/exercises/catalog/images.ts.
 *
 * Rodar de novo só ao mudar src/features/exercises/catalog/catalog.json:
 *   node scripts/build-exercise-images.mjs
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main';
const OUT_DIR = path.join(root, 'assets', 'exercises');
const CATALOG = path.join(root, 'src', 'features', 'exercises', 'catalog', 'catalog.json');
const IMAGES_TS = path.join(root, 'src', 'features', 'exercises', 'catalog', 'images.ts');
const WIDTH = 480;

const catalog = JSON.parse(await readFile(CATALOG, 'utf8'));
const dataset = await (await fetch(`${SOURCE}/dist/exercises.json`)).json();
const byId = new Map(dataset.map((exercise) => [exercise.id, exercise]));

await mkdir(OUT_DIR, { recursive: true });

const entries = [];
let bytes = 0;
for (const { key } of catalog) {
  const source = byId.get(key);
  if (!source) throw new Error(`Exercício não existe no free-exercise-db: ${key}`);
  const files = [];
  for (const [index, image] of source.images.slice(0, 2).entries()) {
    const response = await fetch(`${SOURCE}/exercises/${image}`);
    if (!response.ok) throw new Error(`${image}: HTTP ${response.status}`);
    const webp = await sharp(Buffer.from(await response.arrayBuffer()))
      .resize({ width: WIDTH, withoutEnlargement: true })
      .webp({ quality: 70 })
      .toBuffer();
    const name = `${key}-${index}.webp`;
    await writeFile(path.join(OUT_DIR, name), webp);
    bytes += webp.length;
    files.push(name);
  }
  entries.push([key, files]);
  process.stdout.write('.');
}

const lines = entries.map(
  ([key, files]) =>
    `  '${key}': [${files.map((file) => `require('../../../../assets/exercises/${file}')`).join(', ')}],`,
);
await writeFile(
  IMAGES_TS,
  [
    '// Gerado por scripts/build-exercise-images.mjs — não edite à mão.',
    '// Fotos: free-exercise-db (https://github.com/yuhonas/free-exercise-db), Unlicense.',
    '/* eslint-disable */',
    '',
    'export const CATALOG_IMAGES: Record<string, number[]> = {',
    ...lines,
    '};',
    '',
  ].join('\n'),
);

console.log(`\n${entries.length} exercícios, ${(bytes / 1024 / 1024).toFixed(1)} MB em WebP.`);
