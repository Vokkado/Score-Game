import { ROUNDS_PER_GAME, SECONDS_PER_ROUND } from '../game/engine';

export function Inicio({ onEmpezar }: { onEmpezar: () => void }) {
  return (
    <div className="pantalla">
      <div className="espaciador" />
      <h1>Score Challenge</h1>
      <p className="sub">
        ¿Cuánto sabés de lo que hay en la góndola? Te mostramos {ROUNDS_PER_GAME} productos
        reales y tenés que adivinar qué puntaje les da Vokkado.
      </p>

      <div className="justificacion">
        <strong>Cómo se juega</strong>
        <br />
        Movés el slider entre 0 y 100 y confirmás. Tenés {SECONDS_PER_ROUND} segundos por
        producto. Cuanto más cerca del puntaje real, más puntos ganás.
      </div>

      <div className="justificacion">
        <strong>Qué estás adivinando</strong>
        <br />
        El Score Vokkado va de 0 a 100 y se calcula <strong>sobre 100 g de producto</strong>,
        combinando calidad de ingredientes, aditivos, perfil nutricional y grado de
        procesamiento. No es el veredicto personalizado que da la app según tu perfil.
      </div>

      <p className="sub">
        Los dos mejores puntajes del día se llevan premio 🦘
      </p>

      <div className="espaciador" />
      <button className="primario" onClick={onEmpezar}>
        Empezar
      </button>
    </div>
  );
}
