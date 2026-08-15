import { useEffect, useState } from 'react';
import type { LeaderboardEntry } from '../game/engine';
import { cargarTabla } from '../game/leaderboard';
import { TablaPosiciones } from '../componentes/TablaPosiciones';
import { ChevronIzquierda, Trofeo } from '../componentes/Iconos';
import logo from '../assets/icon.png';
import poster from '../assets/PREMIOS (1).png';

/**
 * Pantalla para el monitor del stand: queda puesta todo el día mostrando la
 * tabla de posiciones.
 *
 * **La tabla es literalmente el mismo componente que usa el juego**
 * (`TablaPosiciones`), no una copia parecida. La primera versión tenía su
 * propio marcado y por eso decía "1º Canguro" donde el juego dice "¿Se lleva
 * el CANGURO?", con otros tamaños de fila: dos tablas que iban a divergir sola
 * cada vez que se tocara una. Lo único que agrega el scoreboard es la
 * paginación, vía la prop `desde`.
 *
 * Lee la tabla vía `cargarTabla()` (DB primero, IndexedDB local si no hay
 * red), así que ya puede vivir en un dispositivo distinto al del juego. Si el
 * monitor pierde la conexión al backend, cae a mostrar sólo lo jugado en su
 * propio navegador — mejor eso que una pantalla vacía.
 */

/** Cada cuánto se relee IndexedDB. No hay eventos de cambio entre pestañas. */
const REFRESCO_MS = 4000;

/** Cuántos puestos entran en pantalla antes de empezar a rotar. */
const POR_PAGINA = 10;

/** Cada cuánto pasa de página cuando hay más jugadores que los que entran. */
const ROTACION_MS = 8000;

/*
 * Ya no viven acá el alto de fila ni los nombres de los premios: los pone
 * `TablaPosiciones`, que es la misma tabla que ve el jugador. Las filas toman
 * su alto natural (el podio más grande, el resto parejo) en vez de estirarse
 * para llenar la pantalla.
 */

export function Scoreboard({ onVolver }: { onVolver: () => void }) {
  const [tabla, setTabla] = useState<LeaderboardEntry[]>([]);
  const [pagina, setPagina] = useState(0);

  // Relee sola: el monitor queda puesto y nadie va a recargarlo entre partidas.
  useEffect(() => {
    const leer = () => cargarTabla().then(setTabla);
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
          <Trofeo size={30} color="var(--vk-primary)" />
          Desafío del Puntaje
        </span>

        <span className="sb-cuenta">
          {tabla.length === 0
            ? 'Todavía no jugó nadie'
            : `${tabla.length} ${tabla.length === 1 ? 'jugador' : 'jugadores'}`}
        </span>

        {/* Discreto a propósito: es la salida para el equipo, no un botón que
            deba llamar la atención en una pantalla que se exhibe todo el día. */}
        <button type="button" className="sb-volver" onClick={onVolver} aria-label="Volver al juego">
          <ChevronIzquierda size={20} color="var(--vk-texto-secundario)" />
          Volver al juego
        </button>
      </header>

      <div className="sb-cuerpo">
        <section className="sb-tabla">
          <TablaPosiciones entradas={visibles} desde={desde} />

          {paginas > 1 && (
            <div className="sb-paginas" aria-hidden="true">
              {Array.from({ length: paginas }, (_, i) => (
                <span key={i} className={`sb-punto ${i === pagina ? 'activo' : ''}`} />
              ))}
            </div>
          )}
        </section>

        <aside className="sb-lateral">
          {/* El horario va ARRIBA: es el dato con fecha de vencimiento, y el
              póster ya se explica solo. Abajo quedaba como pie de figura. */}
          <div className="sb-premios">
            <p className="sb-premios-hora">Los premios se entregan a las 17:00 hs</p>
            {/* Corto a propósito. Lo de los stickers y los beneficios ya lo
                dice el póster acá abajo, y un párrafo largo cambia de alto
                según el ancho del cartel — lo que a su vez le movía el alto
                disponible a la foto y les rompía la coincidencia de ancho. */}
            <p className="sb-premios-sub">Acercate a esa hora al stand para retirarlo.</p>
          </div>

          {/* El wrapper es el que se lleva el espacio sobrante; la imagen se
              ajusta adentro y su caja queda del tamaño exacto de la foto, así
              el marco blanco la abraza en vez de dibujar un rectángulo con
              aire arriba y abajo. */}
          <div className="sb-poster-wrap">
            <img
              src={poster}
              alt="Premios: 1º canguro, 2º camiseta, 3º tote bag"
              className="sb-poster"
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
