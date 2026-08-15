/**
 * Escala del 1 al 10, en una sola fila.
 *
 * Antes era una grilla de cuadrados que envolvía en dos renglones y se leía
 * como un teclado numérico, no como una escala: el 10 quedaba debajo del 0 y
 * se perdía la noción de "esto va de poco a mucho". Ahora los botones se
 * reparten el ancho (`flex: 1`) y se achican en vez de bajar de línea, con un
 * alto fijo de 48px para que el dedo siga teniendo dónde caer.
 */

interface Props {
  id: string;
  label: string;
  extremoBajo: string;
  extremoAlto: string;
  valor: number | null;
  onElegir: (v: number) => void;
  error?: string;
}

const VALORES = Array.from({ length: 10 }, (_, i) => i + 1);

export function EscalaPuntos({
  id,
  label,
  extremoBajo,
  extremoAlto,
  valor,
  onElegir,
  error,
}: Props) {
  return (
    <div className="campo" id={id}>
      <label>{label}</label>

      <div className="escala-puntos" role="radiogroup" aria-label={label}>
        {VALORES.map((v) => (
          <button
            key={v}
            type="button"
            className={valor === v ? 'elegido' : ''}
            onClick={() => onElegir(v)}
            role="radio"
            aria-checked={valor === v}
          >
            {v}
          </button>
        ))}
      </div>

      <div className="escala">
        <span>{extremoBajo}</span>
        <span>{extremoAlto}</span>
      </div>

      {error && <p className="mensaje-error">{error}</p>}
    </div>
  );
}
