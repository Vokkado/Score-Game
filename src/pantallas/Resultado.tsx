import { useEffect, useState } from 'react';
import type { Player, Round } from '../game/engine';
import { totalPoints, totalMs, rankPlayers, MAX_TOTAL, type LeaderboardEntry } from '../game/engine';
import { allGames } from '../game/storage';

interface Props {
  rounds: Round[];
  player: Player;
  onSeguir: () => void;
}

const PREMIOS = ['🦘', '👕'];

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
  const top = tabla.slice(0, 5);
  const estoyEnTop = top.some((e) => e.email === player.email);

  return (
    <div className="pantalla">
      <h1>Tu resultado</h1>
      <div className="total">{puntos}</div>
      <p className="sub" style={{ textAlign: 'center' }}>
        de {MAX_TOTAL} puntos · {Math.round(ms / 1000)} segundos
      </p>

      {puesto > 0 && (
        <p className="sub" style={{ textAlign: 'center', fontSize: 22, color: 'var(--verde)' }}>
          Vas <strong>{puesto}º</strong> de {tabla.length}
        </p>
      )}

      <h2>Ranking del día</h2>
      <div style={{ marginBottom: 20 }}>
        {top.map((e, i) => (
          <div key={e.email} className={`fila-ranking ${e.email === player.email ? 'yo' : ''}`}>
            <span className="puesto">{i + 1}º</span>
            <span className="quien">
              {e.nombre} {e.apellido.charAt(0)}.
            </span>
            {PREMIOS[i] && <span className="premio">{PREMIOS[i]}</span>}
            <span className="pts">{e.points}</span>
          </div>
        ))}

        {!estoyEnTop && puesto > 0 && (
          <div className="fila-ranking yo">
            <span className="puesto">{puesto}º</span>
            <span className="quien">
              {player.nombre} {player.apellido.charAt(0)}.
            </span>
            <span className="pts">{puntos}</span>
          </div>
        )}
      </div>

      <div className="espaciador" />

      <button className="primario" onClick={onSeguir}>
        Última pregunta y listo
      </button>
    </div>
  );
}
