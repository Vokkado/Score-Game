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

// Mismos tonos que --vk-primary-light / --vk-primary-dark en theme.css. En
// hex acá (no CSS vars) porque hace falta interpolar en JS, no sólo elegir
// entre dos valores fijos.
const CLARO = { r: 0xb8, g: 0xc4, b: 0x45 };
const OSCURO = { r: 0x22, g: 0x52, b: 0x1d };

/**
 * Color de fondo de cada botón hasta el elegido: degradé parejo entre
 * CLARO (posición 1) y OSCURO (la posición elegida, sea cual sea), no un
 * salto de dos colores fijos — así se ve de un vistazo qué tan lejos del
 * elegido está cada botón, no sólo "llegó o no llegó".
 */
function colorDe(v: number, valor: number): string {
  const t = valor > 1 ? (v - 1) / (valor - 1) : 1;
  const r = Math.round(CLARO.r + (OSCURO.r - CLARO.r) * t);
  const g = Math.round(CLARO.g + (OSCURO.g - CLARO.g) * t);
  const b = Math.round(CLARO.b + (OSCURO.b - CLARO.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

/** Texto blanco una vez que el fondo interpolado se pone lo bastante oscuro. */
function textoClaroSobre(v: number, valor: number): boolean {
  const t = valor > 1 ? (v - 1) / (valor - 1) : 1;
  const luminancia =
    0.299 * (CLARO.r + (OSCURO.r - CLARO.r) * t) +
    0.587 * (CLARO.g + (OSCURO.g - CLARO.g) * t) +
    0.114 * (CLARO.b + (OSCURO.b - CLARO.b) * t);
  return luminancia < 140;
}

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
        {VALORES.map((v) => {
          const lleno = valor !== null && v <= valor;
          const color = lleno ? colorDe(v, valor!) : undefined;
          return (
            <button
              key={v}
              type="button"
              onClick={() => onElegir(v)}
              role="radio"
              aria-checked={valor === v}
              style={
                lleno
                  ? {
                      background: color,
                      borderColor: color,
                      color: textoClaroSobre(v, valor!) ? 'var(--vk-friendly-white)' : 'var(--vk-titulo)',
                    }
                  : undefined
              }
            >
              {v}
            </button>
          );
        })}
      </div>

      <div className="escala">
        <span>{extremoBajo}</span>
        <span>{extremoAlto}</span>
      </div>

      {error && <p className="mensaje-error">{error}</p>}
    </div>
  );
}
