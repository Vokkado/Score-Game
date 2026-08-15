import { describe, it, expect } from 'vitest';
import {
  scoreGuess,
  scoreColor,
  tramoDe,
  ESCALA_PUNTAJE,
  pickRound,
  sortear,
  rankPlayers,
  totalPoints,
  shuffle,
  partirNombre,
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

describe('tramoDe / ESCALA_PUNTAJE', () => {
  // scoreColor se arma recorriendo ESCALA_PUNTAJE, así que estos tests son la
  // garantía real de que la leyenda de la pantalla de inicio (rangos + texto)
  // nunca puede quedar desincronizada del color que usa el resto del juego.
  it('cubre 0-100 sin huecos ni superposiciones', () => {
    expect(ESCALA_PUNTAJE[0].desde).toBe(0);
    expect(ESCALA_PUNTAJE[ESCALA_PUNTAJE.length - 1].hasta).toBe(100);
    for (let i = 1; i < ESCALA_PUNTAJE.length; i++) {
      expect(ESCALA_PUNTAJE[i].desde).toBe(ESCALA_PUNTAJE[i - 1].hasta + 1);
    }
  });

  it('devuelve el tramo correcto en cada borde', () => {
    expect(tramoDe(0).etiqueta).toBe('Malo');
    expect(tramoDe(24).etiqueta).toBe('Malo');
    expect(tramoDe(25).etiqueta).toBe('Regular');
    expect(tramoDe(44).etiqueta).toBe('Regular');
    expect(tramoDe(45).etiqueta).toBe('Decente');
    expect(tramoDe(64).etiqueta).toBe('Decente');
    expect(tramoDe(65).etiqueta).toBe('Bueno');
    expect(tramoDe(84).etiqueta).toBe('Bueno');
    expect(tramoDe(85).etiqueta).toBe('Excelente');
    expect(tramoDe(100).etiqueta).toBe('Excelente');
  });

  it('el color de cada tramo coincide con scoreColor en todo el rango', () => {
    for (const t of ESCALA_PUNTAJE) {
      expect(scoreColor(t.desde)).toBe(t.color);
      expect(scoreColor(t.hasta)).toBe(t.color);
    }
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
  const entry = (id: string, points: number, ms: number, playedAt: number): LeaderboardEntry => ({
    id,
    nombre: 'N',
    apellido: 'A',
    points,
    ms,
    playedAt,
  });

  it('ordena por puntos descendente', () => {
    const r = rankPlayers([entry('a', 300, 1000, 1), entry('b', 450, 9000, 2)]);
    expect(r[0].id).toBe('b');
  });

  it('desempata por tiempo total', () => {
    const r = rankPlayers([entry('lento', 400, 9000, 1), entry('rapido', 400, 3000, 2)]);
    expect(r[0].id).toBe('rapido');
  });

  it('desempata por orden de llegada cuando puntos y tiempo son iguales', () => {
    const r = rankPlayers([entry('segundo', 400, 5000, 99), entry('primero', 400, 5000, 1)]);
    expect(r[0].id).toBe('primero');
  });

  it('no muta el array original', () => {
    const original = [entry('a', 100, 1, 1), entry('b', 500, 1, 2)];
    rankPlayers(original);
    expect(original[0].id).toBe('a');
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

describe('partirNombre', () => {
  it('parte por el primer espacio', () => {
    expect(partirNombre('Ana Pérez')).toEqual({ nombre: 'Ana', apellido: 'Pérez' });
  });

  it('el apellido doble queda entero', () => {
    expect(partirNombre('Ana Rodríguez Pérez')).toEqual({
      nombre: 'Ana',
      apellido: 'Rodríguez Pérez',
    });
  });

  it('sin apellido devuelve el apellido vacío, no el nombre repetido', () => {
    expect(partirNombre('Ana')).toEqual({ nombre: 'Ana', apellido: '' });
  });

  it('normaliza espacios de más y de los bordes', () => {
    expect(partirNombre('  Ana   Pérez  ')).toEqual({ nombre: 'Ana', apellido: 'Pérez' });
  });

  it('con la cadena vacía no rompe', () => {
    expect(partirNombre('   ')).toEqual({ nombre: '', apellido: '' });
  });
});

describe('sortear (bolsa)', () => {
  // Pool grande y variado, como el real: 40 productos en 40 categorías.
  const grande: Product[] = Array.from({ length: 40 }, (_, i) =>
    product(`p${i}`, i % 2 === 0 ? 'sorpresa' : 'medio', `cat${i}`),
  );

  it('no repite ningún producto mientras quede bolsa', () => {
    // 20 interesantes y 20 del resto, consumidos de a 2 y 3: el corte llega
    // cuando se acaban los del resto, a las 6 partidas (30 productos).
    let bolsa: string[] = [];
    const vistos: string[] = [];
    for (let i = 0; i < 6; i++) {
      const r = sortear(grande, bolsa);
      vistos.push(...r.ronda.map((p) => p.id));
      bolsa = r.yaSalieron;
    }
    expect(vistos).toHaveLength(30);
    expect(new Set(vistos).size).toBe(30);
  });

  it('cada partida trae exactamente dos interesantes, no entre dos y cinco', () => {
    let bolsa: string[] = [];
    for (let i = 0; i < 30; i++) {
      const r = sortear(grande, bolsa);
      const n = r.ronda.filter((p) => p.quota === 'sorpresa' || p.quota === 'trampa').length;
      expect(n).toBe(2);
      bolsa = r.yaSalieron;
    }
  });

  it('da vuelta la bolsa cuando se agota, sin devolver partidas cortas', () => {
    let bolsa: string[] = [];
    for (let i = 0; i < 30; i++) {
      const r = sortear(grande, bolsa);
      expect(r.ronda).toHaveLength(ROUNDS_PER_GAME);
      bolsa = r.yaSalieron;
    }
  });

  it('al dar vuelta la bolsa no repite la partida inmediatamente anterior', () => {
    // Con 10 productos, la bolsa se agota cada 2 partidas: el corte de ciclo
    // pasa todo el tiempo y es justo donde se notaría un repetido.
    const chico: Product[] = Array.from({ length: 10 }, (_, i) =>
      product(`c${i}`, i % 2 === 0 ? 'sorpresa' : 'medio', `cat${i}`),
    );
    let bolsa: string[] = [];
    let previa: string[] = [];
    for (let i = 0; i < 40; i++) {
      const r = sortear(chico, bolsa);
      const ids = r.ronda.map((p) => p.id);
      expect(ids.filter((id) => previa.includes(id))).toEqual([]);
      previa = ids;
      bolsa = r.yaSalieron;
    }
  });

  it('ignora ids que ya no están en el pool (se regeneró la curación)', () => {
    const r = sortear(grande, ['fantasma-1', 'fantasma-2']);
    expect(r.ronda).toHaveLength(ROUNDS_PER_GAME);
    expect(r.yaSalieron).not.toContain('fantasma-1');
  });

  it('sigue respetando el mínimo de dos interesantes', () => {
    let bolsa: string[] = [];
    for (let i = 0; i < 30; i++) {
      const r = sortear(grande, bolsa);
      const interesantes = r.ronda.filter(
        (p) => p.quota === 'sorpresa' || p.quota === 'trampa',
      );
      expect(interesantes.length).toBeGreaterThanOrEqual(2);
      bolsa = r.yaSalieron;
    }
  });
});
