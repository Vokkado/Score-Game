import type { Product, Round } from '../game/engine';
import { feedbackFor, scoreColor } from '../game/engine';
import { Insignia } from '../componentes/Insignia';

interface Props {
  producto: Product;
  round: Round;
  esUltimo: boolean;
  onSeguir: () => void;
}

/** Ancho de la barra de cada paso, relativo a la penalización más grande. */
function anchoBarra(valor: number, maximo: number): string {
  return `${Math.max(4, (Math.abs(valor) / maximo) * 110)}px`;
}

export function Feedback({ producto, round, esUltimo, onSeguir }: Props) {
  const maximo = Math.max(...producto.breakdown.map((s) => Math.abs(s.value)), 1);
  const error = Math.abs(round.guess - round.realScore);

  return (
    <div className="pantalla pantalla-feedback">
      {/* Todo lo que se lee va adentro de su propia área de scroll, y el botón
          queda afuera. Así el botón no puede taparlo en ningún momento: no
          comparten espacio, cada uno tiene el suyo. */}
      <div className="fb-cuerpo">
      {/* Foto cuadrada a la izquierda con el nombre y la marca al lado, en una
          sola fila. Apilados ocupaban tres bloques de alto para decir lo mismo,
          y acá el alto es escaso: abajo esperan la explicación y el desglose. */}
      <div className="cabecera-producto">
        <img
          className="foto-mini"
          src={`/products/${producto.image}`}
          alt={producto.name}
        />
        <div className="cabecera-producto-texto">
          <p className="nombre-producto">{producto.name}</p>
          <p className="marca">{producto.brand}</p>
        </div>
      </div>

      {/* Las dos insignias circulares, como las muestra la app. */}
      <div className="comparacion">
        <div className="columna-insignia">
          <span className="etiqueta">Tu puntaje</span>
          <Insignia puntaje={round.guess} tamano="md" />
        </div>
        <span className="separador-vs">vs</span>
        <div className="columna-insignia destacada">
          <span className="etiqueta">Puntaje de Vokkado</span>
          <Insignia puntaje={round.realScore} tamano="lg" />
        </div>
      </div>

      <div className="veredicto" style={{ color: scoreColor(round.realScore) }}>
        {feedbackFor(round.points)}
      </div>
      <div className="puntos-ganados">
        <strong>+{round.points} puntos</strong> ·{' '}
        {error === 0 ? 'exacto' : `te alejaste por ${error}`}
      </div>

      <div className="justificacion">
        <h2 className="titulo-porque">¿Por qué Vokkado le pone este puntaje?</h2>
        <p>{producto.justification}</p>
      </div>

      {producto.breakdown.length > 0 && (
        <div className="desglose">
          <h3>Cómo se llega a {round.realScore}</h3>
          <div className="paso inicial">
            <span className="etiqueta-paso">Punto de partida</span>
            <span className="valor">100</span>
          </div>
          {producto.breakdown.map((s, i) => (
            <div key={s.label} className={`paso ${s.value < 0 ? 'resta' : 'suma'}`}>
              <span className="etiqueta-paso">{s.label}</span>
              <span
                className="barra"
                style={{
                  width: anchoBarra(s.value, maximo),
                  // Las barras entran escalonadas: se lee como una cuenta que
                  // va bajando, no como un bloque de números.
                  animationDelay: `${i * 70}ms`,
                }}
              />
              <span className="valor">
                {s.value > 0 ? '+' : ''}
                {s.value}
              </span>
            </div>
          ))}

          {(producto.excesses.length > 0 || producto.beneficials.length > 0) && (
            <div className="nutrientes">
              {producto.excesses.map((e) => (
                <span key={e.name} className="chip exceso">
                  {e.name} {e.value}
                  {e.unit}
                </span>
              ))}
              {producto.beneficials.map((b) => (
                <span key={b.name} className="chip bueno">
                  {b.name} {b.value}
                  {b.unit}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      </div>

      <button className="primario grande" onClick={onSeguir}>
        {esUltimo ? 'Ver mi resultado' : 'Siguiente producto'}
      </button>
    </div>
  );
}
