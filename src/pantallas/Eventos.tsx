import { useEffect, useState } from 'react';
import { listarEventos, crearEvento, mostrarEvento, type Evento } from '../game/eventos';
import { Encabezado } from '../componentes/Encabezado';
import { Calendario } from '../componentes/Iconos';

/** Hoy en YYYY-MM-DD, en la hora del iPad. No `toISOString()`: ese es UTC, y
 *  de noche en Uruguay ya da el día siguiente. */
function hoy(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** YYYY-MM-DD → dd/mm/aaaa. A mano y no con `new Date()`: parsear la fecha
 *  sola la toma como UTC y en Uruguay se mostraría el día anterior. */
function aDiaMesAnio(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${anio}`;
}

/**
 * Ruta oculta (`/eventos`), sin link en ningún lado — igual que `/exportar`,
 * es sólo para el equipo del stand. Crea eventos y elige cuál muestra el
 * ranking.
 *
 * Sin auth por ahora (decisión explícita): los endpoints son públicos.
 *
 * Elegir un evento NO cambia a qué evento va cada partida — eso lo decide el
 * backend por la fecha en que se jugó. Sólo cambia qué tabla se ve.
 */
export function Eventos({ onVolver }: { onVolver: () => void }) {
  const [eventos, setEventos] = useState<Evento[] | null>(null);
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [nombre, setNombre] = useState('');
  const [fecha, setFecha] = useState(hoy);

  const recargar = () =>
    listarEventos()
      .then((e) => {
        setEventos(e);
        setError('');
      })
      .catch((e: Error) => setError(e.message));

  useEffect(() => {
    recargar();
  }, []);

  // Cada acción recarga la lista entera después: así el conteo de partidas y
  // la marca de "mostrando" salen siempre del servidor, no de una suposición.
  const correr = async (accion: () => Promise<unknown>) => {
    setOcupado(true);
    setError('');
    try {
      await accion();
      await recargar();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setOcupado(false);
    }
  };

  const crear = async () => {
    if (!fecha) return;
    const ok = await correr(() => crearEvento(nombre.trim(), fecha));
    if (ok) {
      setNombre('');
      setFecha(hoy());
    }
  };

  return (
    <>
      <Encabezado titulo="Eventos" onVolver={onVolver} />
      <div className="pantalla">
        {error && <p className="aviso-faltan">{error}</p>}

        {eventos === null ? (
          !error && <p className="sub">Leyendo…</p>
        ) : eventos.length === 0 ? (
          <p className="sub">Todavía no hay eventos.</p>
        ) : (
          <ul className="lista-eventos">
            {eventos.map((e) => (
              <li key={e.id} className={e.mostrando ? 'evento mostrando' : 'evento'}>
                <div className="evento-datos">
                  <strong>{e.nombre}</strong>
                  <span className="leyenda">
                    {aDiaMesAnio(e.fecha)} · {e.partidas} {e.partidas === 1 ? 'partida' : 'partidas'}
                  </span>
                </div>
                {e.mostrando ? (
                  <span className="etiqueta-chica">En pantalla</span>
                ) : (
                  <button
                    className="evento-mostrar"
                    disabled={ocupado}
                    onClick={() => correr(() => mostrarEvento(e.id))}
                  >
                    Mostrar
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        <form
          id="form-evento"
          className="tarjeta-formulario"
          onSubmit={(ev) => {
            ev.preventDefault();
            crear();
          }}
        >
          <div className="campo">
            <label htmlFor="evento-nombre">Nombre del evento</label>
            <input
              id="evento-nombre"
              type="text"
              placeholder="Congreso de Nutrición"
              maxLength={100}
              value={nombre}
              onChange={(ev) => setNombre(ev.target.value)}
            />
          </div>
          <div className="campo">
            <label htmlFor="evento-fecha">Fecha</label>
            {/* El `type="date"` nativo muestra la fecha en el formato del idioma
                del navegador (mm/dd/aaaa en inglés) y no se puede forzar. Por
                eso va transparente ENCIMA de un texto en dd/mm/aaaa: se ve el
                texto, y el toque cae en el nativo y abre su calendario. */}
            <div className="campo-fecha">
              <input
                type="text"
                readOnly
                tabIndex={-1}
                aria-hidden
                placeholder="dd/mm/aaaa"
                value={fecha ? aDiaMesAnio(fecha) : ''}
              />
              <span className="icono-fecha">
                <Calendario color="var(--vk-texto-secundario)" />
              </span>
              <input
                id="evento-fecha"
                type="date"
                className="fecha-nativa"
                value={fecha}
                onChange={(ev) => setFecha(ev.target.value)}
                // En Chrome de escritorio el clic en el campo no abre el
                // calendario, sólo el ícono; showPicker lo abre igual. Puede
                // tirar (navegador viejo, iframe): ahí queda el comportamiento
                // nativo, que en Safari del iPad ya abre el calendario.
                onClick={(ev) => {
                  try {
                    ev.currentTarget.showPicker();
                  } catch {
                    /* nativo */
                  }
                }}
              />
            </div>
          </div>
        </form>

        <button
          type="submit"
          form="form-evento"
          className="primario grande"
          disabled={ocupado || !nombre.trim() || !fecha}
        >
          Crear evento
        </button>
      </div>
    </>
  );
}
