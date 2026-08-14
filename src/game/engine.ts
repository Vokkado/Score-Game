/**
 * Motor del juego. Sin React ni DOM: lógica pura, testeable y fácil de razonar.
 *
 * Reglas:
 *   - 5 productos por partida, sorteados del pool de 100.
 *   - Se adivina el Puntaje Vokkado (0-100) con un control deslizante.
 *   - Puntos por producto = max(0, 100 - |guess - real| * 2), tope 100.
 *   - Total máximo 500. Desempate por tiempo total, y después por orden de llegada.
 *   - Los comodines (productos con alcohol) no puntúan: son un producto extra.
 */

export interface Product {
  id: string;
  name: string;
  brand: string | null;
  category: string;
  score: number;
  image: string;
  quota: string;
  justification: string;
  breakdown: { label: string; value: number }[];
  excesses: { name: string; value: number; unit: string }[];
  beneficials: { name: string; value: number; unit: string }[];
}

export interface Player {
  nombre: string;
  apellido: string;
  email: string;
  /** Opcional: para contactar ganadores si el email no responde. */
  telefono: string;
  profesion: string;
  consent: boolean;
}

export interface Round {
  productId: string;
  guess: number;
  realScore: number;
  points: number;
  ms: number;
}

/**
 * Parte el nombre completo por el **primer** espacio: la primera palabra es el
 * nombre y todo el resto el apellido.
 *
 * El formulario pide el nombre en un solo campo, pero `Player` los guarda
 * separados porque así los espera el CSV que exporta el admin y el schema de
 * la base de la fase 2.
 *
 * Es la lectura literal de "Nombre y apellido", y la que mejor funciona acá:
 * los apellidos dobles son comunes ("Ana Rodríguez Pérez" → Ana / Rodríguez
 * Pérez, y la tabla muestra "Ana R."). El caso que no resuelve bien es el
 * nombre compuesto ("María del Carmen Pérez" → María / del Carmen Pérez, y la
 * tabla muestra "María d."): se pierde prolijidad, no el dato — el nombre
 * completo se reconstruye siempre juntando las dos columnas del CSV.
 */
export function partirNombre(completo: string): { nombre: string; apellido: string } {
  const limpio = completo.trim().replace(/\s+/g, ' ');
  const corte = limpio.indexOf(' ');
  if (corte === -1) return { nombre: limpio, apellido: '' };
  return { nombre: limpio.slice(0, corte), apellido: limpio.slice(corte + 1) };
}

/** Cuántos productos tiene una partida. */
export const ROUNDS_PER_GAME = 5;

/** Segundos por producto antes de que el timer cierre la respuesta. */
export const SECONDS_PER_ROUND = 18;

/** Multiplicador de castigo por punto de error. Ver comentario en scoreGuess. */
const ERROR_PENALTY = 2;

export const MAX_POINTS_PER_ROUND = 100;
export const MAX_TOTAL = ROUNDS_PER_GAME * MAX_POINTS_PER_ROUND;

/**
 * Puntos de una respuesta.
 *
 * El castigo x2 es deliberado: entre nutricionistas casi todos caen cerca del
 * valor real, y con x1 se empataban cinco personas en el podio. Con x2, errar
 * por 15 puntos ya cuesta 30, que alcanza para ordenar el ranking.
 */
export function scoreGuess(guess: number, real: number): number {
  const error = Math.abs(guess - real);
  return Math.max(0, MAX_POINTS_PER_ROUND - error * ERROR_PENALTY);
}

/**
 * Color de la escala de puntaje.
 *
 * Mismos cortes que `getScoreColor` en `Frontend/src/components/ui/ProductCard.tsx`,
 * para que el jugador vea en el stand el mismo color que vería escaneando el
 * producto con la app. Si cambian allá, hay que cambiarlos acá.
 */
/**
 * Los 5 tramos de la escala, fuente única de verdad para el color Y el texto
 * que ve el jugador (la leyenda del ejemplo interactivo). `scoreColor` se
 * arma recorriendo esta misma tabla — así es imposible que la leyenda diga
 * un rango y el color real del juego use otro.
 */
