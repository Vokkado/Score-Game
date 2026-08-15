import type { StoredGame } from './storage';
import type { LeaderboardEntry } from './engine';

const TIMEOUT_MS = 6000; // wifi de evento: no vale la pena esperar más antes de resignarse
// Esto sí bloquea lo que se ve en pantalla (la tabla no se pinta hasta que
// resuelve), a diferencia de syncGame que corre en segundo plano. Un timeout
// largo acá se siente como que el juego se colgó.
const TIMEOUT_LECTURA_MS = 3000;

/**
 * Intenta subir una partida al backend. Falla en silencio ante cualquier
 * problema de red: el offline-first del juego no es negociable, IndexedDB
 * sigue siendo la fuente de verdad si esto no funciona.
 */
export async function syncGame(game: StoredGame): Promise<boolean> {
  const base = import.meta.env.VITE_API_URL;
  if (!base) return false;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const { synced, ...payload } = game;
    const res = await fetch(`${base}/api/event-game/games`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    // 200/201 éxito (incluye reintento idempotente). 409 = email duplicado,
    // conflicto de negocio permanente, no de red: no tiene sentido reintentarlo
    // en loop, se trata como resuelto para no llenar la cola de pendingSync.
    return res.ok || res.status === 409;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Trae la tabla de posiciones del backend (todos los dispositivos, no sólo
 * este navegador). `null` ante cualquier problema — sin red, sin backend
 * configurado, respuesta no-2xx — para que quien llama sepa que tiene que
 * caer a IndexedDB local en vez de mostrar una tabla vacía por error.
 */
export async function fetchLeaderboard(): Promise<LeaderboardEntry[] | null> {
  const base = import.meta.env.VITE_API_URL;
  if (!base) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_LECTURA_MS);
  try {
    const res = await fetch(`${base}/api/event-game/leaderboard`, { signal: controller.signal });
    if (!res.ok) return null;
    const json = await res.json();
    return Array.isArray(json?.data) ? (json.data as LeaderboardEntry[]) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
