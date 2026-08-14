import { useEffect, useRef, useState } from 'react';
import type { Product } from '../game/engine';
import { SECONDS_PER_ROUND, scoreColor, ESCALA_PUNTAJE } from '../game/engine';
import { Insignia } from '../componentes/Insignia';

interface Props {
  producto: Product;
  numero: number;
  total: number;
  onResponder: (guess: number, ms: number) => void;
}

/** Cuántos segundos antes del final se enciende la alarma. */
const SEGUNDOS_URGENTE = 5;

export function Jugada({ producto, numero, total, onResponder }: Props) {
  const [guess, setGuess] = useState(50);
  const [restante, setRestante] = useState(SECONDS_PER_ROUND);
  const inicio = useRef(Date.now());
  const respondido = useRef(false);
  // Espejo del slider para el timer: el intervalo se arma una sola vez y no ve
  // los cambios de estado posteriores. Antes esto se resolvía llamando a
  // `onResponder` adentro del updater de `setGuess`, que es un efecto colateral
  // en una función que React puede invocar dos veces.
  const guessRef = useRef(50);

  const cambiar = (valor: number) => {
    guessRef.current = valor;
    setGuess(valor);
  };

  const responder = (valor: number) => {
    if (respondido.current) return; // el timer y el botón pueden llegar juntos
    respondido.current = true;
    onResponder(valor, Date.now() - inicio.current);
  };

  // El timer evita que una persona piense dos minutos con fila esperando.
  // Al llegar a cero se envía lo que haya en el control: no se castiga con
  // cero, pero tampoco se espera indefinidamente.
  useEffect(() => {
    const id = setInterval(() => {
      const pasado = (Date.now() - inicio.current) / 1000;
      const queda = Math.max(0, SECONDS_PER_ROUND - pasado);
      setRestante(queda);
      if (queda <= 0) {
        clearInterval(id);
        responder(guessRef.current);
      }
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pct = (restante / SECONDS_PER_ROUND) * 100;
  const urgente = restante <= SEGUNDOS_URGENTE;

  return (
    <div className="pantalla">
      <div className="barra-superior">
        <span>
          Producto {numero} de {total}
        </span>
        <span className={`timer ${urgente ? 'urgente' : ''}`}>
          {Math.ceil(restante)} s
        </span>
      </div>

      <div className="progreso">
        <div className={urgente ? 'urgente' : ''} style={{ width: `${pct}%` }} />
      </div>

      <img
        className={`foto ${urgente ? 'urgente' : ''}`}
        src={`/products/${producto.image}`}
        alt={producto.name}
      />

      <p className="nombre-producto">{producto.name}</p>
      <p className="marca">{producto.brand}</p>

      {/* Se renderiza siempre, visible sólo sobre el final: si apareciera de la
          nada a los 5 segundos empujaría todo lo de abajo —el control incluido—
          justo cuando puede haber un dedo apoyado en él. */}
      <p className={`aviso-tiempo ${urgente ? 'visible' : ''}`} aria-live="polite">
        ¡Poco tiempo!
      </p>

      <div className="espaciador" />

      {/* Todo lo que se toca, en un solo bloque centrado: puntaje, control,
          escala y confirmar. Antes el control quedaba pegado al piso con un
          hueco muerto arriba. */}
      <div className="bloque-jugada">
        {/* El mismo círculo de la pantalla de inicio: número en blanco sobre el
            color de la escala. Mientras juega, la persona aprende qué significa
            cada rango. */}
        <Insignia puntaje={guess} tamano="lg" />

        <input
          type="range"
          min={0}
          max={100}
          value={guess}
          style={
            {
              '--relleno-color': scoreColor(guess),
              '--relleno-pct': `${guess}%`,
            } as React.CSSProperties
          }
          onChange={(e) => cambiar(Number(e.target.value))}
          aria-label="Tu puntaje"
        />

        {/* La misma leyenda de los 5 tramos que en el inicio, armada desde
            `ESCALA_PUNTAJE`: no puede decir algo distinto de lo que el juego
            hace. Acá importa más que en el inicio — es el momento de decidir. */}
        <div className="leyenda-escala">
          {ESCALA_PUNTAJE.map((t) => (
            <span key={t.desde} className="tramo-leyenda">
              <span className="tramo-punto" style={{ background: t.color }} />
              {t.desde}-{t.hasta} {t.etiqueta}
            </span>
          ))}
        </div>

        {/* Respira siempre, como el CTA del inicio: es el único botón de la
            pantalla y tiene que leerse como "tocame cuando estés listo". */}
        <button className="primario grande boton-respira" onClick={() => responder(guess)}>
          Confirmar {guess}
        </button>
      </div>

      <div className="espaciador" />
    </div>
  );
}
