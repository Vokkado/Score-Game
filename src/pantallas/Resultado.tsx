import { useEffect, useState } from 'react';
import type { Player, Round } from '../game/engine';
import { totalPoints, totalMs, rankPlayers, MAX_TOTAL, type LeaderboardEntry } from '../game/engine';
import { cargarTabla } from '../game/leaderboard';
import { TablaPosiciones } from '../componentes/TablaPosiciones';

interface Props {
  rounds: Round[];
  player: Player;
  /** Id de la partida en curso — todavía no está guardada ni sincronizada. */
  gameId: string;
  onSeguir: () => void;
}

export function Resultado({ rounds, player, gameId, onSeguir }: Props) {
  const puntos = totalPoints(rounds);
  const ms = totalMs(rounds);
  const [tabla, setTabla] = useState<LeaderboardEntry[]>([]);
  const [cargando, setCargando] = useState(true);

  // La partida actual todavía no está guardada (se guarda al final de la
  // encuesta), así que se la agrega a mano para mostrar el puesto real.
  useEffect(() => {
    cargarTabla().then((previas) => {
      const mia: LeaderboardEntry = {
        id: gameId,
        nombre: player.nombre,
        apellido: player.apellido,
        points: puntos,
        ms,
        playedAt: Date.now(),
      };
      setTabla(rankPlayers([...previas, mia]));
      setCargando(false);
    });
  }, [player, puntos, ms, gameId]);

  const puesto = tabla.findIndex((e) => e.id === gameId) + 1;
  const aciertos = rounds.filter((r) => r.points >= 80).length;

  return (
    <div className="pantalla">
      <h1>Tu resultado</h1>
      <div className="total">{puntos}</div>
      <p className="de-total">
        de {MAX_TOTAL} puntos · {Math.round(ms / 1000)} segundos ·{' '}
        {aciertos} de {rounds.length} muy cerca
      </p>

      {puesto > 0 && (
        <p className="mi-puesto">
          Vas <strong>{puesto}º</strong> de {tabla.length}
        </p>
      )}

      {/* El botón va antes de la tabla, igual que el CTA de Inicio: la tabla
          ahora muestra a todos los jugadores y crece sola durante el evento —
          dejarlo abajo obligaría a scrollear una lista larga para terminar. */}
      {/* "Última pregunta y listo" sonaba a trámite y no decía qué pasaba al
          tocarlo. Éste dice qué se gana con seguir, que es lo que hace que
          alguien no abandone justo acá. */}
      <button className="primario grande boton-respira" onClick={onSeguir}>
        Registrar mi puntaje
      </button>

      <div className="separador-tabla" />

      <TablaPosiciones entradas={tabla} idPropio={gameId} cargando={cargando} />
    </div>
  );
}
