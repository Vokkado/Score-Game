# CONTEXT — Score-Game

Contexto de trabajo del minijuego. Lo que hay que saber antes de tocar algo acá.

---

## 1. Qué es

Stand de Vokkado en un evento de nutricionistas. El jugador ve un producto real y
adivina su Score Vokkado (0-100). Cinco productos por partida. Primer puesto se
lleva un canguro, segundo una camiseta, así que **el ranking tiene que ser
auditable**: se guarda cada tirada, no solo el total.

Objetivo real más allá del juego: captar contactos (nombre, apellido, email,
consentimiento) y mostrar que el motor razona bien. La pantalla de desglose es la
demo del producto, no un adorno.

## 2. Decisiones tomadas y por qué

**Web (PWA), no app nativa.** En un iPad prestado no se pelea con TestFlight ni
perfiles de provisioning. Safari + "Agregar a pantalla de inicio" queda fullscreen.
Si un iPad falla, se sigue desde cualquier dispositivo con la misma URL.

**Repo aparte.** Es código de evento. Meterlo en Frontend obliga a rebuild nativo;
meterlo en Administration-Frontend ensucia un repo productivo con rutas públicas
sin auth.

**Offline-first, no negociable.** El WiFi de los eventos es malo. Los 100 productos
y sus imágenes van en el bundle; las partidas se guardan en IndexedDB y se
sincronizan si hay red. **El juego tiene que funcionar en modo avión** — probarlo
así antes de salir.

**Dos tablas en la Neon existente**, en schema propio `event_game`, creadas por un
script SQL de este repo. NO como migración del Backend: ese repo tiene 227
migraciones con colisiones históricas de numeración y un choque pendiente 188/189
con la rama de Belén. Acoplar el juego a ese pipeline es pedir problemas.

**Un iPad jugando + una pantalla mostrando el ranking.** La pantalla de ranking en
vivo es el mejor imán de gente que hay en un stand.

## 3. El scoring — cómo funciona de verdad

Motor: `Backend/src/modules/products/services/ProductScoringService.ts`, versión 2.2.
Arranca en 100 y aplica 8 pasos:

| Paso | Qué mide | Tope |
|---|---|---|
| 1 | Calidad de ingredientes + proporción | −40 a +3 |
| 2 | Toxicidad promedio ponderada por posición | −15 |
| 3 | Red flags individuales | −10 |
| 4 | Nutrition facts (negativo / positivo) | −45 / +20 |
| 5 | Ultra-procesado (NOVA 4) | −20 fijo |
| 6 | Pobreza nutricional | −15 |
| 8 | Amortiguación de caída libre | variable |

**El Paso 8 no se muestra en el juego.** Es una curva que evita que el score caiga
por debajo de ~2. Correcto como diseño, pero en un stand se lee como maquillaje
del número. Va solo en el admin. 5 de los 100 tienen más de 3 puntos de
amortiguación; las Galletas Lu Lu tienen más de 12.

### Unidades — el error más fácil de cometer

`products.nutrition_facts` guarda los valores **por porción**, como los declara la
etiqueta. Los umbrales del motor están **por 100 g/ml** y el Paso 4 normaliza.

**La pantalla tiene que leer `highlights.valuePer100`, nunca el `nutrition_facts`
crudo.** Mostrar el valor de etiqueta rotulado "por 100 g" es un error factual, y
este público lo detecta. Verificado que la normalización interna funciona: un
aceite da 830 kcal/100 ml, que es lo correcto.

### Cómo decide qué es "beneficioso"

La tabla `nutrition_facts` tiene 31 nutrientes marcados `BENEFICIAL`, cada uno con
`solid_min` / `liquid_min`. Un nutriente cuenta **solo si el valor normalizado a
100 g supera ese mínimo**. Por debajo, no suma nada.

Consecuencia: un producto puede declarar fibra y proteína y aun así contar cero
beneficiosos. Es lo que le pasa al tomate perita (0,62 g de fibra contra un mínimo
de 1,0).

### La penalización por pobreza tiene dos escalas

- Ingredientes limpios (`penaltyIngredientes ≤ 0`): `[10, 7, 3, 0]`
- Con algún ingrediente malo: `[15, 10, 5, 0]`

