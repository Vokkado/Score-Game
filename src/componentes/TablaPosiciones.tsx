import type { LeaderboardEntry } from '../game/engine';

/**
 * Tabla de posiciones. Se muestra en la pantalla de inicio (para que la gente
 * que pasa por el stand vea contra quién compite) y al terminar la partida.
 *
 * **Se muestran todos los jugadores, no un top.** Antes cortaba en 5 y al que
 * quedaba afuera se le agregaba su fila suelta al final, lo que hacía que la
 * mayoría no se viera en la lista y que la suya apareciera descolgada. Con
 * premios de por medio, cada uno tiene que poder encontrarse y ver contra
 * quién está compitiendo. La lista crece durante el evento, así que en las
 * dos pantallas donde aparece el botón va ARRIBA de la tabla: nadie debería
 * tener que scrollear una lista larga para poder seguir.
 *
 * Nunca muestra qué productos salieron ni sus puntajes de ronda: el que está
 * esperando en la fila los memorizaría. Tampoco muestra el correo ni el
 * teléfono de nadie: son datos de contacto privados, no algo para exhibir en
 * una pantalla pública del stand — se guardan igual y sirven para avisarle
 * al ganador.
 */

interface Props {
  entradas: LeaderboardEntry[];
  /** Id de la partida del jugador actual, para resaltar su fila. */
  idPropio?: string;
  titulo?: string;
  /**
   * Puesto del primer elemento de `entradas`, menos uno. Sólo lo usa el
   * scoreboard, que pasa una página de a diez y necesita que la segunda
   * empiece en 11º y no otra vez en 1º.
   */
  desde?: number;
}

export function TablaPosiciones({
  entradas,
  idPropio,
  titulo = 'Tabla de posiciones',
  desde = 0,
}: Props) {
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
          {entradas.map((e, i) => (
            <Fila
              key={e.id}
              puesto={desde + i + 1}
              entrada={e}
              esPropio={e.id === idPropio}
            />
          ))}
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

/**
 * El premio de cada puesto. Los nombres son **los del póster** —CANGURO,
 * CAMISETA, TOTE BAG— y en mayúsculas: es lo que la persona tiene colgado al
 * lado mientras mira la tabla, y antes acá decía "bolsa", que no figura en
 * ningún lado. Una sola función para las dos tablas (Inicio, Resultado y el
 * scoreboard usan este mismo componente).
 */
function premioDe(puesto: number): string | null {
  if (puesto === 1) return '¿Se lleva el CANGURO?';
  if (puesto === 2) return '¿Se lleva la CAMISETA?';
  if (puesto === 3) return '¿Se lleva la TOTE BAG?';
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
      {/* La inicial sólo si hay apellido: partidas viejas o importadas pueden
          no tenerlo, y "Ana ." con el punto suelto se lee como un error. */}
      <span className="quien">
        {entrada.nombre}
        {entrada.apellido ? ` ${entrada.apellido.charAt(0)}.` : ''}
      </span>
      {premio && <span className={`premio-tag ${metal}`}>{premio}</span>}
      <span className="pts">{entrada.points}</span>
    </div>
  );
}
