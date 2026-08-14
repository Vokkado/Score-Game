import { useEffect, useState } from 'react';
import { rankPlayers, type LeaderboardEntry } from '../game/engine';
import { allGames } from '../game/storage';
import { TablaPosiciones } from '../componentes/TablaPosiciones';
import { EncabezadoMarca } from '../componentes/EncabezadoMarca';
import { EjemploInteractivo } from '../componentes/EjemploInteractivo';

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
    <>
      <EncabezadoMarca />

      <div className="pantalla">
        <h1 className="display hero-titulo">Jugá y ganá</h1>
        <p className="hero-sub">¡Adiviná el puntaje! ¡Cuanto más cerca, más puntos!</p>

        <EjemploInteractivo />

        <div className="caja-premios">
          <p className="leyenda pie-inicio">
            Los premios se entregan a las 16:00 hs. Acercate al stand para recibirlo.
          </p>
          <p className="leyenda pie-secundario">
            ¡Si no ganás no importa, te llevás un sticker por participar y futuros
            beneficios de Vokkado!
          </p>
        </div>

        {/* El CTA va acá, antes de la tabla: la tabla crece sola durante el
            evento y no debería obligar a scrollear para poder jugar. */}
        <button className="primario grande boton-respira" onClick={onEmpezar}>
          Empezar a jugar
        </button>

        <div className="separador-tabla" />

        <TablaPosiciones entradas={tabla} />
      </div>
    </>
  );
}
