import type { LeaderboardEntry } from '../game/engine';

/**
 * Tabla de posiciones. Se muestra en la pantalla de inicio (para que la gente
 * que pasa por el stand vea contra quién compite) y al terminar la partida.
 *
 * Nunca muestra qué productos salieron ni sus puntajes de ronda: el que está
 * esperando en la fila los memorizaría. Tampoco muestra el correo ni el
 * teléfono de nadie: son datos de contacto privados, no algo para exhibir en
 * una pantalla pública del stand — se guardan igual y sirven para avisarle
 * al ganador.
 */

interface Props {
  entradas: LeaderboardEntry[];
  /** Email del jugador actual, para resaltar su fila. */
  emailPropio?: string;
  /** Cuántos puestos mostrar. */
  limite?: number;
  /** Si el jugador quedó fuera del corte, se agrega su fila al final. */
  puestoPropio?: number;
  titulo?: string;
}

export function TablaPosiciones({
  entradas,
  emailPropio,
  limite = 5,
  puestoPropio,
  titulo = 'Tabla de posiciones',
}: Props) {
  const visibles = entradas.slice(0, limite);
  const estoyVisible = emailPropio ? visibles.some((e) => e.email === emailPropio) : true;
  const yo = emailPropio ? entradas.find((e) => e.email === emailPropio) : undefined;

  return (
    <div className="bloque-tabla">
      <div className="cabecera-tabla">
        <h2>{titulo}</h2>
        <span className="columna-puntaje">Puntaje</span>
      </div>

      {entradas.length === 0 ? (
        <p className="vacio">Todavía no jugó nadie. Podés ser el primero.</p>
      ) : (
        <div className="lista-posiciones">
          {visibles.map((e, i) => (
            <Fila key={e.email} puesto={i + 1} entrada={e} esPropio={e.email === emailPropio} />
          ))}

          {!estoyVisible && yo && puestoPropio ? (
            <Fila puesto={puestoPropio} entrada={yo} esPropio />
          ) : null}
        </div>
      )}
    </div>
  );
}

/** El metal de cada puesto premiado. Vacío = sin premio, sin tratamiento especial. */
function metalDe(puesto: number): 'oro' | 'plata' | 'cobre' | '' {
  if (puesto === 1) return 'oro';
  if (puesto === 2) return 'plata';
  if (puesto === 3) return 'cobre';
  return '';
}

/** El premio de cada puesto, tal como se anuncia en el stand. */
function premioDe(puesto: number): string | null {
  if (puesto === 1) return '¿Se lleva el CANGURO?';
  if (puesto === 2) return '¿Se lleva la camiseta?';
  if (puesto === 3) return '¿Se lleva la bolsa?';
  return null;
}

function Fila({
  puesto,
  entrada,
  esPropio,
}: {
  puesto: number;
  entrada: LeaderboardEntry;
  esPropio: boolean;
}) {
  const premio = premioDe(puesto);
  // El tamaño de fila y el color van juntos ahora: 1º oro y el más grande,
  // 2º plata un escalón menos, 3º cobre otro escalón menos. De 4º en
  // adelante todas iguales — más chicas, pero no minúsculas — porque ya no
  // hay premio que resaltar.
  const metal = metalDe(puesto);

  return (
    <div className={`fila-posicion ${esPropio ? 'yo' : ''} ${metal}`}>
      <span className={`puesto ${metal}`}>{puesto}º</span>
      <span className="quien">
        {entrada.nombre} {entrada.apellido.charAt(0)}.
      </span>
      {premio && <span className={`premio-tag ${metal}`}>{premio}</span>}
      <span className="pts">{entrada.points}</span>
    </div>
  );
}