export const ESCALA_PUNTAJE = [
  { desde: 0, hasta: 24, etiqueta: 'Malo', color: 'var(--vk-score-red)' },
  { desde: 25, hasta: 44, etiqueta: 'Regular', color: 'var(--vk-score-orange)' },
  { desde: 45, hasta: 64, etiqueta: 'Decente', color: 'var(--vk-score-yellow)' },
  { desde: 65, hasta: 84, etiqueta: 'Bueno', color: 'var(--vk-score-light-green)' },
  { desde: 85, hasta: 100, etiqueta: 'Excelente', color: 'var(--vk-score-green)' },
] as const;

/** El tramo de `ESCALA_PUNTAJE` al que pertenece un puntaje. */
export function tramoDe(score: number): (typeof ESCALA_PUNTAJE)[number] {
  for (let i = ESCALA_PUNTAJE.length - 1; i >= 0; i--) {
    if (score >= ESCALA_PUNTAJE[i].desde) return ESCALA_PUNTAJE[i];
  }
  return ESCALA_PUNTAJE[0];
}

export function scoreColor(score: number | null): string {
  if (score === null) return 'var(--vk-grey)';
  return tramoDe(score).color;
}

/** Etiqueta para la pantalla de resultado. */
export function feedbackFor(points: number): string {
  if (points >= 95) return '¡Clavado!';
  if (points >= 80) return 'Muy cerca';
  if (points >= 50) return 'Cerca';
  if (points >= 20) return 'Lejos';
  return 'Muy lejos';
}

/** Un producto "interesante": sorpresa o trampa saludable. */
function esInteresante(p: Product): boolean {
  return p.quota === 'sorpresa' || p.quota === 'trampa';
}

/** Cuántos interesantes lleva cada partida. Ni más ni menos: ver `pickRound`. */
export const INTERESANTES_POR_PARTIDA = 2;

/**
 * Sortea los productos de una partida.
 *
 * No es aleatorio puro, por dos motivos:
 *
 * 1. **Al menos dos "interesantes"** (sorpresa o trampa saludable). Con random
 *    uniforme, a alguien le tocaban cinco productos obvios y el juego perdía
 *    la gracia — que es justamente donde se genera la conversación en el stand.
 * 2. **No se repite categoría** dentro de una partida: la segunda respuesta
 *    sería una copia de la primera.
 *
 * `usados` son los productos que ya salieron en el ciclo actual y hay que
 * evitar. Normalmente esto se llama a través de `sortear()`, que lleva esa
 * cuenta; se exporta aparte porque es la parte fácil de testear.
 */
export function pickRound(
  pool: Product[],
  { usados = new Set<string>(), rng = Math.random }: { usados?: Set<string>; rng?: () => number } = {},
): Product[] {
  const frescos = pool.filter((p) => !usados.has(p.id));
  const picked: Product[] = [];

  const tomar = (de: Product[], n: number, conCategoria = true) => {
    for (const p of shuffle(de, rng)) {
      if (picked.length >= ROUNDS_PER_GAME || n <= 0) return;
      if (picked.some((x) => x.id === p.id)) continue;
      if (conCategoria && picked.some((x) => x.category === p.category)) continue;
      picked.push(p);
      n--;
    }
  };

  // Exactamente dos interesantes y tres del resto, siempre de la bolsa fresca.
  //
  // El "tres del resto" excluye a los interesantes a propósito. Antes se
  // completaba con cualquiera, y como son 44 de 100 caían de más: medido sobre
  // 20.000 partidas, el 45% traía 3 interesantes, el 30% traía 4 y el 5% traía
  // 5. Con premios de por medio eso es un problema de equidad — dos personas
  // competían por lo mismo con partidas de dificultad distinta. Ahora todas
  // las partidas tienen la misma mezcla, y de paso los dos grupos se consumen
  // a un ritmo parejo (2 y 3 por partida), así el ciclo aprovecha el pool
  // entero en vez de quedarse sin interesantes a mitad de camino.
  tomar(frescos.filter(esInteresante), INTERESANTES_POR_PARTIDA);
  tomar(
    frescos.filter((p) => !esInteresante(p)),
    ROUNDS_PER_GAME - picked.length,
  );

  // Redes de seguridad, en orden de menor a mayor concesión: primero cualquier
  // producto fresco, después el pool entero (acepta repetir uno del ciclo) y
  // por último sin el requisito de categoría (pool chico, o de una sola).
  tomar(frescos, ROUNDS_PER_GAME - picked.length);
  tomar(pool, ROUNDS_PER_GAME - picked.length);
  tomar(pool, ROUNDS_PER_GAME - picked.length, false);

  return picked.slice(0, ROUNDS_PER_GAME);
}

