import { useEffect, useRef, useState } from 'react';
import { scoreColor, demoLabel } from '../game/engine';

/**
 * Ejemplo jugable en la pantalla de inicio: no es una ronda real ni un
 * producto del pool, es sólo para que la persona entienda el mecanismo antes
 * de anotarse — nada de esto usa datos del juego real.
 *
 * El control se mueve solo hasta el primer toque: viaja de a tramos, con una
 * curva suave y una pausa al llegar a cada parada (no un barrido lineal
 * constante), para que se note que "se puede mover" sin marear.
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
  const [tocado, setTocado] = useState(false);
  const cancelado = useRef(false);

  useEffect(() => {
    if (tocado) return;
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
  }, [tocado]);

  const color = scoreColor(valor);

  return (
    <div className="tarjeta-demo">
      <p className="demo-instruccion">Arrastrá la barra del 0 al 100 y embocale al puntaje</p>

      <div className="demo-numero-wrap">
        <div className="valor-slider chico" style={{ color }}>
          {valor}
        </div>
        <div className="demo-etiqueta" style={{ color }}>
          {demoLabel(valor)}
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        value={valor}
        className="control-demo"
        style={
          {
            '--relleno-color': color,
            '--relleno-pct': `${valor}%`,
          } as React.CSSProperties
        }
        onPointerDown={() => setTocado(true)}
        onChange={(e) => {
          setTocado(true);
          setValor(Number(e.target.value));
        }}
        aria-label="Probar el control de puntaje"
      />
      <div className="escala">
        <span>0 · Nada saludable</span>
        <span>100 · Muy saludable</span>
      </div>
    </div>
  );
}
