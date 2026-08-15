import { useEffect, useState } from 'react';
import type { LeaderboardEntry } from '../game/engine';
import { cargarTabla } from '../game/leaderboard';
import { TablaPosiciones } from '../componentes/TablaPosiciones';
import { EncabezadoMarca } from '../componentes/EncabezadoMarca';
import { EjemploInteractivo } from '../componentes/EjemploInteractivo';

interface Props {
  onEmpezar: () => void;
  onScoreboard: () => void;
}

export function Inicio({ onEmpezar, onScoreboard }: Props) {
  const [tabla, setTabla] = useState<LeaderboardEntry[]>([]);
  const [cargando, setCargando] = useState(true);

  // La tabla se lee en cada vuelta al inicio: entre partida y partida cambia,
  // y es lo que engancha a quien está mirando desde afuera del stand. Primero
  // intenta la base (ve lo jugado en todos los dispositivos); si no hay red,
  // cae sola a lo guardado en este navegador.
  useEffect(() => {
    cargarTabla().then((t) => {
      setTabla(t);
      setCargando(false);
    });
  }, []);

  return (
    <>
      <EncabezadoMarca onScoreboard={onScoreboard} />

      <div className="pantalla">
        <h1 className="display hero-titulo">Jugá y ganá</h1>
        <p className="hero-sub">¡Adiviná el puntaje! ¡Cuanto más cerca, más puntos!</p>

        <EjemploInteractivo />

        {/* Los avisos de premios se mudaron a `/scoreboard`, la pantalla que
            queda puesta en el monitor del stand: acá competían con el CTA y
            repiten lo que ya dice el póster colgado al lado. */}

        {/* El CTA va acá, antes de la tabla: la tabla crece sola durante el
            evento y no debería obligar a scrollear para poder jugar. */}
        <button className="primario grande boton-respira" onClick={onEmpezar}>
          Empezar a jugar
        </button>

        <div className="separador-tabla" />

        <TablaPosiciones entradas={tabla} cargando={cargando} />
      </div>
    </>
  );
}
