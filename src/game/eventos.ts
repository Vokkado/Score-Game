/**
 * Llamadas para administrar eventos desde la ruta oculta `/eventos`.
 *
 * A diferencia de `sync.ts`, acá no hay offline-first: es una pantalla del
 * equipo, no del jugador, y sin red no hay nada útil que hacer. Los errores
 * se propagan con el mensaje del backend para mostrarlos tal cual.
 */

export interface Evento {
  id: string;
  nombre: string;
  /** YYYY-MM-DD */
  fecha: string;
  mostrando: boolean;
  partidas: number;
}

async function pedir<T>(ruta: string, init?: RequestInit): Promise<T> {
  const base = import.meta.env.VITE_API_URL;
  if (!base) throw new Error('Falta VITE_API_URL: no hay backend configurado.');

  let res: Response;
  try {
    res = await fetch(`${base}/api/event-game${ruta}`, {
      ...init,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    throw new Error('Sin conexión con el servidor.');
  }
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.message ?? `Error ${res.status}`);
  return json?.data as T;
}

export const listarEventos = () => pedir<Evento[]>('/events');

export const crearEvento = (nombre: string, fecha: string) =>
  pedir<Evento>('/events', { method: 'POST', body: JSON.stringify({ nombre, fecha }) });

export const mostrarEvento = (id: string) =>
  pedir<void>(`/events/${id}/mostrar`, { method: 'PUT' });
