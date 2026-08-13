import { ChevronIzquierda } from './Iconos';

/**
 * Barra superior. Réplica de `ScreenHeader` del Frontend: chevron de volver a
 * la izquierda dentro de un área táctil de 40px, título centrado en variante
 * sectionTitle y una franja inferior de 1px.
 *
 * El hueco de la derecha se mantiene aunque esté vacío para que el título
 * quede centrado de verdad, igual que en la app.
 */

interface Props {
  titulo: string;
  onVolver?: () => void;
  derecha?: React.ReactNode;
}

export function Encabezado({ titulo, onVolver, derecha }: Props) {
  return (
    <header className="encabezado">
      {onVolver ? (
        <button type="button" className="boton-icono" onClick={onVolver} aria-label="Volver">
          <ChevronIzquierda size={22} color="var(--vk-titulo)" />
        </button>
      ) : (
        <span className="hueco" />
      )}
      <h1 className="titulo-encabezado">{titulo}</h1>
      {derecha ?? <span className="hueco" />}
    </header>
  );
}
