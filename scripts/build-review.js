/**
 * Arma la tabla de revisión humana a partir de candidates.json + breakdowns.json.
 *
 * Salida: data/revision.csv — una fila por producto, con el desglose y una
 * columna de alertas para lo que hay que mirar con lupa antes del evento.
 *
 * Uso:  node scripts/build-review.js
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const candidates = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'candidates.json'), 'utf8'));
const breakdowns = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'breakdowns.json'), 'utf8'));
const byId = new Map(breakdowns.map((b) => [b.id, b]));

/** Alimentos de pocos ingredientes: la penalización por "pobreza" es discutible acá. */
const SIMPLE_CATS = new Set([
  'Conservas', 'Salsas', 'Legumbres secas', 'Encurtidos', 'Frutos Secos',
  'Harina y Polenta', 'Arroz', 'Maní', 'Aceites y Vinagres', 'Yerbas', 'Aguas', 'Pastas',
]);

function alerts(c, b) {
  const out = [];
  if (!b) return ['SIN_DESGLOSE'];
  const d = b.breakdown;

  if (b.delta !== 0 && b.delta !== null) out.push('SCORE_DESFASADO');

  const noHighlights =
    !b.highlights || (!b.highlights.excesses.length && !b.highlights.beneficials.length);
  if (noHighlights) out.push('SIN_NUTRIENTES_QUE_MOSTRAR');

  if (d.nutritionNegativeImpact > 0 && (!b.highlights || !b.highlights.excesses.length)) {
    out.push('PENALIZA_SIN_EXCESO_VISIBLE');
  }
  if (d.penaltyPobrezaNutricional >= 10 && SIMPLE_CATS.has(c.category)) {
    out.push('POBREZA_DISCUTIBLE');
  }
  if (d.penaltyAmortiguacion > 3) out.push('MUY_AMORTIGUADO');
  if (d.penaltyUltraProcessed > 0 && SIMPLE_CATS.has(c.category)) out.push('ULTRAPROC_DUDOSO');
  if (/\s{2,}/.test(c.name) || /[A-Z]{2,}[a-z]/.test(c.name)) out.push('NOMBRE_SUCIO');

  return out;
}

const esc = (v) => {
  const s = String(v ?? '');
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const products = fs.existsSync(path.join(DATA_DIR, 'products.json'))
  ? new Map(JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'products.json'), 'utf8')).map((p) => [p.id, p]))
  : new Map();

const HEADERS = [
  'ok', 'score', 'nombre', 'justificacion', 'marca', 'categoria', 'cuota', 'prom_categoria', 'desvio',
  'ingredientes', 'toxicidad', 'red_flags', 'nutri_negativo', 'nutri_positivo',
  'ultraprocesado', 'pobreza', 'amortiguacion',
  'excesos', 'beneficiosos', 'alertas', 'id',
];

const rows = candidates.map((c) => {
  const b = byId.get(c.id);
  const d = b ? b.breakdown : {};
  const h = (b && b.highlights) || { excesses: [], beneficials: [] };
  const fmt = (n) => (n === undefined ? '' : Number(n).toFixed(1));
  return [
    '', // columna "ok" para que la marques a mano
    c.score, c.name,
    (products.get(c.id) || {}).justification || '',
    c.brand, c.category, c.quota, c.category_avg, c.deviation,
    fmt(d.penaltyIngredientes), fmt(d.penaltyToxicidad), fmt(d.penaltyRedFlags),
    fmt(d.nutritionNegativeImpact), fmt(d.nutritionPositiveImpact),
    fmt(d.penaltyUltraProcessed), fmt(d.penaltyPobrezaNutricional), fmt(d.penaltyAmortiguacion),
    h.excesses.map((e) => `${e.name} ${e.valuePer100}${e.unit}`).join(' | '),
    h.beneficials.map((e) => `${e.name} ${e.valuePer100}${e.unit}`).join(' | '),
    alerts(c, b).join(' '),
    c.id,
  ].map(esc).join(';');
});

const csv = '﻿' + HEADERS.join(';') + '\n' + rows.join('\n') + '\n';
fs.writeFileSync(path.join(DATA_DIR, 'revision.csv'), csv, 'utf8');

// Resumen de alertas
const tally = {};
for (const c of candidates) {
  for (const a of alerts(c, byId.get(c.id))) tally[a] = (tally[a] || 0) + 1;
}
const limpios = candidates.filter((c) => alerts(c, byId.get(c.id)).length === 0).length;

console.log(`Filas: ${candidates.length}`);
console.log(`Sin ninguna alerta: ${limpios}`);
console.log('Alertas:', tally);
console.log(`\n→ data/revision.csv`);