El índice es la cantidad de nutrientes beneficiosos acreditados. **Efecto lateral
poco obvio:** el tomate perita tiene ácido cítrico, así que `penaltyIngredientes`
da 6,54 y cae en la escala dura. Ese aditivo le cuesta 0,5 puntos directos y
**5 indirectos**.

## 4. Lección de método

Diagnostiqué tres "bugs del motor" por correlación, sin abrir el desglose. **Los
tres estaban mal o exagerados.** Al correr `scoregame-compare.ts`:

| Lo que dije | Lo que era |
|---|---|
| Coca Light (22) peor que Original (26) porque el motor castiga la falta de datos | Falso. Es por ingredientes: aspartamo MEDIUM_HIGH, benzoato de sodio 0/10, acesulfamo K. La Light pierde 19,2 puntos más por ingredientes y se ahorra 15 por no tener azúcar. Neto −4,19, y 26−22 = 4. **Criterio del modelo, defendible.** |
| Aceite de soja en 12 por error de clasificación | Exagerado. Lleva terbutilhidroquinona (INS 319), toxicidad HIGH. El grueso está justificado. Solo el −20 de ultraprocesado es dudoso. |
| Tomate perita castigado por tabla vacía | Impreciso. La tabla tiene 5 nutrientes; los valores son reales y genuinamente bajos. La crítica que queda es más chica (ver arriba). |

**Antes de afirmar que un puntaje está mal, correr `scoregame-compare.ts`.** Toma
segundos y evita reportar como bug lo que es criterio.

## 5. Cómo se armaron los 100

**Capa 1 — calidad (SQL).** De 25.431 productos, 574 tienen score. Sobre esos:
imagen, inspeccionado, con `serving_size_amount`, ≥4 nutrientes, nombre ≤60
caracteres, con `highlights`, sin alcohol → **440**. Después: fuera marcas
inválidas (`"Otras Marcas"`, `"Uruguay"` son parseos fallidos del ingest), fuera
ultra-procesados dudosos en alimentos base, un solo formato por producto → **390**.

Las aguas tienen excepción: no declaran nutrientes porque no tienen, y exigirles
tabla las dejaba fuera del pool justo cuando son el ancla del 100.

**Capa 2 — interés.** Desvío respecto al promedio de su categoría, halo saludable
(categoría o rótulo que promete salud y puntúa bajo), distancia al centro de la
escala.

**Capa 3 — reconocimiento de marca.** No automatizable: no hay dato de popularidad
en la base. Se resuelve a mano en `revision.csv`.

**Imprescindibles (14), reservados antes de las cuotas:** 2 aguas minerales,
4 refrescos azucarados de marca grande, 2 legumbres/frutas casi perfectas,
3 alfajores, 3 gomitas. Una marca por slot. Sin la prioridad explícita de marca,
Coca-Cola se quedaba afuera porque Fanta (16) está más lejos de 50.

**Cuotas para el resto:** 22 sorpresa · 22 trampa · 14 ancla buena · 14 ancla mala ·
12 medio. Topes: 3 por marca, 6 por categoría.

**Comodines:** 11 productos con alcohol ≥0,5%. El motor les da `score = null` a
propósito (no hay nivel de consumo libre de riesgo, posición de la OMS). En el
juego son producto extra que no suma ni resta.

## 6. Rarezas detectadas

Encontradas leyendo los 100 productos uno por uno.

**Ya resueltas (2026-08-11):**

1. ~~**Yerbas (97, 93, 91)**~~ — valores de la hoja seca (50 g de fibra, 850 mg de
   calcio por 100 g). Correctos, pero nadie consume 100 g de yerba y la infusión
   extrae una fracción mínima. **Categoría excluida** vía `EXCLUDED_CATEGORIES`.
2. ~~**Tres masas de empanada La Especialista**~~ — resuelto con el tope
   `MAX_PER_BRAND_CATEGORY = 2` más el stemming de plurales en `baseKey`.
3. ~~**Nombres sucios**~~ — `NAME_FIXES` y `BRAND_FIXES` en `curate-products.js`
   corrigen el nombre en portugués, "La Especilista", "Conapole" y la marca mal
   asignada de La Celestina. Sólo para pantalla; la base no se toca.

