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
 */
export async function cargarTabla(): Promise<LeaderboardEntry[]> {
  const remoto = await fetchLeaderboard();
  if (remoto) return rankPlayers(remoto);

  const locales = await allGames();
  return rankPlayers(desdeLocal(locales));
}
