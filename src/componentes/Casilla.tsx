import { Tilde } from './Iconos';

/**
 * Casilla de verificación. Réplica de `AppCheckbox` del Frontend: es una
 * tarjeta completa clickeable con borde de 2px que cambia de color al marcarse,
 * y el cuadrito de 22px a la derecha, no a la izquierda.
 */

interface Props {
  label: string;
  descripcion?: string;
  marcada: boolean;
  onCambiar: () => void;
}

export function Casilla({ label, descripcion, marcada, onCambiar }: Props) {
  return (
    <button
      type="button"
      className={`casilla ${marcada ? 'marcada' : ''}`}
      onClick={onCambiar}
      aria-pressed={marcada}
    >
      <span className="casilla-texto">
        <span className="casilla-label">{label}</span>
        {descripcion && <span className="casilla-desc">{descripcion}</span>}
      </span>
      <span className="casilla-caja">{marcada && <Tilde size={14} color="#fff" />}</span>
    </button>
  );
}
