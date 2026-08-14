import { useEffect, useRef, useState } from 'react';
import { scoreColor, tramoDe, ESCALA_PUNTAJE } from '../game/engine';
import { Insignia } from './Insignia';

/**
 * Animación de ejemplo en la pantalla de inicio: no es una ronda real ni un
 * producto del pool, es sólo para que la persona entienda el mecanismo antes
 * de anotarse — nada de esto usa datos del juego real.
 *
 * A propósito NO es interactiva: es sólo para mirar, viaja de a tramos con
 * una curva suave y una pausa en cada parada, para siempre. La primera
 * versión sí se podía arrastrar, y arrastrarla paraba la animación para
 * siempre — quedaba "roto" apenas alguien lo tocaba sin querer. El control
 * real donde SÍ se juega está en la pantalla de la ronda, no acá.
 */

/** Paradas del recorrido automático. Cubren los tres niveles de demoLabel. */
const PARADAS = [14, 48, 79, 33, 91, 60];
const DURACION_TRAMO_MS = 1200;
const PAUSA_MS = 600;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function EjemploInteractivo() {
  const [valor, setValor] = useState(PARADAS[0]);
  const cancelado = useRef(false);

  useEffect(() => {
    cancelado.current = false;

    let indice = 0;
    let rafId = 0;
    let timeoutId: ReturnType<typeof setTimeout>;

    const irA = (desde: number, destino: number) => {
      const inicio = performance.now();
      const paso = (ahora: number) => {
        if (cancelado.current) return;
        const t = Math.min(1, (ahora - inicio) / DURACION_TRAMO_MS);
        setValor(Math.round(desde + (destino - desde) * easeInOutCubic(t)));
        if (t < 1) {
          rafId = requestAnimationFrame(paso);
        } else {
          timeoutId = setTimeout(siguienteTramo, PAUSA_MS);
        }
      };
      rafId = requestAnimationFrame(paso);
    };

    const siguienteTramo = () => {
      if (cancelado.current) return;
      const desde = PARADAS[indice % PARADAS.length];
      indice++;
      irA(desde, PARADAS[indice % PARADAS.length]);
    };

    siguienteTramo();

    return () => {
      cancelado.current = true;
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
    };
  }, []);

  const color = scoreColor(valor);

  return (
    <div className="tarjeta-demo">
      <p className="demo-instruccion">Arrastrá la barra del 0 al 100 y embocale al puntaje</p>

      {/* Círculo de color con el número en blanco — la misma `Insignia` que
          usan Feedback y Comodín, así el puntaje se ve siempre igual en toda
          la app (es el mismo `ScoreBadge` que la app real). */}
      <div className="demo-numero-wrap">
        <Insignia puntaje={valor} tamano="lg" />
        <div className="demo-etiqueta" style={{ color }}>
          {tramoDe(valor).etiqueta}
        </div>
      </div>

      {/* Puramente decorativo: `pointer-events: none` bloquea el arrastre (la
          causa del bug — arrastrarlo dejaba la animación parada para
          siempre), `tabIndex={-1}` lo saca del tabulado por teclado, y
          `aria-hidden` lo esconde de lectores de pantalla, porque no hace
          nada si lo "activás". `onChange` no-op es sólo para que React no
          se queje de un input controlado sin manejador. */}
      <input
        type="range"
        min={0}
        max={100}
        value={valor}
        className="control-demo inerte"
        style={
          {
            '--relleno-color': color,
            '--relleno-pct': `${valor}%`,
          } as React.CSSProperties
        }
        onChange={() => {}}
        tabIndex={-1}
        aria-hidden="true"
      />
      {/* La escala completa, con rango y color de cada tramo — la misma tabla
          que usa `scoreColor`, así que nunca puede decir algo distinto de lo
          que el juego realmente hace. */}
      <div className="leyenda-escala">
        {ESCALA_PUNTAJE.map((t) => (
          <span key={t.desde} className="tramo-leyenda">
            <span className="tramo-punto" style={{ background: t.color }} />
            {t.desde}-{t.hasta} {t.etiqueta}
          </span>
        ))}
      </div>
    </div>
  );
}