**Pendiente de decisión tuya:**

4. **Gomitas Mogul con sello de exceso de grasas saturadas (−12)** — sus
   ingredientes son azúcar, glucosa, jugo de manzana y colorantes. No tiene grasa.
   Dato de etiqueta mal cargado que sí afecta el score. Sigue en el pool.

**Del motor, para mirar después del evento (no bloquean el juego):**

5. **Dos galletitas idénticas con 20 puntos de diferencia.** El Trigal Sin Azúcar:
   vainilla 72, chocolate 52. Misma línea, ambas con sucralosa y polidextrosa,
   ~22 g de fibra las dos. La única diferencia es el flag de ultraprocesado, que
   está puesto en una y no en la otra.
6. **Jugo Citric: 79 en 250 ml, 34 en bidón de 3 L.** Mismo jugo exprimido; el
   formato grande lleva tres conservantes. Real y explicable, pero si salen los dos
   en la misma partida parece un error.
7. **Agua mineral Salus Con Gas en 69**, mientras las otras aguas están en 100.
   Declara calcio, magnesio y dos cloruros como agregados, así que el motor la
   trata como mineralizada.
8. **Mayonesa Mayoliva** solo declara calorías: no recibe descuento por grasas —el
   nutriente que más importa en una mayonesa— y en cambio se lleva −15 por no
   aportar nada.
9. **Maracuyá Cambay** declara fibra 1,0 y proteína 2,0, exactamente los dos
   umbrales mínimos. Valores sospechosamente redondos, probablemente placeholders.
10. **Ultraprocesado en alimentos base.** Aceites refinados marcados NOVA 4; por
    NOVA son ingrediente culinario procesado (grupo 2). Vale 20 puntos.

## 6c. Branding — portado del Frontend

`src/theme.css` tiene los tokens y `src/componentes/` replica los componentes.
**Si cambia el sistema de diseño de la app, esos son los lugares a tocar.**

| De dónde salió | Qué trajo |
|---|---|
| `theme/colors.ts` | `--vk-*`: primaryDark `#22521D`, primary `#5B8806`, primaryLight `#B8C445`, fondo `#F1F1F1`, superficie `#FCFCFC`, gris `#727272`, texto `#161616`, borde `rgba(14,17,22,0.08)` |
| `theme/typography.ts` | Lexend 400/500/600/700 |
| `components/ui/AppText.tsx` | **Las 7 variantes con sus tamaños y pesos**: display 44/bold, title 20/bold, sectionTitle 16/semi, subtitle 14/semi, body 13/regular, caption 11/regular, label 10/medium |
| `theme/spacing.ts` | Espaciados 4→48, radios 4→24, las 4 sombras |
| `components/ui/AppButton.tsx` | Botón: alto 52, radio 12, primaryDark, texto friendlyWhite, deshabilitado gris con opacidad 0.6 |
| `components/ui/AppInput.tsx` | **Campo**: alto 46, radio 10, **borde 1px**, padding 14, **fondo del color de página** (no blanco), placeholder `#999` y los textos por defecto ("Tu nombre", "tucorreo@ejemplo.com"). Label en body sobre `--vk-texto`, no en color de marca |
| `components/ui/AppCheckbox.tsx` | **Casilla**: tarjeta entera clickeable, borde 2px, radio 10, padding 14; cuadrito de 22 con radio 5 **a la derecha**; marcada tiñe borde y fondo con primaryDark |
| `components/ui/ScoreBadge.tsx` | **Insignia**: círculo relleno con el color del puntaje y número en blanco. 36/13, 60/22, 80/29. Con alcohol: fondo rojo, botella y el grado con coma decimal |
| `components/ui/ScreenHeader.tsx` | **Encabezado**: chevron en área de 40px, título centrado en sectionTitle, franja inferior de 1px |
| `components/ui/ProductCard.tsx` | **La escala de color por puntaje** |

### Dos desviaciones deliberadas

1. **Tamaño del campo.** La app usa 14px de fuente y 46 de alto. Acá el mínimo
   son 16px reales: por debajo de eso **Safari hace zoom al enfocar** y descuadra
   el kiosco. El alto sube en consecuencia.
