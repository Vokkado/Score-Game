/**
 * Curación del pool de productos para el minijuego del stand.
 *
 * Uso:
 *   PGURL=... node scripts/curate-products.js
 *
 * Solo lee. Escribe:
 *   data/_raw_pool.json   → todo el pool limpio, con métricas de interés
 *   data/candidates.json  → los 100 seleccionados, listos para revisar
 *
 * Las tres capas de filtrado (ver plan):
 *   1. Calidad de datos  → SQL, duro. Descarta lo que no se puede defender.
 *   2. Interés           → métrica calculada acá.
 *   3. Reconocimiento    → whitelist de marcas, revisión humana después.
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const DATA_DIR = path.join(__dirname, '..', 'data');
const TARGET = 100;

// ─── Capa 3: marcas ──────────────────────────────────────────────────────────

/** No son marcas: son parseos fallidos del ingest. */
const BRAND_BLACKLIST = new Set(['otras marcas', 'uruguay', 'varios', 'sin marca']);

/**
 * Categorías de alimento base, donde la marca NOVA 4 es dudosa.
 *
 * Caso verificado: "Aceite De Soja Condesa" (score 12). El grueso de su castigo
 * está justificado —lleva terbutilhidroquinona (INS 319), toxicidad HIGH— pero
 * los -20 por ultra-procesado no: por NOVA un aceite refinado es ingrediente
 * culinario procesado (grupo 2), no ultra-procesado (grupo 4). Se excluyen del
 * pool porque esos 20 puntos son los que no se pueden defender en el stand.
 */
const SIMPLE_FOOD_CATS = new Set([
  'Conservas', 'Salsas', 'Legumbres secas', 'Encurtidos', 'Frutos Secos',
  'Harina y Polenta', 'Arroz', 'Maní', 'Aceites y Vinagres', 'Yerbas', 'Aguas',
]);

// ─── Capa 2: qué hace interesante a un producto ──────────────────────────────

/**
 * Categorías de "percepción engañosa": el público asume que son sanas.
 * Cuando uno de estos puntúa bajo, es la mejor pregunta posible para el juego.
 */
const HEALTH_HALO_CATS = new Set([
  'Jugos',
  'Aguas Saborizadas',
  'Leches y Yogures',
  'Cereales',
  'Galletitas Saladas',
  'Snacks saludables',
  'Energizantes',
  'Barras de Cereal',
]);

/** Palabras del rótulo que prometen salud. Mismo efecto que las categorías. */
const HEALTH_HALO_WORDS = [
  'light', 'integral', 'sin azúcar', 'sin azucar', 'zero', 'cero', 'diet',
  'natural', 'fit', 'proteic', 'protein', 'avena', 'granola', 'cereal',
  'multicereal', 'salvado', 'fibra', 'vital', 'life', 'bio', 'orgánic',
  'organic', 'descremad', 'deslactosad', '0%', 'sin tacc',
];

const norm = (s) => (s || '').toLowerCase();

/**
 * Clave de "producto base": ignora formato y envase para detectar el mismo
 * producto repetido. Sin esto entran pares como "Jugo Dairyco Naranja Light
 * 500 Ml" y "... Bidón 3 L", que en el juego se sienten como una repetición.
 */
