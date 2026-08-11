/**
 * Arma un resumen legible de los 100 productos a partir de breakdowns.json,
 * para redactar la justificación de cada puntaje.
 *
 * Salida: data/_digest.txt
 *
 * Uso:  node scripts/build-digest.js
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const breakdowns = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'breakdowns.json'), 'utf8'));

/** Los logs del motor traen una línea por ingrediente y otra por nutriente. */
function parseLogs(logs) {
  const ingredients = [];
  const toxicity = new Map();
  const nutrients = [];

  for (const line of logs) {
    const l = line.trim();

    // [0] agua carbonatada: score=10.00 def=0.000 weight=1.000 → 0.0000
    let m = l.match(/^\[(\d+)\]\s+(.+?):\s+score=([\d.]+)/);
    if (m) {
      ingredients.push({ pos: +m[1], name: m[2], score: +m[3] });
      continue;
    }

    // 🚩 [1] azúcar: toxicidad=LOW → -1 * 0.705 = -0.70
    m = l.match(/🚩\s+\[(\d+)\]\s+(.+?):\s+toxicidad=(\w+)/);
    if (m) {
      toxicity.set(+m[1], m[3]);
      continue;
    }

    // ✅/❌ Nombre: valor=23.07/100ml | min=0.25 ... → +2.90
    m = l.match(/(✅|❌|⚠️|ℹ️)\s*(?:⚠️)?\s*(.+?):\s+valor=([\d.]+)\/100(g|ml)[^→]*→\s*(.+)$/);
    if (m) {
      nutrients.push({
        kind: m[1],
        name: m[2],
        value: Math.round(parseFloat(m[3]) * 100) / 100,
        unit: m[4],
        impact: m[5].trim(),
      });
      continue;
    }

    // 🏷️ Sello Azúcares: sin nutrition fact → fallback -15
    m = l.match(/🏷️\s+Sello\s+(.+?):\s+.*?(-[\d.]+)/);
    if (m) {
      nutrients.push({ kind: '🏷️', name: m[1], value: null, unit: '', impact: `sello, ${m[2]}` });
    }
  }

  return { ingredients, toxicity, nutrients };
}

const lines = [];
breakdowns.forEach((p, i) => {
  const d = p.breakdown;
  const { ingredients, toxicity, nutrients } = parseLogs(p.logs || []);

  lines.push(`${'━'.repeat(78)}`);
  lines.push(`#${String(i + 1).padStart(3)}  ${p.name}`);
  lines.push(`      ${p.brand || 's/marca'} · ${p.category} · cuota=${p.quota} · SCORE ${p.scoreGuardado}`);

  const parts = [];
  if (d.penaltyIngredientes) parts.push(`ingred ${d.penaltyIngredientes >= 0 ? '-' : '+'}${Math.abs(d.penaltyIngredientes).toFixed(1)}`);
  if (d.penaltyToxicidad) parts.push(`tox -${d.penaltyToxicidad.toFixed(1)}`);
  if (d.penaltyRedFlags) parts.push(`flags -${d.penaltyRedFlags.toFixed(1)}`);
  if (d.nutritionNegativeImpact) parts.push(`nutri- ${d.nutritionNegativeImpact.toFixed(1)}`);
  if (d.nutritionPositiveImpact) parts.push(`nutri+ ${d.nutritionPositiveImpact.toFixed(1)}`);
  if (d.penaltyUltraProcessed) parts.push(`ULTRAPROC -20`);
  if (d.penaltyPobrezaNutricional) parts.push(`pobreza -${d.penaltyPobrezaNutricional}`);
  if (d.penaltyAmortiguacion) parts.push(`amort +${d.penaltyAmortiguacion.toFixed(1)}`);
  lines.push(`      ${parts.join(' | ')}`);

  if (ingredients.length) {
    const ing = ingredients
      .slice(0, 9)
      .map((g) => {
        const t = toxicity.get(g.pos);
        return `${g.name}(${g.score}${t ? '/' + t : ''})`;
      })
      .join(', ');
    lines.push(`      ING: ${ing}${ingredients.length > 9 ? ` +${ingredients.length - 9} más` : ''}`);
  } else {
    lines.push(`      ING: (ninguno evaluado)`);
  }

  if (nutrients.length) {
    lines.push(`      NUT: ${nutrients.map((n) => `${n.kind}${n.name} ${n.value ?? ''}${n.unit} ${n.impact}`).join(' · ')}`);
  } else {
    lines.push(`      NUT: (ninguno superó umbral)`);
  }
});

fs.writeFileSync(path.join(DATA_DIR, '_digest.txt'), lines.join('\n') + '\n', 'utf8');
console.log(`→ data/_digest.txt (${breakdowns.length} productos, ${lines.length} líneas)`);
