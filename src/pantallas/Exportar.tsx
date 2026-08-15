import { useEffect, useState } from 'react';
import { allGames, downloadCsv, type StoredGame } from '../game/storage';
import { Encabezado } from '../componentes/Encabezado';

/**
 * Ruta oculta (`/exportar`), sin link ni botón en ningún lado de la UI: es
 * sólo para el equipo del stand. El CSV que arma trae datos de contacto
 * privados (email, teléfono) — no puede estar a un toque de cualquier
 * jugador, así que no aparece ni en Inicio ni en el Scoreboard.
 *
 * Lee `allGames()` de ESTE dispositivo: es un respaldo local, no la tabla
 * remota. Si el stand juega con más de un iPad, hay que entrar acá en cada
 * uno para tener el respaldo completo.
 */
export function Exportar({ onVolver }: { onVolver: () => void }) {
  const [games, setGames] = useState<StoredGame[] | null>(null);

  useEffect(() => {
    allGames().then(setGames);
  }, []);

  const pendientes = games?.filter((g) => !g.synced).length ?? 0;

  return (
    <>
      <Encabezado titulo="Respaldo local" onVolver={onVolver} />
      <div className="pantalla">
        {games === null ? (
          <p className="sub">Leyendo…</p>
        ) : (
          <>
            <p className="sub">
              {games.length === 0
                ? 'Todavía no hay partidas guardadas en este dispositivo.'
                : `${games.length} ${games.length === 1 ? 'partida guardada' : 'partidas guardadas'} en este dispositivo` +
                  (pendientes > 0
                    ? `, ${pendientes} todavía ${pendientes === 1 ? 'no subió' : 'no subieron'} al servidor.`
                    : ', todas subidas al servidor.')}
            </p>

            <button
              className="primario grande"
              disabled={games.length === 0}
              onClick={() => downloadCsv(games)}
            >
              Descargar CSV
            </button>
          </>
        )}
      </div>
    </>
  );
}
