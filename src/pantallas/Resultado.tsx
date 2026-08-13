import { useEffect, useState } from 'react';
import type { Player, Round } from '../game/engine';
import { totalPoints, totalMs, rankPlayers, MAX_TOTAL, type LeaderboardEntry } from '../game/engine';
import { allGames } from '../game/storage';
import { TablaPosiciones } from '../componentes/TablaPosiciones';

interface Props {
  rounds: Round[];
  player: Player;
  onSeguir: () => void;
}

export function Resultado({ rounds, player, onSeguir }: Props) {
  const puntos = totalPoints(rounds);
  const ms = totalMs(rounds);
  const [tabla, setTabla] = useState<LeaderboardEntry[]>([]);

  // La partida actual todavía no está guardada (se guarda al final de la
  // encuesta), así que se la agrega a mano para mostrar el puesto real.
  useEffect(() => {
    allGames().then((games) => {
      const mia: LeaderboardEntry = {
        email: player.email,
        nombre: player.nombre,
        apellido: player.apellido,
        points: puntos,
        ms,
        playedAt: Date.now(),
      };
      const previas = games.map((g) => ({
        email: g.email,
        nombre: g.nombre,
        apellido: g.apellido,
        points: g.points,
        ms: g.ms,
        playedAt: g.playedAt,
      }));
      setTabla(rankPlayers([...previas, mia]));
    });
  }, [player, puntos, ms]);

  const puesto = tabla.findIndex((e) => e.email === player.email) + 1;
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

      <TablaPosiciones
        entradas={tabla}
        emailPropio={player.email}
        puestoPropio={puesto}
      />

      <div className="espaciador" />

      <button className="primario" onClick={onSeguir}>
        Última pregunta y listo
      </button>
    </div>
  );
}
