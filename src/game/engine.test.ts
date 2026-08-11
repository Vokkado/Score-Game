import { describe, it, expect } from 'vitest';
import {
  scoreGuess,
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
