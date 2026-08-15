import { useEffect, useState } from 'react';
import { rankPlayers, type LeaderboardEntry } from '../game/engine';
import { allGames } from '../game/storage';
import { ChevronIzquierda, Trofeo } from '../componentes/Iconos';
import logo from '../assets/icon.png';
import poster from '../assets/PREMIOS (1).png';

/**
 * Pantalla para el monitor del stand: queda puesta todo el día mostrando la
 * tabla de posiciones. Está pensada para mirarse **de lejos y de parado**, así
 * que va sobre fondo verde oscuro y con tipografía mucho más grande que el
 * resto del juego.
 *
 * ⚠️ **Sólo ve las partidas del navegador donde corre.** Los datos viven en el
 * IndexedDB del dispositivo (ver `storage.ts`): si esto se abre en otra
 * computadora, la tabla aparece vacía. Hoy funciona como segunda ventana o
 * segundo monitor de la MISMA máquina que tiene el juego. Para ponerlo en un
 * dispositivo aparte hace falta el backend de sync de la fase 2.
 */

/** Cada cuánto se relee IndexedDB. No hay eventos de cambio entre pestañas. */
const REFRESCO_MS = 4000;

/** Cuántos puestos entran en pantalla antes de empezar a rotar. */
const POR_PAGINA = 10;

/** Cada cuánto pasa de página cuando hay más jugadores que los que entran. */
const ROTACION_MS = 8000;

/**
 * Piso de carriles de la grilla. Con dos jugadores a primera hora, repartir
 * los 800px entre dos filas daba dos barras gigantes; con este piso quedan
 * filas grandes pero creíbles, y el hueco de abajo se va llenando solo.
 */
const FILAS_MINIMAS = 6;

const PREMIOS = ['1º Canguro', '2º Camiseta', '3º Tote bag'];

export function Scoreboard({ onVolver }: { onVolver: () => void }) {
  const [tabla, setTabla] = useState<LeaderboardEntry[]>([]);
  const [pagina, setPagina] = useState(0);

  // Relee sola: el monitor queda puesto y nadie va a recargarlo entre partidas.
  useEffect(() => {
    const leer = () =>
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
    leer();
    const id = setInterval(leer, REFRESCO_MS);
    return () => clearInterval(id);
  }, []);

  const paginas = Math.max(1, Math.ceil(tabla.length / POR_PAGINA));

  // Con más jugadores de los que entran, la tabla rota sola en vez de recortar:
  // en una pantalla que se mira todo el día, el que salió 14º también quiere
  // verse. Se reinicia si la lista se achica.
  useEffect(() => {
    if (paginas <= 1) {
      setPagina(0);
      return;
    }
    const id = setInterval(() => setPagina((p) => (p + 1) % paginas), ROTACION_MS);
    return () => clearInterval(id);
  }, [paginas]);

  const desde = Math.min(pagina, paginas - 1) * POR_PAGINA;
  const visibles = tabla.slice(desde, desde + POR_PAGINA);

  return (
    <div className="scoreboard">
      <header className="sb-cabecera">
        <img src={logo} alt="" className="sb-logo" />
        <span className="sb-marca">Vokkado</span>
        <span className="sb-titulo">
          <Trofeo size={30} color="var(--vk-primary-light)" />
          Desafío del Puntaje
        </span>

        {/* Discreto a propósito: es la salida para el equipo, no un botón que
            deba llamar la atención en una pantalla que se exhibe todo el día. */}
        <button type="button" className="sb-volver" onClick={onVolver} aria-label="Volver al juego">
          <ChevronIzquierda size={20} color="rgba(255,255,255,0.75)" />
          Volver al juego
        </button>
      </header>

      <div className="sb-cuerpo">
        <section className="sb-tabla">
          <div className="sb-tabla-cabecera">
            <h1>Tabla de posiciones</h1>
            <span className="sb-cuenta">
              {tabla.length === 0
                ? 'Todavía no jugó nadie'
                : `${tabla.length} ${tabla.length === 1 ? 'jugador' : 'jugadores'}`}
            </span>
          </div>

          {tabla.length === 0 ? (
            <p className="sb-vacio">Acercate al stand y sé el primero en jugar.</p>
          ) : (
            <div
              className="sb-lista"
              // Los carriles los fija el total, no la página: si los fijara la
              // página, la última —siempre más corta— estiraría sus filas y la
              // tabla cambiaría de aspecto en cada rotación.
              style={
                {
                  '--filas': Math.max(
                    FILAS_MINIMAS,
                    Math.min(tabla.length, POR_PAGINA),
                  ),
                } as React.CSSProperties
              }
            >
              {visibles.map((e, i) => {
                const puesto = desde + i + 1;
                const metal = puesto === 1 ? 'oro' : puesto === 2 ? 'plata' : puesto === 3 ? 'cobre' : '';
                return (
                  <div key={e.email} className={`sb-fila ${metal}`}>
                    <span className={`sb-puesto ${metal}`}>{puesto}º</span>
                    <span className="sb-quien">
                      {e.nombre}
                      {e.apellido ? ` ${e.apellido.charAt(0)}.` : ''}
                    </span>
                    {metal && <span className={`sb-premio ${metal}`}>{PREMIOS[puesto - 1]}</span>}
                    <span className="sb-pts">{e.points}</span>
                  </div>
                );
              })}
            </div>
          )}

          {paginas > 1 && (
            <div className="sb-paginas" aria-hidden="true">
              {Array.from({ length: paginas }, (_, i) => (
                <span key={i} className={`sb-punto ${i === pagina ? 'activo' : ''}`} />
              ))}
            </div>
          )}
        </section>

        <aside className="sb-lateral">
          <img src={poster} alt="Premios: 1º canguro, 2º camiseta, 3º tote bag" className="sb-poster" />

          <div className="sb-premios">
            <p className="sb-premios-hora">Los premios se entregan a las 17:00 hs</p>
            <p className="sb-premios-sub">
              Acercate al stand para recibirlo. ¡Si no ganás igual te llevás un sticker por
              participar y beneficios de Vokkado!
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
