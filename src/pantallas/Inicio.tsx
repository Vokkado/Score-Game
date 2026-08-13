import { useEffect, useState } from 'react';
import { rankPlayers, type LeaderboardEntry } from '../game/engine';
import { allGames } from '../game/storage';
import { TablaPosiciones } from '../componentes/TablaPosiciones';
import { EncabezadoMarca } from '../componentes/EncabezadoMarca';
import { EjemploInteractivo } from '../componentes/EjemploInteractivo';
import fondo from '../assets/Background.png';

export function Inicio({ onEmpezar }: { onEmpezar: () => void }) {
  const [tabla, setTabla] = useState<LeaderboardEntry[]>([]);

  // La tabla se lee en cada vuelta al inicio: entre partida y partida cambia,
  // y es lo que engancha a quien está mirando desde afuera del stand.
  useEffect(() => {
    allGames().then((partidas) =>
      setTabla(
        rankPlayers(
          partidas.map((p) => ({
            email: p.email,
            nombre: p.nombre,
            apellido: p.apellido,
            points: p.points,
            ms: p.ms,
            playedAt: p.playedAt,
          })),
        ),
      ),
    );
  }, []);

  return (
    <div className="pantalla-con-fondo">
      {/* Franja decorativa del póster de marca, recortada para mostrar sólo el
          patrón de cuadraditos del pie. Ancho completo, pegada al piso. */}
      <div className="fondo-marca-wrap" aria-hidden="true">
        <img src={fondo} alt="" className="fondo-marca" />
      </div>

      <EncabezadoMarca />

      <div className="pantalla">
        <h1 className="display hero-titulo">Jugá y ganá</h1>
        <p className="hero-sub">¡Adiviná el puntaje! ¡Cuanto más cerca, más puntos!</p>

        <EjemploInteractivo />

        <p className="leyenda pie-inicio">
          Los premios se entregan a las 16:00 hs · Llevate un sticker de regalo
        </p>

        {/* El CTA va acá, antes de la tabla: la tabla crece sola durante el
            evento y no debería obligar a scrollear para poder jugar. */}
        <button className="primario grande" onClick={onEmpezar}>
          Empezar a jugar
        </button>

        <div className="separador-tabla" />

        <TablaPosiciones entradas={tabla} />
      </div>
    </div>
  );
}