2. **Insignias más grandes desde 700px de ancho** (84 y 124 en vez de 60 y 80),
   manteniendo la proporción número/círculo. En la app se miran a 30 cm; en el
   stand, a un metro.

### La escala de puntaje

Replicada en `scoreColor()` (`engine.ts`) con los mismos cortes que
`getScoreColor` en ProductCard, y con tests que los fijan:

```
≥85 verde #00813E · ≥65 verde claro #4CAF50 · ≥45 amarillo #ECBF0A
≥25 naranja #EF8201 · <25 rojo #E73B09
```

Se usa en tres lugares, y no es decorativo: **el jugador aprende la escala real
de la app mientras juega.**

1. El número gigante del slider cambia de color mientras lo mueve.
2. La barra del slider está pintada con los cinco tramos en sus cortes exactos.
3. En el feedback, las dos cajas (lo que dijo y el score real) toman su color.

La pantalla de inicio muestra la escala completa de una, para que la primera
respuesta no sea completamente a ciegas.

### Tipografía

Lexend viene de `@fontsource/lexend`, **importando sólo el subset latin**. Los
imports genéricos (`@fontsource/lexend/400.css`) arrastran también cirílico y
vietnamita: 24 archivos y 330 kB que habría que cachear para el modo offline sin
usarlos nunca. Con `latin-400.css` y sus hermanos son 8 archivos y 130 kB.

Va empaquetada, no desde Google Fonts: en el evento no hay red que valga.

### Idioma y símbolos

Todo lo visible va **en español rioplatense**: el juego se llama "Desafío del
Puntaje", se dice *puntaje* y no *score*, *correo* y no *email*, *control* y no
*slider*. Las cabeceras del CSV que exporta el admin también, porque las abre
gente del equipo y no un sistema.

**Sin emoji.** Los premios y los íconos son SVG inline en
`src/componentes/Iconos.tsx`, con los mismos trazos que los Ionicons de la app
(chevron, tilde, trofeo, botella). Se dibujan a mano en vez de sumar una
librería de íconos entera al bundle que viaja al iPad.

### Responsive

Los tamaños de fuente son `clamp()` fluidos cuyo valor central coincide con el
de la app. La foto del producto usa `clamp(150px, 28dvh, 300px)` para que en un
iPhone SE el slider y el botón entren sin scrollear — el iPad es el objetivo,
pero si falla hay que poder seguir desde un celular.

Verificado por medición en 375×812 y 834×1112: sin scroll horizontal, sin
desbordes, y en ambos la pantalla de jugada entra completa.

> **Cuidado con las animaciones en `.pantalla`.** Un `translateY` en el
> contenedor que define el alto de la página deja scroll fantasma (pasó: 10 px
> en iPhone SE). La animación de entrada es sólo de opacidad.

## 7. Reglas del juego, ya implementadas

`src/game/engine.ts` — lógica pura, sin React, con 16 tests.

- **5 productos** por partida, **18 segundos** cada uno. Al vencer el timer se
  envía lo que haya en el slider: no se castiga con cero, pero tampoco se espera
  indefinidamente con fila en el stand.
- **Puntos = max(0, 100 − |error| × 2)**, tope 500. El ×2 es deliberado: entre
  nutricionistas casi todos caen cerca y con ×1 se empataban cinco personas en el
  podio. Errar por 15 cuesta 30, que alcanza para ordenar.
- **Desempate:** puntos → tiempo total → quién jugó primero. Determinístico y
  explicable, porque hay premios.
- **Sorteo no uniforme:** se fuerzan al menos 2 productos "sorpresa" o "trampa" y
  no se repite categoría dentro de una partida. Con random puro a alguien le
  tocaban 5 obvios y el juego perdía la gracia.
- **Un intento por email**, validado contra IndexedDB (índice único). Case
  insensitive: `ANA@Test.uy` y `ana@test.uy` son la misma persona.

## 8. Estado al 2026-08-11

### Pool

100 productos, rango 6-100, mediana 49, con presencia en las cinco decenas.
**65 sin ninguna alerta.** Las alertas restantes en `revision.csv`: 21 penalizan
sin exceso visible, 11 sin nutrientes que mostrar, 5 pobreza discutible, 5 muy
amortiguados, 2 ultraprocesado dudoso.

