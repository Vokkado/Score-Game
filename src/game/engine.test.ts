import { describe, it, expect } from 'vitest';
import {
  scoreGuess,
  scoreColor,
  demoLabel,
  pickRound,
  rankPlayers,
  totalPoints,
  shuffle,
  MAX_POINTS_PER_ROUND,
  ROUNDS_PER_GAME,
  type Product,
  type LeaderboardEntry,
} from './engine';

const product = (id: string, quota: string, category: string): Product => ({
  id,
  name: `Producto ${id}`,
  brand: 'Marca',
  category,
  score: 50,
  image: `${id}.jpg`,
  quota,
  justification: '...',
  breakdown: [],
  excesses: [],
  beneficials: [],
});

describe('scoreGuess', () => {
  it('da el máximo cuando la respuesta es exacta', () => {
    expect(scoreGuess(42, 42)).toBe(MAX_POINTS_PER_ROUND);
  });

  it('castiga el doble del error', () => {
    expect(scoreGuess(50, 40)).toBe(80);
    expect(scoreGuess(30, 40)).toBe(80);
  });

  it('nunca devuelve negativo aunque el error sea máximo', () => {
    expect(scoreGuess(0, 100)).toBe(0);
    expect(scoreGuess(100, 0)).toBe(0);
  });

  it('llega a cero a partir de 50 puntos de error', () => {
    expect(scoreGuess(50, 0)).toBe(0);
    expect(scoreGuess(49, 0)).toBe(2);
  });
});

describe('scoreColor', () => {
  // Los cortes son los de ProductCard.getScoreColor en la app. Si estos tests
  // fallan es porque alguien movió la escala en un solo lado.
  it('respeta los cortes de la escala de la app', () => {
    expect(scoreColor(100)).toBe('var(--vk-score-green)');
    expect(scoreColor(85)).toBe('var(--vk-score-green)');
    expect(scoreColor(84)).toBe('var(--vk-score-light-green)');
    expect(scoreColor(65)).toBe('var(--vk-score-light-green)');
    expect(scoreColor(64)).toBe('var(--vk-score-yellow)');
    expect(scoreColor(45)).toBe('var(--vk-score-yellow)');
    expect(scoreColor(44)).toBe('var(--vk-score-orange)');
    expect(scoreColor(25)).toBe('var(--vk-score-orange)');
    expect(scoreColor(24)).toBe('var(--vk-score-red)');
    expect(scoreColor(0)).toBe('var(--vk-score-red)');
  });

  it('devuelve gris cuando no hay puntaje (comodines con alcohol)', () => {
    expect(scoreColor(null)).toBe('var(--vk-grey)');
  });
});

describe('demoLabel', () => {
  // Mismos cortes que scoreColor (45/65), agrupados de 5 a 3: el ejemplo
  // interactivo del inicio y el resto del juego nunca deberían contradecirse.
  it('coincide con los cortes de scoreColor', () => {
    expect(demoLabel(0)).toBe('Mal producto');
    expect(demoLabel(44)).toBe('Mal producto');
    expect(demoLabel(45)).toBe('Decente');
    expect(demoLabel(64)).toBe('Decente');
    expect(demoLabel(65)).toBe('Saludable');
    expect(demoLabel(100)).toBe('Saludable');
  });
});

describe('pickRound', () => {
  const pool: Product[] = [
    ...Array.from({ length: 8 }, (_, i) => product(`s${i}`, 'sorpresa', `catS${i}`)),
    ...Array.from({ length: 8 }, (_, i) => product(`t${i}`, 'trampa', `catT${i}`)),
    ...Array.from({ length: 8 }, (_, i) => product(`a${i}`, 'ancla_mala', `catA${i}`)),
  ];

  it('devuelve exactamente la cantidad de rondas', () => {
    expect(pickRound(pool)).toHaveLength(ROUNDS_PER_GAME);
  });

  it('nunca repite producto', () => {
    for (let i = 0; i < 200; i++) {
      const ids = pickRound(pool).map((p) => p.id);
      expect(new Set(ids).size).toBe(ROUNDS_PER_GAME);
    }
  });

  it('incluye al menos dos productos interesantes', () => {
    for (let i = 0; i < 200; i++) {
      const interesting = pickRound(pool).filter(
        (p) => p.quota === 'sorpresa' || p.quota === 'trampa',
      );
      expect(interesting.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('no repite categoría cuando el pool lo permite', () => {
    for (let i = 0; i < 100; i++) {
      const cats = pickRound(pool).map((p) => p.category);
      expect(new Set(cats).size).toBe(ROUNDS_PER_GAME);
    }
  });

  it('completa la partida aunque el pool tenga una sola categoría', () => {
    const flat = Array.from({ length: 6 }, (_, i) => product(`x${i}`, 'medio', 'unica'));
    expect(pickRound(flat)).toHaveLength(ROUNDS_PER_GAME);
  });
});

describe('rankPlayers', () => {
  const entry = (email: string, points: number, ms: number, playedAt: number): LeaderboardEntry => ({
    email,
    nombre: 'N',
    apellido: 'A',
    points,
    ms,
    playedAt,
  });

  it('ordena por puntos descendente', () => {
    const r = rankPlayers([entry('a', 300, 1000, 1), entry('b', 450, 9000, 2)]);
    expect(r[0].email).toBe('b');
  });

  it('desempata por tiempo total', () => {
    const r = rankPlayers([entry('lento', 400, 9000, 1), entry('rapido', 400, 3000, 2)]);
    expect(r[0].email).toBe('rapido');
  });

  it('desempata por orden de llegada cuando puntos y tiempo son iguales', () => {
    const r = rankPlayers([entry('segundo', 400, 5000, 99), entry('primero', 400, 5000, 1)]);
    expect(r[0].email).toBe('primero');
  });

  it('no muta el array original', () => {
    const original = [entry('a', 100, 1, 1), entry('b', 500, 1, 2)];
    rankPlayers(original);
    expect(original[0].email).toBe('a');
  });
});

describe('totalPoints', () => {
  it('suma las rondas', () => {
    const rounds = [80, 100, 0, 44, 60].map((points) => ({
      productId: 'x',
      guess: 1,
      realScore: 1,
      points,
      ms: 0,
    }));
    expect(totalPoints(rounds)).toBe(284);
  });
});

describe('shuffle', () => {
  it('conserva todos los elementos', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(shuffle(arr).sort()).toEqual(arr);
  });

  it('no muta el original', () => {
    const arr = [1, 2, 3, 4, 5];
    shuffle(arr);
    expect(arr).toEqual([1, 2, 3, 4, 5]);
  });
});
