/**
 * Une las justificaciones escritas a mano con los productos, validando que cada
 * párrafo caiga en el producto correcto (el `match` tiene que estar en el nombre).
 *
 * Si la curación se regenera y cambia el orden, este script avisa en vez de
 * asignar párrafos al producto equivocado.
 *
 * Salida: data/products.json — el archivo que consume el juego.
 *
 * Uso:  node scripts/merge-justifications.js
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const candidates = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'candidates.json'), 'utf8'));
const breakdowns = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'breakdowns.json'), 'utf8'));
const justifications = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'justifications.json'), 'utf8'));

const byId = new Map(breakdowns.map((b) => [b.id, b]));
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const problems = [];
const out = candidates.map((c, i) => {
  const j = justifications[i];
  const b = byId.get(c.id);

  if (!j) {
    problems.push(`#${i + 1} ${c.name}: sin justificación`);
  } else if (!norm(c.name).includes(norm(j.match))) {
    problems.push(`#${i + 1} DESALINEADO: "${j.match}" no aparece en "${c.name}"`);
  }

  const d = (b && b.breakdown) || {};
  const h = (b && b.highlights) || { excesses: [], beneficials: [] };

  return {
    id: c.id,
    name: c.name,
    brand: c.brand,
    category: c.category,
    score: c.score,
    image: `${c.id}${path.extname(new URL(c.image).pathname) || '.jpg'}`,
    quota: c.quota,
    justification: j ? j.texto : null,
    // Desglose para la pantalla de resultado, ya con nombres legibles.
    breakdown: [
      { label: 'Calidad de los ingredientes', value: -d.penaltyIngredientes },
      { label: 'Ingredientes cuestionados', value: -d.penaltyToxicidad },
      { label: 'Alertas puntuales', value: -d.penaltyRedFlags },
      { label: 'Excesos', value: -d.nutritionNegativeImpact },
      { label: 'Aportes buenos', value: d.nutritionPositiveImpact },
      { label: 'Ultraprocesado', value: -d.penaltyUltraProcessed },
      { label: 'Calorías vacías', value: -d.penaltyPobrezaNutricional },
    ].filter((s) => s.value && Math.abs(s.value) >= 0.05)
      .map((s) => ({ ...s, value: Math.round(s.value * 10) / 10 })),
    excesses: h.excesses.map((e) => ({ name: e.name, value: e.valuePer100, unit: e.unit })),
    beneficials: h.beneficials.map((e) => ({ name: e.name, value: e.valuePer100, unit: e.unit })),
  };
});

if (problems.length) {
  console.error('PROBLEMAS:');
  problems.forEach((p) => console.error('  ' + p));
  process.exit(1);
}

fs.writeFileSync(path.join(DATA_DIR, 'products.json'), JSON.stringify(out, null, 2));

// Los comodines pasan por el mismo normalizado de `image`: la pantalla nunca
// debe construir la ruta a mano. Hoy los 11 son .jpg, pero el pool tiene .webp
// y .png, y una ruta hardcodeada se rompería recién en el stand.
const wildcards = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'wildcards.json'), 'utf8'));
const wildcardsOut = wildcards.map((w) => ({
  ...w,
  image: `${w.id}${path.extname(new URL(w.image).pathname) || '.jpg'}`,
}));

// Copias que sirve Vite desde public/. La fuente sigue siendo data/.
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
fs.mkdirSync(PUBLIC_DIR, { recursive: true });
fs.writeFileSync(path.join(PUBLIC_DIR, 'products.json'), JSON.stringify(out));
fs.writeFileSync(path.join(PUBLIC_DIR, 'wildcards.json'), JSON.stringify(wildcardsOut));

const sinJust = out.filter((p) => !p.justification).length;
console.log(`Productos: ${out.length}`);
console.log(`Con justificación: ${out.length - sinJust}`);
console.log(`Largo promedio del párrafo: ${Math.round(out.reduce((a, p) => a + (p.justification || '').length, 0) / out.length)} caracteres`);
console.log(`\n→ data/products.json`);
