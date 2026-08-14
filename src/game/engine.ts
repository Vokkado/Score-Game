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

export interface Wildcard {
  id: string;
  name: string;
  brand: string | null;
  /** Nombre de archivo dentro de public/products, ya con su extensión. */
  image: string;
  alcohol_graduation: number;
  explanation: string;
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

/**
 * Sortea los productos de una partida.
 *
 * No es aleatorio puro: se fuerza que al menos dos sean "sorpresa" o "trampa
 * saludable". Con random uniforme, a alguien le tocaban cinco productos obvios
 * y el juego perdía toda la gracia — que es justamente donde se genera la
 * conversación en el stand.
 */
export function pickRound(pool: Product[], rng: () => number = Math.random): Product[] {
  const interesting = pool.filter((p) => p.quota === 'sorpresa' || p.quota === 'trampa');
  const rest = pool.filter((p) => p.quota !== 'sorpresa' && p.quota !== 'trampa');

  const picked: Product[] = [];
  const take = (from: Product[], n: number) => {
    const bag = shuffle(from, rng);
    for (const p of bag) {
      if (picked.length >= ROUNDS_PER_GAME) return;
      if (n <= 0) return;
      if (picked.some((x) => x.id === p.id)) continue;
      // Nunca dos productos de la misma categoría en la misma partida: repetir
      // categoría hace que la segunda respuesta sea una copia de la primera.
      if (picked.some((x) => x.category === p.category)) continue;
      picked.push(p);
      n--;
    }
  };

  take(interesting, 2);
  take(shuffle([...interesting, ...rest], rng), ROUNDS_PER_GAME - picked.length);

  // Red de seguridad: si el filtro de categoría dejó la partida corta (pool
  // chico o muchas categorías repetidas), se completa sin ese requisito.
  if (picked.length < ROUNDS_PER_GAME) {
    for (const p of shuffle(pool, rng)) {
      if (picked.length >= ROUNDS_PER_GAME) break;
      if (!picked.some((x) => x.id === p.id)) picked.push(p);
    }
  }

  return picked.slice(0, ROUNDS_PER_GAME);
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
