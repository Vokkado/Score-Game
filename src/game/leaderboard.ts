import { rankPlayers, type LeaderboardEntry } from './engine';
import { allGames, type StoredGame } from './storage';
import { fetchLeaderboard } from './sync';

function desdeLocal(games: StoredGame[]): LeaderboardEntry[] {
  return games.map((g) => ({
    id: g.id,
    nombre: g.nombre,
    apellido: g.apellido,
    points: g.points,
    ms: g.ms,
    playedAt: g.playedAt,
  }));
}

/**
 * Tabla de posiciones: intenta la base primero (ve a todos los dispositivos,
 * no sólo este navegador), y si no hay red o el backend no está configurado
 * cae a IndexedDB local. El local queda como red de seguridad — es lo único
 * que sigue andando con el iPad en modo avión.
 *
 * **Con la base disponible, igual se suma lo pendiente de este dispositivo.**
 * "Disponible" no es lo mismo que "completa": el fetch puede tener éxito
 * mientras una partida puntual de este navegador no llegó a subirse (el
 * `syncGame` de esa partida falló por su cuenta, o el reintento de fondo
 * todavía no le tocó). Sin este merge esa partida queda invisible mientras
 * el resto de la red ande bien — nadie se entera hasta que se corte todo.
 * Se compara por `id` (el mismo en IndexedDB y en el backend) para no
 * duplicar la fila una vez que el sync termine de subirla.
 */
export async function cargarTabla(): Promise<LeaderboardEntry[]> {
  const remoto = await fetchLeaderboard();
  if (!remoto) {
    const locales = await allGames();
    return rankPlayers(desdeLocal(locales));
  }

  const locales = await allGames();
  const idsRemotos = new Set(remoto.map((e) => e.id));
  const pendientes = locales.filter((g) => !g.synced && !idsRemotos.has(g.id));
  return rankPlayers([...remoto, ...desdeLocal(pendientes)]);
}
