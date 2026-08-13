import { scoreColor } from '../game/engine';
import { Botella } from './Iconos';

/**
 * Insignia de puntaje. Réplica de `ScoreBadge` del Frontend: círculo relleno
 * con el color de la escala y el número en blanco. Es la forma en que la app
 * muestra un puntaje, así que es la que tiene que ver el jugador.
 *
 * Para productos con alcohol, la app muestra la botella con el % sobre fondo
 * rojo en vez de un número, porque no corresponde puntuarlos.
 */

interface Props {
  puntaje: number | null;
  tamano?: 'sm' | 'md' | 'lg';
  graduacion?: number | null;
}

export function Insignia({ puntaje, tamano = 'md', graduacion }: Props) {
  const conAlcohol = graduacion != null && graduacion > 0;
  const fondo = conAlcohol ? 'var(--vk-score-red)' : scoreColor(puntaje);

  return (
    <div className={`insignia insignia-${tamano}`} style={{ background: fondo }}>
      {conAlcohol ? (
        <>
          <Botella size={tamano === 'lg' ? 34 : 26} color="var(--vk-friendly-white)" />
          <span className="insignia-graduacion">
            {String(graduacion).replace('.', ',')}%
          </span>
        </>
      ) : (
        <span className="insignia-numero">{puntaje ?? '?'}</span>
      )}
    </div>
  );
}
