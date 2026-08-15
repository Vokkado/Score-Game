/**
 * Persistencia local. IndexedDB nativo, sin librerías.
 *
 * El iPad tiene que poder jugar con la red caída, así que esta capa es la fuente
 * de verdad durante el evento: toda partida se guarda acá primero y recién
 * después se intenta subir. Si el backend no responde, queda en cola.
 */

const DB_NAME = 'vokkado-score-game';
const DB_VERSION = 1;
const STORE_GAMES = 'games';

/**
 * Las respuestas de la encuesta final. Las tres escalas van del 1 al 10 y hoy
 * son obligatorias, pero el tipo las deja anulables porque **las partidas
 * guardadas antes del 2026-08-14 no tienen `gusta` ni `utilidad`** — y el CSV
 * y la tabla tienen que poder leerlas igual.
 */
export interface Survey {
  /** Cuánto le gusta Vokkado. */
  gusta: number | null;
  /** Qué tan probable es que lo recomiende (el NPS de siempre). */
  nps: number | null;
  /** Qué tan útil le resulta la herramienta para nutricionistas. */
  utilidad: number | null;
  comentario: string;
}

export interface StoredGame {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  telefono: string;
  profesion: string;
  consent: boolean;
  points: number;
  ms: number;
  playedAt: number;
  rounds: { productId: string; guess: number; realScore: number; points: number; ms: number }[];
  survey: Survey | null;
  /** false mientras no se haya confirmado la subida al backend. */
  synced: boolean;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_GAMES)) {
        const store = db.createObjectStore(STORE_GAMES, { keyPath: 'id' });
        // Un intento por email: el índice hace la validación local barata.
        store.createIndex('email', 'email', { unique: true });
        store.createIndex('synced', 'synced', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE_GAMES, mode);
        const req = fn(t.objectStore(STORE_GAMES));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        t.oncomplete = () => db.close();
      }),
  );
}

export async function saveGame(game: StoredGame): Promise<void> {
  await tx('readwrite', (s) => s.put(game));
}

export async function allGames(): Promise<StoredGame[]> {
  const games = await tx<StoredGame[]>('readonly', (s) => s.getAll());
  return games;
}

/**
 * Busca una partida ya jugada por ese email. Hay premios de por medio, así que
 * un intento por persona. El servidor valida lo mismo cuando hay red: esto es
 * sólo la primera barrera, la que funciona sin conexión.
 */
export async function findByEmail(email: string): Promise<StoredGame | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE_GAMES, 'readonly');
    const req = t.objectStore(STORE_GAMES).index('email').get(email.trim().toLowerCase());
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
    t.oncomplete = () => db.close();
  });
}

/**
 * La bolsa del sorteo: qué productos ya salieron en el ciclo en curso.
 *
 * Va en `localStorage` y no en IndexedDB a propósito: se lee de forma
 * sincrónica justo cuando arranca la partida, y perderla no rompe nada —
 * el peor caso es que la bolsa empiece de nuevo. Tiene que sobrevivir a que
 * alguien recargue la app en pleno evento, que es lo único que importa.
 */
const CLAVE_BOLSA = 'vokkado-score-game:bolsa';

export function leerBolsa(): string[] {
  try {
    const crudo = localStorage.getItem(CLAVE_BOLSA);
    const ids: unknown = crudo ? JSON.parse(crudo) : [];
    return Array.isArray(ids) ? ids.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    // Modo privado de Safari, cuota llena o JSON corrupto: la bolsa arranca
    // vacía y el juego sigue. No vale la pena romper una partida por esto.
    return [];
  }
}

export function guardarBolsa(ids: string[]): void {
  try {
    localStorage.setItem(CLAVE_BOLSA, JSON.stringify(ids));
  } catch {
    /* ídem */
  }
}

export async function pendingSync(): Promise<StoredGame[]> {
  const games = await allGames();
  return games.filter((g) => !g.synced);
}

/**
 * Exporta todo a CSV. Es la red de seguridad del evento: si el iPad se resetea
 * o IndexedDB se vacía, lo único que queda son los CSV que se hayan bajado.
 * Conviene exportar cada hora durante el stand.
 */
export function toCsv(games: StoredGame[]): string {
  // Este CSV lo abre gente del equipo, no un sistema: las cabeceras van en
  // español igual que todo lo que se ve en el evento.
  const headers = [
    'nombre', 'apellido', 'correo', 'telefono', 'profesion', 'acepta_novedades',
    'puntos', 'segundos', 'fecha',
    'le_gusta_1_10', 'recomendacion_1_10', 'utilidad_1_10',
    'comentario', 'sincronizado',
  ];
  const esc = (v: unknown) => {
    const s = String(v ?? '');
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = games.map((g) =>
    [
      g.nombre, g.apellido, g.email, g.telefono, g.profesion, g.consent ? 'sí' : 'no',
      g.points, Math.round(g.ms / 1000), new Date(g.playedAt).toISOString(),
      g.survey?.gusta ?? '', g.survey?.nps ?? '', g.survey?.utilidad ?? '',
      g.survey?.comentario ?? '', g.synced ? 'sí' : 'no',
    ].map(esc).join(';'),
  );
  return '﻿' + headers.join(';') + '\n' + rows.join('\n') + '\n';
}

export function downloadCsv(games: StoredGame[]): void {
  const blob = new Blob([toCsv(games)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `score-game-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