Cero yerbas. Ninguna marca repite más de 2 veces dentro de la misma categoría.
Cada producto tiene su párrafo de justificación escrito a mano desde el desglose
real (243 caracteres promedio) en `justifications.json`.

### App

Funciona de punta a punta. Verificado jugando partidas completas en el navegador:

- Flujo: inicio → registro → 5 productos → comodín → resultado → encuesta → reinicio
- Persistencia en IndexedDB correcta (una partida de prueba dio 92+100+30+82+0 = 304)
- Bloqueo de email repetido, case insensitive
- 111 imágenes cargando, sin errores de consola, sin overflow horizontal
- La cascada del desglose cierra contra el score real (aceite: 100 +0,4 −12 +0,4 −3 = 86)
- `npm test` → 16 en verde · `npm run build` → 13,2 MB, verificado con `vite preview`

### Bugs encontrados y arreglados en el camino

- **Imágenes huérfanas**: cada regeneración del pool cambia qué productos entran y
  el script bajaba las nuevas sin borrar las viejas. Había 136 archivos para 111
  productos: 25 de peso muerto que se hubieran ido al bundle del iPad.
- **Ruta de imagen del comodín hardcodeada a `.jpg`**. Los 11 comodines actuales
  son `.jpg` así que funcionaba de casualidad, pero el pool tiene `.webp` y `.png`.
  Al regenerar podía romperse recién en el stand. Ahora la extensión sale del
  pipeline de datos, no de la pantalla.
- **`vite.config.ts` era ESM en un package CommonJS** → renombrado a `.mts`, que
  deja los scripts de curación en CJS sin tocarlos.
- **`pg` estaba en `dependencies`** cuando sólo lo usan los scripts de datos.

## 8b. Pantalla de Inicio — rediseño (2026-08-12)

Primera pantalla que se revisó con el usuario mirando el resultado real, no sólo
midiendo estilos por JS. Cambios:

**Marca.** `EncabezadoMarca.tsx`: logo (`src/assets/icon.png`, el aguacate con
lupa) + "Vokkado" en **Alan Sans ExtraBold** (`@fontsource/alan-sans`, sólo el
peso 800/subset latin), réplica de `Topbar.tsx` pero más grande — acá es la
identidad de toda la pantalla, no comparte espacio con una flecha atrás.

**Copy.** De "Score Challenge" con dos tarjetas largas a "Jugá y ganá" +
subtítulo de una línea + una sola frase de instrucción. La razón: siempre hay
alguien del stand ayudando, así que el texto compite con la persona explicando
en vivo, no la reemplaza.

**`EjemploInteractivo.tsx` — la pieza nueva.** Reemplaza a la vieja franja de
colores estática. Es un mini-juego de práctica con un producto ficticio (usa el
logo como imagen, nunca un producto real del pool — así no se spoilea ninguno de
los 100):
- Control deslizante con la barra de gradiente ya existente (0-100).
- Etiqueta genérica según la posición (`demoLabel()` en engine.ts, con test):
  "Mal producto" / "Decente" / "Saludable", cortada en los mismos 45/65 que
  `scoreColor`.
- Contador de puntos en vivo contra un `OBJETIVO_DEMO = 62` **que nunca se
  muestra en pantalla** — sólo se ve el efecto de acercarse.
- La perilla late suavemente hasta el primer toque (`.idle`, animación en el
  pseudo-elemento `::-webkit-slider-thumb`/`::-moz-range-thumb`), para invitar
  a tocarla sin decir "tocá acá".

**Barra que "paraba en 85".** No era un bug del gradiente (ese ya llegaba a
verde y se mantenía hasta 100 por comportamiento normal de CSS). Era la vieja
franja de colores estática, que sólo rotulaba el inicio de cada tramo
(0/25/45/65/85) sin mostrar el techo. Se eliminó esa franja; ahora la única
referencia numérica es "0" / "100" en los extremos del control, igual que en
la jugada real.

