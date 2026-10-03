/**
 * Gera src/features/foods/taco/taco.json a partir da TACO (4ª edição, NEPA/UNICAMP),
 * processada em CSV pelo projeto brolesi/taco (fixado num commit para o resultado não mudar).
 * Guarda só o que o app usa, por 100 g: kcal, proteína, carboidrato, gordura e fibra.
 *
 * Rodar de novo só para trocar a versão: node scripts/build-taco.mjs
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const COMMIT = '4b8a38496c4e9a7bfab96c1ed526b6380fec41e7';
const SOURCE = `https://raw.githubusercontent.com/brolesi/taco/${COMMIT}/data/processed/taco/taco_composicao.csv`;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'src', 'features', 'foods', 'taco', 'taco.json');

/** CSV com campos entre aspas que podem ter vírgula. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += char;
  }
  if (field || row.length) rows.push([...row, field]);
  return rows.filter((r) => r.length > 1);
}

// Vazio = não analisado (conta como 0 no app); 1e-05 = traço (também 0).
const number = (text) => {
  const value = Number(text);
  if (!text || !Number.isFinite(value) || value < 0.001) return 0;
  return Math.round(value * 10) / 10;
};

const response = await fetch(SOURCE);
if (!response.ok) throw new Error(`HTTP ${response.status}`);
const [header, ...rows] = parseCsv(await response.text());
const col = (name) => {
  const index = header.indexOf(name);
  if (index < 0) throw new Error(`Coluna ausente: ${name}`);
  return index;
};
const c = {
  id: col('numero_alimento'),
  name: col('descricao'),
  kcal: col('energia_kcal'),
  protein: col('proteina_g'),
  carbs: col('carboidrato_g'),
  fat: col('lipideos_g'),
  fiber: col('fibra_g'),
  prep: col('preparo'),
  category: col('categoria'),
};

const foods = rows.map((row) => ({
  id: Number(row[c.id]),
  name: row[c.name].trim(),
  category: row[c.category].trim(),
  prep: row[c.prep].trim() || null,
  kcal: Math.round(Number(row[c.kcal]) || 0),
  protein: number(row[c.protein]),
  carbs: number(row[c.carbs]),
  fat: number(row[c.fat]),
  fiber: number(row[c.fiber]),
}));

await writeFile(OUT, `${JSON.stringify(foods, null, 0).replace(/\},\{/g, '},\n{')}\n`);
console.log(`${foods.length} alimentos → ${path.relative(root, OUT)}`);
