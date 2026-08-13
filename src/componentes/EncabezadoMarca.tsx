import logo from '../assets/icon.png';

/**
 * Isotipo + wordmark, réplica de la marca izquierda del `Topbar` del Frontend
 * (logo + "Vokkado" en Alan Sans ExtraBold), un poco más grande porque acá es
 * la identidad de toda la pantalla y no comparte espacio con una flecha atrás.
 */
export function EncabezadoMarca() {
  return (
    <div className="marca-header">
      <img src={logo} alt="" className="marca-logo" />
      <span className="marca-wordmark">Vokkado</span>
    </div>
  );
}