**Tabla + premios.** Primer puesto: pill "Canguro"; segundo: pill "Camiseta"
(`premioDe()` en `TablaPosiciones.tsx`). Encabezado de sección "¿Quién se lleva
el Canguro?" con el ícono de trofeo.

**Teléfono — decisión de privacidad.** Se agregó `telefono` a `Player`,
`Registro.tsx` y al CSV de exportación (para contactar ganadores si el email
falla), **campo opcional**. Pero **el correo y el teléfono no se muestran en
ninguna tabla de posiciones**, ni en el inicio ni en el resultado — son datos de
contacto privados, no algo para exhibir en una pantalla pública del stand.
Verificado: el texto de la página no contiene `@` ni el número ingresado en
ningún momento del flujo.

**Fondo de marca.** `Background.png` (el póster "Saber Elegir es cuidarte" con
la mascota) como marca de agua: opacidad 0,06, 300px, esquina inferior derecha,
recortado por `overflow: hidden` en un wrapper propio de Inicio
(`.pantalla-con-fondo`) para no tocar el resto de las pantallas.

**Botón más grande.** Sólo en Inicio, vía clase `.grande` (64px de alto en vez
de 52) — modificador aparte, no se tocó `--alto-boton` global.

**Letra chica.** Horario de premios y aviso del sticker en una sola línea
(`.pie-inicio`), separados por "·", debajo del botón.

**Verificación con un hallazgo de entorno, no de código:** al leer el color de
`.demo-etiqueta` con `getComputedStyle` justo después de mover el control, daba
siempre amarillo sin importar el valor. Se aisló sacando la `transition: color`
a mano: sin transición, el color resolvía perfecto (rojo/verde exactos) en cada
caso. Es que el panel del navegador no estaba compositando frames en esa sesión
("the Browser pane is not displayed"), así que la transición CSS nunca
tickeaba y `getComputedStyle` leía el frame congelado. **No es un bug real** —
en un dispositivo con la pantalla efectivamente pintando, la transición corre
normal. Vale la lección: si un color/animación no cambia bajo verificación por
JS, probar primero sin la transición antes de asumir que la lógica está mal.

## 8c. Pantalla de Inicio — segunda vuelta, con captura real (2026-08-12)

La primera vuelta se verificó sólo por JS/medición (el panel del navegador no
componía frames en esa sesión). El usuario mandó una captura real y varias
cosas que la medición no detecta se vieron mal. Lección: **medir estilos no
reemplaza mirar el resultado.** Cambios de esta vuelta:

- **Fondo de marca, rediseñado.** No estaba centrado y se veía cortado a lo
  bruto (una esquina del póster asomando). Ahora `.fondo-marca-wrap` es una
  franja de ancho completo pegada al piso (`bottom: 0`, `overflow: hidden`,
  imagen centrada con `translateX(-50%)`), recortada para mostrar sólo el
  patrón de cuadraditos del pie del póster — se lee como un borde puesto a
  propósito, no como un error de encuadre.
- **Mayúsculas y tamaño del héroe.** `.hero-titulo` con `text-transform:
  uppercase`. Subió toda la escala tipográfica base en `theme.css` (antes el
  mínimo de cada `clamp()` copiaba el tamaño exacto de la app — que asume el
  celular en la mano; acá se lee parado, a veces con el dedo de otra persona en
  la pantalla, así que el piso subió ~15-20% en cada variante).
- **El idle real.** Lo que pedía no era el pulso CSS que hice la primera vez —
  quería que **el control se mueva solo**, con el número y la etiqueta
  cambiando en vivo, hasta que alguien lo toca. Reescrito con un
  `setInterval` que hace un vaivén 0↔100 (1 punto cada 28ms) mientras
  `tocado === false`; se congela para siempre en el valor donde estaba apenas
  hay un `onPointerDown`/`onChange`. Verificado: la secuencia sin tocar avanza
  sola (10→24→39→53→68→82), y se congela al instante de tocar.
- **Sin degradé arcoíris.** El control del ejemplo (`.control-demo`) ya no usa
  el gradiente de 5 colores fijo — tiene un relleno sólido hasta el valor
  actual, con el mismo color que la etiqueta de arriba. Se pasa por variables
  CSS en línea (`--relleno-color`, `--relleno-pct`) porque un pseudo-elemento
  (`::-webkit-slider-runnable-track`) no se puede stylear con `style={}`
  directo — el truco es declarar la variable en el elemento y leerla en la
  regla CSS de la pseudo-clase.
