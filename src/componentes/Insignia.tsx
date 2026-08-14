import { scoreColor } from '../game/engine';

/**
 * Insignia de puntaje. Réplica de `ScoreBadge` del Frontend: círculo relleno
 * con el color de la escala y el número en blanco. Es la forma en que la app
 * muestra un puntaje, así que es la que tiene que ver el jugador.
 *
 * `ScoreBadge` también sabe dibujar una botella con la graduación para los
 * productos con alcohol; acá no, porque el juego ya no los incluye (§8p).
 */

interface Props {
  puntaje: number | null;
  tamano?: 'sm' | 'md' | 'lg';
}

export function Insignia({ puntaje, tamano = 'md' }: Props) {
  return (
    <div
      className={`insignia insignia-${tamano}`}
      style={{ background: scoreColor(puntaje) }}
    >
      <span className="insignia-numero">{puntaje ?? '?'}</span>
    </div>
  );
}
