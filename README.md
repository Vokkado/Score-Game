# Score-Game

Minijuego de stand para Nutribu: el jugador ve un producto real y adivina su
Score Vokkado (0-100). 5 productos por partida, ranking con premios, encuesta
al final.

Corre sobre un iPad en Safari, en modo kiosco con Guided Access. Los 100
productos y sus imágenes viajan dentro del bundle y las partidas se guardan en
IndexedDB, así que el juego no depende de la red del evento para funcionar.

Ver [CONTEXT.md](CONTEXT.md) para las decisiones de diseño, los hallazgos sobre
el motor de scoring y las rarezas pendientes de decisión.

## Stack

| Qué | Con qué | Versión |
|---|---|---|
| Build y dev server | Vite | 8.2 |
| UI | React | 19.2 |
| Lenguaje | TypeScript | 7.0 (modo estricto) |
| Tests | Vitest | 4.1 |
| Estilos | CSS plano, sin framework | — |
| Persistencia local | IndexedDB nativo, sin librería | — |
| Scripts de datos | Node + `pg` (sólo lectura) | Node 26 |

No hay router, ni state manager, ni librería de componentes: el juego son siete
pantallas y una máquina de estados de un `useState`. Agregar dependencias acá
sólo suma peso al bundle que tiene que viajar al iPad.

**La app no usa `pg`.** Está en devDependencies porque lo necesitan únicamente
los scripts de curación, que corren en tu máquina contra la base.

## Correr en local

```bash
npm install
npm run dev      # http://localhost:5180
npm test         # 16 tests del motor del juego
npm run build    # typecheck + bundle en dist/
npm run preview  # sirve dist/ para probar el build real
```

El dev server escucha en `0.0.0.0`, así que desde el iPad en la misma WiFi se
entra con `http://<ip-de-tu-máquina>:5180`.

## Desplegar

El resultado del build es **estático puro**: `dist/` no necesita servidor de
aplicación, sólo algo que sirva archivos por HTTPS. HTTPS es requisito, no
preferencia: sin él Safari no instala la PWA ni habilita el service worker.

```
dist/
  index.html                  0,8 kB
  assets/index-*.js         205 kB   (65 kB gzip)
  assets/index-*.css          6 kB
  products.json              89 kB
  wildcards.json
  products/                  12,9 MB  ← las 111 imágenes
```

Total ~13,2 MB, casi todo imágenes.

### Opción recomendada: Vercel

```bash
npm i -g vercel
vercel --prod
```

Cuando pregunte, contestar:

| Pregunta | Respuesta |
|---|---|
| Framework preset | Vite |
| Build command | `npm run build` |
| Output directory | `dist` |
| Install command | `npm install` |

Da HTTPS y un dominio propio sin configurar nada. Es la vía más corta para tener
una URL que abrir en el iPad.

### Alternativa: S3 + CloudFront

Ya hay cuenta de AWS en el proyecto. Requiere un bucket con hosting estático,
una distribución de CloudFront con certificado, e invalidación en cada deploy.
Más pasos y más cosas que pueden fallar el día del evento; sólo tiene sentido si
hay una razón para no usar Vercel.

> **Estado:** el build está verificado —`npm run preview` sirve `index.html`,
> los JSON y las imágenes con 200— pero **el deploy todavía no se hizo**. La
> primera vez hay que hacerlo con tiempo, no la víspera del evento.

## Preparar el iPad

1. Abrir la URL de producción en Safari.
2. Compartir → **Agregar a pantalla de inicio**. Queda fullscreen, sin barra de
   URL, y parece una app.
3. Abrirla desde el ícono y **jugar una partida completa** para que quede todo
   en caché.
4. Ajustes → Pantalla y brillo → **Bloqueo automático: Nunca**.
5. Ajustes → Accesibilidad → **Acceso Guiado: activado**, con código. Triple
   click en el botón lateral bloquea la app en pantalla.
6. Dejar el iPad **enchufado a corriente** todo el evento.

El resto del checklist del stand está en [CONTEXT.md](CONTEXT.md) §8.

## Estado

- [x] Curación del pool de 100 productos
- [x] Desglose real del score (motor V2.2), verificado contra la base
- [x] Justificación escrita a mano para cada producto
- [x] Motor del juego + 16 tests
- [x] Siete pantallas: inicio, registro, jugada, feedback, comodín, resultado, encuesta
- [x] Persistencia en IndexedDB + un intento por email
- [x] Build de producción verificado
- [ ] Revisión humana de los 100 → `data/revision.csv`
- [ ] **Service worker** — sin esto la app todavía necesita red para cargar
- [ ] Pantalla `/tv` de ranking en vivo
- [ ] Backend de sync y panel admin
- [ ] Deploy

## Estructura

```
src/
  game/
    engine.ts       Reglas del juego: scoring, sorteo, ranking. Sin React.
    engine.test.ts  16 tests
    storage.ts      IndexedDB, cola de sync, export CSV
  pantallas/        Una por fase del juego
  App.tsx           Máquina de estados
data/
  products.json       Lo que consume el juego: 100 productos con desglose y justificación
  wildcards.json      11 comodines con alcohol (sin puntaje)
  revision.csv        Tabla para revisión humana, con alertas y justificaciones
  candidates.json     Los 100 seleccionados por la curación (regenerable)
  breakdowns.json     Desglose crudo de los 8 pasos del motor
  justifications.json Los párrafos escritos a mano, uno por producto
public/
  products/           Las 111 imágenes (no versionadas, se regeneran)
  *.json              Copias que sirve Vite; la fuente es data/
scripts/
  curate-products.js      Selección con filtros + cuotas + imprescindibles
  download-images.js      Bajada de imágenes desde S3
  build-review.js         Arma revision.csv
  build-digest.js         Arma _digest.txt
  merge-justifications.js Une justificaciones y genera products.json
```

Los scripts que corren el motor de scoring viven en el Backend porque necesitan
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
correcto y falla si la curación cambió el orden. Si eso pasa hay que reescribir
los párrafos afectados en `justifications.json`, no forzar el merge.

## Comparar dos productos

Cuando alguien discuta un puntaje en el stand:

```bash
cd ../Backend && npx ts-node scripts/scoregame-compare.ts "Coca-Cola Original" "Coca-Cola Light"
```

Devuelve el desglose de los 8 pasos con cada ingrediente, su puntaje y su
toxicidad. Es la respuesta a "¿por qué este producto puntúa así?".