/**
 * Sorteo con bolsa: un producto no vuelve a salir hasta que se hayan usado
 * todos los demás.
 *
 * Sin esto, cada partida sorteaba de cero y la probabilidad hacía el resto:
 * medido sobre 20.000 partidas del pool real, **el 26% repetía algún producto
 * de la partida inmediatamente anterior y el 60% repetía alguno de las tres
 * anteriores**. En un stand con fila, donde la gente mira jugar al de adelante,
 * eso se lee como que el juego tiene cuatro productos.
 *
 * `yaSalieron` es la lista de ids del ciclo en curso; el llamador la persiste
 * y la vuelve a pasar. Cuando quedan menos productos que una partida, se da
 * vuelta la bolsa y arranca un ciclo nuevo — evitando en ese primer sorteo los
 * de la última partida, para que el corte de ciclo no se note.
 */
export function sortear(
  pool: Product[],
  yaSalieron: string[] = [],
  rng: () => number = Math.random,
): { ronda: Product[]; yaSalieron: string[] } {
  // Ids que ya no están en el pool (se regeneró la curación) no cuentan.
  const vigentes = yaSalieron.filter((id) => pool.some((p) => p.id === id));
  const usados = new Set(vigentes);
  const frescos = pool.filter((p) => !usados.has(p.id));

  // La bolsa se da vuelta cuando ya no puede armar una partida completa **con
  // su mezcla exacta**: hacen falta 2 interesantes y 3 del resto. No alcanza
  // con mirar cuántos productos quedan en total — con 8 interesantes y 2 del
  // resto sobran diez para una partida, pero la mezcla ya no sale y la ronda
  // terminaba trayendo 3 interesantes por la red de seguridad. Cortar acá es
  // lo que sostiene las dos promesas a la vez: dentro de un ciclo no se
  // repite ningún producto y todas las partidas tienen la misma mezcla.
  const interesantesFrescos = frescos.filter(esInteresante).length;
  const restoFresco = frescos.length - interesantesFrescos;
  const agotada =
    interesantesFrescos < INTERESANTES_POR_PARTIDA ||
    restoFresco < ROUNDS_PER_GAME - INTERESANTES_POR_PARTIDA;

  if (agotada) {
    // Ciclo nuevo. Se evitan sólo los de la última partida, y no quedan
    // marcados como usados: así el corte de ciclo no se nota y ninguno queda
    // castigado durante todo el ciclo siguiente.
    const ronda = pickRound(pool, { usados: new Set(vigentes.slice(-ROUNDS_PER_GAME)), rng });
    return { ronda, yaSalieron: ronda.map((p) => p.id) };
  }

  const ronda = pickRound(pool, { usados, rng });
  return { ronda, yaSalieron: [...vigentes, ...ronda.map((p) => p.id)] };
}

/** Fisher-Yates con rng inyectable, para poder testear con semilla fija. */
export function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function totalPoints(rounds: Round[]): number {
  return rounds.reduce((sum, r) => sum + r.points, 0);
}

export function totalMs(rounds: Round[]): number {
  return rounds.reduce((sum, r) => sum + r.ms, 0);
}

export interface LeaderboardEntry {
  email: string;
  nombre: string;
  apellido: string;
  points: number;
  ms: number;
  playedAt: number;
}

/**
 * Ordena el ranking. Hay premios de por medio, así que el criterio tiene que ser
 * determinístico y explicable: puntos, después tiempo, después quién jugó primero.
 */
export function rankPlayers(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries].sort(
    (a, b) => b.points - a.points || a.ms - b.ms || a.playedAt - b.playedAt,
  );
}
