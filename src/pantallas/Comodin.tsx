import type { Wildcard } from '../game/engine';
import { Insignia } from '../componentes/Insignia';

/**
 * El comodín no puntúa. Es el momento del juego donde Vokkado muestra criterio
 * en vez de número: hay productos a los que no corresponde ponerles puntaje.
 */
export function Comodin({ wildcard, onSeguir }: { wildcard: Wildcard; onSeguir: () => void }) {
  return (
    <div className="pantalla">
      <div className="barra-superior">
        <span>Producto extra</span>
        <span>No suma ni resta puntos</span>
      </div>

      <img className="foto" src={`/products/${wildcard.image}`} alt={wildcard.name} />

      <p className="nombre-producto">{wildcard.name}</p>
      <p className="marca">{wildcard.brand}</p>

      {/* La app muestra la botella con el grado en vez de un número. */}
      <div className="comparacion">
        <div className="columna-insignia destacada">
          <span className="etiqueta">Puntaje</span>
          <Insignia puntaje={null} tamano="lg" graduacion={wildcard.alcohol_graduation} />
        </div>
      </div>

      <div className="comodin">
        <h2>Sin puntaje</h2>
        <p>{wildcard.explanation}</p>
      </div>

      <div className="espaciador" />

      <button className="primario" onClick={onSeguir}>
        Ver mi resultado
      </button>
    </div>
  );
}