- **Widget simplificado.** Se sacó el contador de puntos ("+NN si acertaras
  acá") y el header con ícono + "Producto de ejemplo": ya no hacían falta con
  el idle real explicando el mecanismo solo. La etiqueta cualitativa
  ("Mal producto" / "Decente" / "Saludable") bajó de posición: ahora va debajo
  del número grande, centrada, en `--fs-title`.
- **Tabla consolidada.** `TablaPosiciones` ahora renderiza su propio
  encabezado (`titulo` + columna "Puntaje" a la derecha, prop `titulo`
  default "Tabla de posiciones"), así Inicio y Resultado no duplican el
  `<h2>`. Se sacó "¿Quién se lleva el Canguro?" y el ícono de trofeo de la
  cabecera — quedó texto plano como pidió. El podio (puestos 1-3) tiene la
  clase `.destacado`: fuente y padding más grandes que el resto de la lista.
- **Privacidad, confirmada con el usuario.** Preguntó por qué no estaban los
  emails en la tabla — se le explicó el riesgo (pantalla pública del stand) y
  se le dio a elegir; **confirmó no mostrarlos**. Sigue igual que antes:
  nombre + inicial del apellido únicamente, correo y teléfono nunca en
  pantalla. Verificado con `body.innerText.includes('@')` → `false` en el
  flujo completo.
- **Letra chica del horario**, un poco más grande (de `--fs-caption` a
  `--fs-body`).

## 9. Dónde retomar

En orden de importancia:

1. **Service worker.** Es lo único que separa la promesa de "funciona en modo
   avión" de la realidad: hoy la app necesita red para cargar. Cachear el shell,
   los dos JSON y las 111 imágenes. Después probar **de verdad** con el iPad en
   modo avión, no asumirlo.
2. **Deploy a Vercel.** Nunca se hizo. El build está verificado, pero la primera
   vez hay que hacerla con tiempo. Ver README §Desplegar.
3. **Pantalla `/tv`** con el ranking en vivo para la segunda pantalla del stand.
   No debe mostrar nunca qué productos salieron ni sus scores: el que está en la
   fila memoriza.
4. **Backend de sync + panel admin** con PIN, export CSV y reset. Schema
   `event_game` en la Neon existente, creado por script SQL de este repo.
5. **Revisión humana de `revision.csv`** — marcar la columna `ok` y decidir sobre
   las marcas que no se reconozcan. Es lo único que no puedo hacer yo.
6. Decidir sobre las Gomitas Mogul (§6.4).

**Branding:** ✅ hecho, ver §6c. **Logo:** ✅ resuelto — el usuario pasó
`src/assets/icon.png` (aguacate con lupa) y `src/assets/Background.png` (póster
de marca), ver §8b.

**Pantallas:** Inicio ✅ rediseñada (§8b). Registro, Jugada, Feedback, Comodín,
Resultado y Encuesta siguen con el diseño del branding pass anterior — mismos
tokens, pero sin el mismo nivel de pulido de copy/interacción que Inicio.
Van una por una, como pidió el usuario.

**Falta:** revisión humana de `revision.csv` (marcar columna `ok`, decidir marcas
no reconocibles) y las decisiones de la sección 6.

## 10. Checklist del stand

- iPad con **bloqueo automático desactivado** y enchufado todo el día
- **Guided Access con PIN** (triple click lateral) para que nadie salga de Safari
- Probar el juego entero **en modo avión** antes de salir
- **Exportar CSV cada hora** desde el admin y mandarlo por mail: si el iPad se
  resetea, no se pierden los inscriptos
- La pantalla de ranking **nunca muestra qué productos salieron ni sus scores** —
  si no, el que está en la fila memoriza
- Un intento por email, validado local y en servidor (hay premios de por medio)
- Aclarar en la pantalla de instrucciones que se adivina el **Score Vokkado sobre
  100 g de producto**, no el veredicto personalizado. Si no se aclara, el primero
  que sepa del tema lo discute con razón
