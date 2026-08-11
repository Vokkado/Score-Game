import type { Product, Round } from '../game/engine';
import { feedbackFor } from '../game/engine';

interface Props {
  producto: Product;
  round: Round;
  esUltimo: boolean;
  onSeguir: () => void;
}

/** Ancho de la barra de cada paso, relativo a la penalización más grande. */
function anchoBarra(valor: number, maximo: number): string {
  return `${Math.max(4, (Math.abs(valor) / maximo) * 120)}px`;
}

export function Feedback({ producto, round, esUltimo, onSeguir }: Props) {
  const maximo = Math.max(...producto.breakdown.map((s) => Math.abs(s.value)), 1);

  return (
    <div className="pantalla">
      <p className="nombre-producto">{producto.name}</p>
      <p className="marca">{producto.brand}</p>

      <div className="comparacion">
        <div className="caja">
          <div className="etiqueta">Dijiste</div>
          <div className="numero">{round.guess}</div>
        </div>
        <div className="caja real">
          <div className="etiqueta">Score Vokkado</div>
          <div className="numero">{round.realScore}</div>
        </div>
      </div>

      <div className="veredicto">{feedbackFor(round.points)}</div>
      <div className="puntos-ganados">
        +{round.points} puntos · erraste por {Math.abs(round.guess - round.realScore)}
      </div>

      <div className="justificacion">{producto.justification}</div>

      {producto.breakdown.length > 0 && (
        <div className="desglose">
          <h3>Cómo se llega a {round.realScore}</h3>
          <div className="paso">
            <span className="etiqueta-paso">Punto de partida</span>
            <span className="valor">100</span>
          </div>
          {producto.breakdown.map((s) => (
            <div key={s.label} className={`paso ${s.value < 0 ? 'resta' : 'suma'}`}>
              <span className="etiqueta-paso">{s.label}</span>
              <span className="barra" style={{ width: anchoBarra(s.value, maximo) }} />
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

      <button className="primario" onClick={onSeguir}>
        {esUltimo ? 'Ver mi resultado' : 'Siguiente producto'}
      </button>
    </div>
  );
}
