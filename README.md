# Score-Game

Minijuego de stand para Nutribu: el jugador ve un producto y adivina su Score
Vokkado (0-100). 5 productos por partida, ranking con premios, encuesta al final.

Web (PWA) sobre iPad en Safari con Guided Access. **Offline-first**: los productos
y sus imágenes van en el bundle, las partidas se guardan en IndexedDB y suben al
backend sólo si hay red. El juego funciona con el iPad en modo avión.

Ver [CONTEXT.md](CONTEXT.md) para el detalle de decisiones, hallazgos sobre el
motor de scoring y estado del trabajo.

## Estado

- [x] Curación del pool de productos
- [x] Desglose real del score (motor V2.2)
- [x] Justificación escrita para cada producto
- [x] Imágenes descargadas
- [ ] Revisión humana de los 100 → `data/revision.csv`
- [ ] App

## Estructura

```
data/
  products.json       Lo que consume el juego: 100 productos con desglose y justificación
  wildcards.json      11 comodines con alcohol (sin puntaje)
  revision.csv        Tabla para revisión humana, con alertas y justificaciones
  candidates.json     Los 100 seleccionados por la curación (regenerable)
  breakdowns.json     Desglose crudo de los 8 pasos del motor
  justifications.json Los párrafos escritos a mano, uno por producto
  images/             Imágenes de S3 (no versionadas, se regeneran)
  _raw_pool.json      Pool completo tras filtros de calidad
  _digest.txt         Resumen legible de los 100, para redactar justificaciones
scripts/
  curate-products.js      Selección con filtros + cuotas + imprescindibles
  download-images.js      Bajada de imágenes desde S3
  build-review.js         Arma revision.csv
  build-digest.js         Arma _digest.txt
  merge-justifications.js Une justificaciones y genera products.json
```

Los scripts que corren el motor de scoring viven en el Backend, porque necesitan
sus servicios: `Backend/scripts/scoregame-breakdowns.ts` y `scoregame-compare.ts`.

## Regenerar el pool

```bash
export PGURL=$(aws lambda get-function-configuration --function-name scantoeat-api-dev --region us-east-2 --query "Environment.Variables.DATABASE_URL" --output text)
node scripts/curate-products.js
cd ../Backend && npx ts-node scripts/scoregame-breakdowns.ts && cd ../Score-Game
node scripts/build-digest.js
node scripts/merge-justifications.js
node scripts/build-review.js
node scripts/download-images.js
```

Todo es de sólo lectura sobre la base. Ningún script escribe en producción.

**Ojo:** `merge-justifications.js` valida que cada párrafo caiga en el producto
correcto y falla si la curación cambió el orden. Si eso pasa, hay que reescribir
los párrafos afectados en `justifications.json`, no forzar el merge.

## Comparar dos productos

Cuando alguien discuta un puntaje en el stand:

```bash
cd ../Backend && npx ts-node scripts/scoregame-compare.ts "Coca-Cola Original" "Coca-Cola Light"
```

Devuelve el desglose de los 8 pasos con ingredientes, su puntaje y su toxicidad.
