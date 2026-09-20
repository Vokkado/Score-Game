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

// Correcciones a mano sobre la salida del motor. Ver data/score-overrides.json
// para el motivo de cada una. Las claves que empiezan con "_" son documentación.
const overrides = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'score-overrides.json'), 'utf8'));

const byId = new Map(breakdowns.map((b) => [b.id, b]));
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const problems = [];
const aplicados = [];
const out = candidates.map((c, i) => {
  const j = justifications[i];
  const b = byId.get(c.id);

  if (!j) {
    problems.push(`#${i + 1} ${c.name}: sin justificación`);
  } else if (!norm(c.name).includes(norm(j.match))) {
    problems.push(`#${i + 1} DESALINEADO: "${j.match}" no aparece en "${c.name}"`);
  }

  const o = overrides[c.id];
  // El override pisa los valores del motor ANTES de armar el desglose, así el
  // orden de los pasos y el redondeo salen del mismo código de siempre.
  const d = { ...((b && b.breakdown) || {}), ...((o && o.engine) || {}) };
  const h = (b && b.highlights) || { excesses: [], beneficials: [] };
  const score = o ? o.score : c.score;

  if (o) {
    // El desglose que se ve en pantalla arranca en 100 y va restando: si no
    // termina en el puntaje que se muestra, la cuenta queda a la vista y rota.
    const suma =
      100 -
      (d.penaltyIngredientes || 0) -
      (d.penaltyToxicidad || 0) -
      (d.penaltyRedFlags || 0) -
      (d.nutritionNegativeImpact || 0) +
      (d.nutritionPositiveImpact || 0) -
      (d.penaltyUltraProcessed || 0) -
      (d.penaltyPobrezaNutricional || 0) -
      (d.penaltyAmortiguacion || 0);
    // El motor recorta a 0-100, así que un desglose que se pasa de 100 (los
    // pasos pueden sumar, no sólo restar) sigue siendo un 100 válido.
    const esperado = Math.min(100, Math.max(0, Math.round(suma)));
    if (esperado !== score) {
      problems.push(
        `OVERRIDE ${c.name}: el desglose da ${suma.toFixed(1)} pero el score dice ${score}`,
      );
    }
    aplicados.push(`${c.name}: ${c.score} → ${score}`);
  }

  return {
    id: c.id,
    name: c.name,
    brand: c.brand,
    category: c.category,
    score,
    image: `${c.id}${path.extname(new URL(c.image).pathname) || '.jpg'}`,
    quota: (o && o.quota) || c.quota,
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
    excesses: (o && o.excesses) || h.excesses.map((e) => ({ name: e.name, value: e.valuePer100, unit: e.unit })),
    beneficials: h.beneficials.map((e) => ({ name: e.name, value: e.valuePer100, unit: e.unit })),
  };
});

if (problems.length) {
  console.error('PROBLEMAS:');
  problems.forEach((p) => console.error('  ' + p));
  process.exit(1);
}

fs.writeFileSync(path.join(DATA_DIR, 'products.json'), JSON.stringify(out, null, 2));

// Copias que sirve Vite desde public/. La fuente sigue siendo data/.
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
fs.mkdirSync(PUBLIC_DIR, { recursive: true });
fs.writeFileSync(path.join(PUBLIC_DIR, 'products.json'), JSON.stringify(out));

if (aplicados.length) {
  console.log(`Correcciones a mano aplicadas (data/score-overrides.json): ${aplicados.length}`);
  aplicados.forEach((a) => console.log('  ' + a));
  console.log('');
}

const sinJust = out.filter((p) => !p.justification).length;
console.log(`Productos: ${out.length}`);
console.log(`Con justificación: ${out.length - sinJust}`);
console.log(`Largo promedio del párrafo: ${Math.round(out.reduce((a, p) => a + (p.justification || '').length, 0) / out.length)} caracteres`);
console.log(`\n→ data/products.json`);