function baseKey(p) {
  return norm(p.name)
    .replace(/[0-9]+([.,][0-9]+)?\s*(g|kg|ml|l|u|gr|cc)\b/g, '')
    .replace(/pack|bidon|bidón|bolsa|caja|pote|lata|bot|tetra|sobre|tripack/g, '')
    .replace(/[^a-záéíóúñ ]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .sort() // el orden de palabras varía entre cargas: "Jugo Dairyco Naranja"
    .slice(0, 4) // y "Jugo Naranja Dairyco" son el mismo producto
    .join(' ');
}

// ─── Cuotas del pool de 100 ──────────────────────────────────────────────────

const QUOTAS = [
  { key: 'sorpresa',    n: 22, label: 'Sorpresa (outlier de su categoría)' },
  { key: 'trampa',      n: 22, label: 'Trampa saludable (parece sano, puntúa bajo)' },
  { key: 'ancla_buena', n: 14, label: 'Ancla obvia buena' },
  { key: 'ancla_mala',  n: 16, label: 'Ancla obvia mala' },
  { key: 'medio',       n: 12, label: 'Rango medio (desempata el podio)' },
];

/**
 * Productos que tienen que estar sí o sí, sin importar cómo puntúen en la
 * métrica de interés. Son los que todo el mundo reconoce de la góndola: sin
 * ellos el juego se siente ajeno.
 *
 * Se reservan ANTES de las cuotas y consumen lugar del total de 100.
 */
const MUST_INCLUDE = [
  {
    key: 'agua_100',
    n: 2,
    label: 'Agua mineral (el 100 de la escala)',
    match: (p) => p.category === 'Aguas' && p.score >= 95,
  },
  {
    key: 'refresco_azucarado',
    n: 4,
    label: 'Refresco azucarado de marca grande',
    match: (p) =>
      /coca[- ]?cola|pepsi|sprite|fanta|seven up|mirinda|paso de los toros/i.test(p.name) &&
      p.score <= 32 &&
      !/light|zero|cero|sin azucar|sin azúcar/i.test(p.name),
    // Sin esto gana Fanta (16) por estar más lejos de 50, y Coca-Cola —la marca
    // que todo el mundo reconoce— se queda afuera.
    priority: ['coca cola', 'pepsi', 'sprite', 'fanta', 'seven up', 'mirinda'],
  },
  {
    key: 'natural_100',
    n: 3,
    label: 'Legumbre / verdura casi perfecta',
    match: (p) =>
      ['Legumbres secas', 'Congelados', 'Conservas'].includes(p.category) && p.score >= 87,
  },
  {
    key: 'alfajor',
    n: 3,
    label: 'Alfajor',
    match: (p) => /alfajor/i.test(p.name),
  },
  {
    key: 'gomitas',
    n: 3,
    label: 'Gomitas / caramelos de goma',
    match: (p) => /gomit|gomas |goma de|^goma /i.test(p.name),
  },
];

/** Topes para que una partida no repita marca ni categoría. */
const MAX_PER_BRAND = 3;
const MAX_PER_CATEGORY = 6;

// ─── Capa 1: calidad de datos ────────────────────────────────────────────────

const SQL = `
  SELECT
    p.id,
    p.name,
    p.brand,
    p.barcode,
    p.score,
    p.image,
    p.is_ultra_processed,
    p.is_sugar_alert,
    p.is_sodium_alert,
    p.is_fat_alert,
    p.is_saturated_fat_alert,
    p.serving_size_amount,
    p.serving_size_unit,
    p.highlights,
    p.score_calculated_at,
    c.name AS category,
    avg(p.score) OVER (PARTITION BY p.category_id) AS category_avg
  FROM products p
  JOIN product_categories c ON c.id = p.category_id
  WHERE p.score IS NOT NULL
    AND p.image IS NOT NULL
    AND p.is_inspected
    AND length(p.name) <= 60
    AND (p.alcohol_graduation IS NULL OR p.alcohol_graduation < 0.5)
    -- El agua no declara nutrientes porque no tiene: exigirle tabla nutricional
    -- la dejaba fuera del pool, y es justo el ancla del 100 en la escala.
    AND (
      c.name = 'Aguas'
      OR (
        p.serving_size_amount IS NOT NULL
        AND jsonb_array_length(p.nutrition_facts->'nutritionFacts') >= 4
        AND p.highlights IS NOT NULL
      )
    )
`;

/**
 * Productos con alcohol: el motor les da score NULL a propósito (no existe un
 * nivel de consumo libre de riesgo — posición de la OMS), así que no se pueden
 * adivinar. En el juego van como comodín: producto extra, no suma ni resta
 * puntos, y sirve para explicar por qué Vokkado no puntúa alcohol.
 */
const SQL_WILDCARDS = `
  SELECT p.id, p.name, p.brand, p.image, p.alcohol_graduation, c.name AS category
  FROM products p
  LEFT JOIN product_categories c ON c.id = p.category_id
  WHERE p.alcohol_graduation >= 0.5
    AND p.image IS NOT NULL
    AND p.is_inspected
  ORDER BY p.alcohol_graduation
`;

// ─── Clasificación ───────────────────────────────────────────────────────────

function classify(p) {
  const name = norm(p.name);
  const halo =
    HEALTH_HALO_CATS.has(p.category) ||
    HEALTH_HALO_WORDS.some((w) => name.includes(w));

  const deviation = Math.abs(p.score - Number(p.category_avg));

  // Orden de prioridad: un producto cae en la primera cuota que le aplica.
  // "trampa" gana sobre "sorpresa" porque es la pregunta más jugosa del juego.
  let bucket;
  if (halo && p.score < 50) bucket = 'trampa';
  else if (deviation >= 20) bucket = 'sorpresa';
  else if (p.score >= 75) bucket = 'ancla_buena';
  else if (p.score <= 20) bucket = 'ancla_mala';
  else bucket = 'medio';

  // Interés: cuánto sorprende + cuánto engaña el rótulo + cuánto se aleja del
  // centro de la escala (un 50 no le enseña nada a nadie).
  const interest =
    deviation * 1.0 +
    (halo && p.score < 50 ? 25 : 0) +
    Math.abs(p.score - 50) * 0.3;

  const h = p.highlights || {};
  return {
    ...p,
    category_avg: Math.round(Number(p.category_avg)),
    deviation: Math.round(deviation),
    halo,
    bucket,
    interest: Math.round(interest * 10) / 10,
    excesses: (h.excesses || []).map((e) => `${e.name} ${e.valuePer100}${e.unit}`),
    beneficials: (h.beneficials || []).map((b) => `${b.name} ${b.valuePer100}${b.unit}`),
  };
}

// ─── Selección con cuotas y topes ────────────────────────────────────────────

function select(pool) {
  const byBrand = new Map();
  const byCategory = new Map();
  const chosen = [];

  const fits = (p) => {
    const b = norm(p.brand);
    return (
      (byBrand.get(b) || 0) < MAX_PER_BRAND &&
      (byCategory.get(p.category) || 0) < MAX_PER_CATEGORY
    );
  };

  const take = (p, quota) => {
    const b = norm(p.brand);
    byBrand.set(b, (byBrand.get(b) || 0) + 1);
    byCategory.set(p.category, (byCategory.get(p.category) || 0) + 1);
    chosen.push({ ...p, quota });
  };

  // Pasada 0: los imprescindibles. Van primero y sin mirar la métrica de
  // interés: son productos que el público espera ver. El tope por marca no
  // aplica acá (hay 6 Coca-Cola en la base y todas son la misma marca).
  const usedIds = new Set();
  for (const must of MUST_INCLUDE) {
    const rank = (p) => {
      if (!must.priority) return 0;
      const i = must.priority.findIndex((b) => norm(p.brand).includes(b) || norm(p.name).includes(b));
      return i === -1 ? must.priority.length : i;
    };
    const candidates = pool
      .filter((p) => !usedIds.has(p.id) && must.match(p))
      .sort((a, b) => rank(a) - rank(b) || Math.abs(b.score - 50) - Math.abs(a.score - 50));

    let taken = 0;
    const seenBrand = new Set();
    for (const p of candidates) {
      if (taken >= must.n) break;
      // Una marca por slot: evita 2 Fanta o 2 Milka ocupando los lugares
      // de productos que el público reconocería igual de bien.
      if (seenBrand.has(norm(p.brand))) continue;
      seenBrand.add(norm(p.brand));
      usedIds.add(p.id);
      byCategory.set(p.category, (byCategory.get(p.category) || 0) + 1);
      chosen.push({ ...p, quota: must.key });
      taken++;
    }
    if (taken < must.n) {
      console.warn(`  ⚠ imprescindible "${must.key}": ${taken}/${must.n} disponibles`);
    }
  }
  console.log(`Imprescindibles reservados: ${chosen.length}`);

  // Primera pasada: llenar cada cuota con lo más interesante que respete topes.
  for (const quota of QUOTAS) {
    const candidates = pool
      .filter((p) => p.bucket === quota.key && !usedIds.has(p.id))
      .sort((a, b) => b.interest - a.interest);

    let taken = 0;
    for (const p of candidates) {
      if (taken >= quota.n) break;
      if (!fits(p)) continue;
      take(p, quota.key);
      usedIds.add(p.id);
      taken++;
    }
    if (taken < quota.n) {
      console.warn(`  ⚠ cuota "${quota.key}": ${taken}/${quota.n} (pool insuficiente o topes)`);
    }
  }

  // Segunda pasada: si quedaron huecos, completar con lo mejor que quede.
  if (chosen.length < TARGET) {
    const rest = pool
      .filter((p) => !usedIds.has(p.id))
      .sort((a, b) => b.interest - a.interest);
    for (const p of rest) {
      if (chosen.length >= TARGET) break;
      if (!fits(p)) continue;
      take(p, 'relleno');
      usedIds.add(p.id);
    }
  }

  return chosen;
}

// ─── Main ────────────────────────────────────────────────────────────────────

(async () => {
  const url = process.env.PGURL;
  if (!url) {
    console.error('Falta PGURL');
    process.exit(1);
  }

  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  await client.query('SET default_transaction_read_only = on');
  const { rows } = await client.query(SQL);
  const { rows: wildcardRows } = await client.query(SQL_WILDCARDS);
  await client.end();

  console.log(`Pool tras filtros de calidad: ${rows.length}`);

  let pool = rows.filter((p) => p.brand && !BRAND_BLACKLIST.has(norm(p.brand)));
  console.log(`Pool tras descartar marcas inválidas: ${pool.length}`);

  // Ultra-procesado mal asignado en alimentos simples → -20 indefendibles.
  const beforeUP = pool.length;
  pool = pool.filter((p) => !(p.is_ultra_processed && SIMPLE_FOOD_CATS.has(p.category)));
  console.log(`Pool tras descartar ultra-procesado mal clasificado: ${pool.length} (-${beforeUP - pool.length})`);

  // Un solo formato por producto base: se queda el de score más extremo, que
  // es el que mejor juega.
  const seen = new Map();
  for (const p of pool) {
    const k = baseKey(p);
    const prev = seen.get(k);
    if (!prev || Math.abs(p.score - 50) > Math.abs(prev.score - 50)) seen.set(k, p);
  }
  const beforeDedupe = pool.length;
  pool = [...seen.values()].map(classify);
  console.log(`Pool tras deduplicar por producto base: ${pool.length} (-${beforeDedupe - pool.length})`);

  const counts = {};
  for (const p of pool) counts[p.bucket] = (counts[p.bucket] || 0) + 1;
  console.log('Disponible por cuota:', counts);

  const chosen = select(pool);
  console.log(`\nSeleccionados: ${chosen.length}`);

  // Comodines: productos con alcohol. No tienen puntaje que adivinar.
  const wildcards = wildcardRows.map((w) => ({
    ...w,
    alcohol_graduation: Number(w.alcohol_graduation),
    isWildcard: true,
    score: null,
    explanation:
      'Vokkado no le pone puntaje a las bebidas con alcohol. No existe un nivel ' +
      'de consumo de alcohol libre de riesgo (posición de la OMS), así que ' +
      'puntuarlas en una escala de "más o menos saludable" sería engañoso.',
  }));

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(path.join(DATA_DIR, '_raw_pool.json'), JSON.stringify(pool, null, 2));
  fs.writeFileSync(path.join(DATA_DIR, 'candidates.json'), JSON.stringify(chosen, null, 2));
  fs.writeFileSync(path.join(DATA_DIR, 'wildcards.json'), JSON.stringify(wildcards, null, 2));
  console.log(`Comodines (alcohol, sin puntaje): ${wildcards.length}`);

  const finalCounts = {};
  for (const p of chosen) finalCounts[p.quota] = (finalCounts[p.quota] || 0) + 1;
  console.log('Composición final:', finalCounts);
  console.log(`\n→ data/candidates.json (${chosen.length})`);
  console.log(`→ data/_raw_pool.json (${pool.length})`);
})().catch((e) => {
  console.error('ERROR', e.message);
  process.exit(1);
});
