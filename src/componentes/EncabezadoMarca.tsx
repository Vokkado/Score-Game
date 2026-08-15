import logo from '../assets/icon.png';
import { Trofeo } from './Iconos';

/**
 * Isotipo + wordmark, réplica de la marca izquierda del `Topbar` del Frontend
 * (logo + "Vokkado" en Alan Sans ExtraBold), un poco más grande porque acá es
 * la identidad de toda la pantalla y no comparte espacio con una flecha atrás.
 */
export function EncabezadoMarca({ onScoreboard }: { onScoreboard?: () => void }) {
  return (
    <div className="marca-header">
      <img src={logo} alt="" className="marca-logo" />
      <span className="marca-wordmark">Vokkado</span>

      {/* Atajo a la pantalla de tabla de posiciones, para dejarla puesta en el
          monitor del stand. Va acá y no en el cuerpo de la pantalla porque no
          es parte del juego: lo usa el equipo, no quien viene a jugar. */}
      {onScoreboard && (
        <button
          type="button"
          className="boton-trofeo"
          onClick={onScoreboard}
          aria-label="Ver la tabla de posiciones en pantalla completa"
          title="Tabla de posiciones"
        >
          <Trofeo size={24} color="var(--vk-primary-dark)" />
        </button>
      )}
    </div>
  );
}
