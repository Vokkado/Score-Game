import { useEffect, useRef, useState } from 'react';
import type { Product } from '../game/engine';
import { SECONDS_PER_ROUND } from '../game/engine';

interface Props {
  producto: Product;
  numero: number;
  total: number;
  onResponder: (guess: number, ms: number) => void;
}

export function Jugada({ producto, numero, total, onResponder }: Props) {
  const [guess, setGuess] = useState(50);
  const [restante, setRestante] = useState(SECONDS_PER_ROUND);
  const inicio = useRef(Date.now());
  const respondido = useRef(false);

  const responder = (valor: number) => {
    if (respondido.current) return; // el timer y el botón pueden llegar juntos
    respondido.current = true;
    onResponder(valor, Date.now() - inicio.current);
  };

  // El timer evita que una persona piense dos minutos con fila esperando.
  // Al llegar a cero se envía lo que haya en el slider: no se castiga con cero,
  // pero tampoco se espera indefinidamente.
  useEffect(() => {
    const id = setInterval(() => {
      const pasado = (Date.now() - inicio.current) / 1000;
      const queda = Math.max(0, SECONDS_PER_ROUND - pasado);
      setRestante(queda);
      if (queda <= 0) {
        clearInterval(id);
        setGuess((actual) => {
          responder(actual);
          return actual;
        });
      }
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pct = (restante / SECONDS_PER_ROUND) * 100;

  return (
    <div className="pantalla">
      <div className="barra-superior">
        <span>
          Producto {numero} de {total}
        </span>
        <span className={`timer ${restante <= 5 ? 'urgente' : ''}`}>
          {Math.ceil(restante)}s
        </span>
      </div>

      <div className="progreso">
        <div style={{ width: `${pct}%` }} />
      </div>

      <img className="foto" src={`/products/${producto.image}`} alt={producto.name} />

      <p className="nombre-producto">{producto.name}</p>
      <p className="marca">{producto.brand}</p>

      <div className="espaciador" />

      <div className="valor-slider">{guess}</div>
      <input
        type="range"
        min={0}
        max={100}
        value={guess}
        onChange={(e) => setGuess(Number(e.target.value))}
        aria-label="Tu puntaje"
      />
      <div className="escala">
        <span>0 · nada saludable</span>
        <span>100 · muy saludable</span>
      </div>

      <button className="primario" onClick={() => responder(guess)}>
        Confirmar {guess}
      </button>
    </div>
  );
}
