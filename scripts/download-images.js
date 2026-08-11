/**
 * Baja las imágenes de los productos seleccionados desde S3 a data/images/.
 *
 * El juego tiene que funcionar con el iPad en modo avión: en el evento no se
 * pide nada a la red. Estas imágenes terminan en el bundle.
 *
 * Uso:  node scripts/download-images.js
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const DATA_DIR = path.join(__dirname, '..', 'data');
const IMG_DIR = path.join(DATA_DIR, 'images');

const get = (url, dest) =>
  new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on('finish', () => file.close(() => resolve(fs.statSync(dest).size)));
        file.on('error', reject);
      })
      .on('error', reject);
  });

(async () => {
  const candidates = [
    ...JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'candidates.json'), 'utf8')),
    // Los comodines de alcohol también se muestran en pantalla.
    ...JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'wildcards.json'), 'utf8')),
  ];
  fs.mkdirSync(IMG_DIR, { recursive: true });

  let ok = 0;
  let failed = 0;
  let bytes = 0;
  const errors = [];

  for (const p of candidates) {
    const ext = path.extname(new URL(p.image).pathname) || '.jpg';
    const dest = path.join(IMG_DIR, `${p.id}${ext}`);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
      ok++;
      bytes += fs.statSync(dest).size;
      continue;
    }
    try {
      bytes += await get(p.image, dest);
      ok++;
    } catch (e) {
      failed++;
      errors.push(`${p.name}: ${e.message}`);
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
    }
  }

  // Cada regeneración del pool cambia qué productos entran. Sin esta limpieza
  // se acumulan imágenes de curaciones viejas que terminan pesando en el bundle.
  const vigentes = new Set(
    candidates.map((p) => `${p.id}${path.extname(new URL(p.image).pathname) || '.jpg'}`),
  );
  let huerfanas = 0;
  for (const f of fs.readdirSync(IMG_DIR)) {
    if (!vigentes.has(f)) {
      fs.unlinkSync(path.join(IMG_DIR, f));
      huerfanas++;
    }
  }

  console.log(`Descargadas: ${ok}/${candidates.length}`);
  if (huerfanas) console.log(`Huérfanas borradas: ${huerfanas}`);
  console.log(`Fallaron:    ${failed}`);
  console.log(`Peso total:  ${(bytes / 1024 / 1024).toFixed(1)} MB (sin optimizar)`);
  if (errors.length) {
    console.log('\nErrores:');
    errors.forEach((e) => console.log('  ' + e));
  }
})().catch((e) => {
  console.error('ERROR', e.message);
  process.exit(1);
});
