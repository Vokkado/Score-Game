import type { StoredGame } from './storage';

const TIMEOUT_MS = 6000; // wifi de evento: no vale la pena esperar más antes de resignarse

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
