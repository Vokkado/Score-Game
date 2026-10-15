import { useState } from 'react';
import type { Survey } from '../game/storage';
import { EscalaPuntos } from '../componentes/EscalaPuntos';
import { Info } from '../componentes/Iconos';

interface Props {
  onEnviar: (survey: Survey) => void;
}

/**
 * Encuesta final. Tres escalas, **todas obligatorias**.
 *
 * Antes eran dos preguntas y había un botón de "Prefiero no contestar": se
 * sacó a pedido del usuario. El razonamiento original —con fila en el stand,
 * cualquier cosa más larga la abandona la mayoría— sigue siendo cierto, así
 * que las tres escalas se responden de un toque cada una.
 *
 * Hubo una cuarta, el comentario libre ("¿Qué sugerencias tenés sobre la
 * app?"), que se sacó de la pantalla a pedido del usuario. El campo
 * `comentario` sigue viajando, vacío, porque el backend y la columna lo
 * esperan.
 *
 * **Las preguntas sólo hablan de lo que la persona vivió** (§8r): jugó cinco
 * rondas y alguien del stand le contó de la app. Preguntarle qué tan útil le
 * resulta la herramienta para nutricionistas, como en la primera versión, era
 * pedirle que evalúe algo que capaz ni vio. Por eso tampoco se menciona más en
 * la pregunta abierta, que ahora dice sólo "la app" (§8w).
 */
export function Encuesta({ onEnviar }: Props) {
  const [general, setGeneral] = useState<number | null>(null);
  const [acuerdo, setAcuerdo] = useState<number | null>(null);
  const [nps, setNps] = useState<number | null>(null);
  const [intento, setIntento] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const faltaGeneral = general === null;
  const faltaAcuerdo = acuerdo === null;
  const faltaNps = nps === null;
  const faltan = faltaGeneral || faltaAcuerdo || faltaNps;

  const enviar = () => {
    setIntento(true);
    if (faltan) {
      // Al primero que falta, igual que en el registro: con tres preguntas,
      // "revisá lo que está en rojo" no alcanza si quedó fuera de pantalla.
      const primero = faltaGeneral ? 'p-general' : faltaAcuerdo ? 'p-acuerdo' : 'p-nps';
      document.getElementById(primero)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    setEnviando(true);
    onEnviar({ general, acuerdo, nps, comentario: '' });
  };

  const err = (falta: boolean) => (intento && falta ? 'Elegí un valor del 1 al 10' : undefined);

  return (
    <div className="pantalla pantalla-encuesta">
      <h1>¿Qué te pareció?</h1>
      <p className="sub">Tres preguntas rápidas y terminamos.</p>

      {/* Se pasó cinco rondas puntuando productos: ahora le toca puntuar a
          Vokkado. Además de la simetría, así la pregunta no repite el título
          de la pantalla ("¿Qué te pareció?"). */}
      <EscalaPuntos
        id="p-general"
        label="Ahora te toca a vos: ¿qué puntaje le ponés a Vokkado?"
        extremoBajo="Muy malo"
        extremoAlto="Muy bueno"
        valor={general}
        onElegir={setGeneral}
        error={err(faltaGeneral)}
      />

      {/* La que más le sirve al producto: quien contesta acaba de ver cinco
          desgloses reales. Si el motor puntúa raro, acá es donde va a
          aparecer. */}
      <EscalaPuntos
        id="p-acuerdo"
        label="Del 1 al 10, ¿qué tan de acuerdo estás con los puntajes que viste?"
        extremoBajo="Nada de acuerdo"
        extremoAlto="Muy de acuerdo"
        valor={acuerdo}
        onElegir={setAcuerdo}
        error={err(faltaAcuerdo)}
      />

      <EscalaPuntos
        id="p-nps"
        label="Del 1 al 10, ¿qué tan probable es que uses la app de Vokkado en tu día a día?"
        extremoBajo="Nada probable"
        extremoAlto="Muy probable"
        valor={nps}
        onElegir={setNps}
        error={err(faltaNps)}
      />

      <div className="aviso-info">
        <Info size={24} color="var(--vk-info)" />
        <p>
          Si se te ocurre algo más, contale a cualquier persona del stand o escribinos a{' '}
          <strong>contact@vokkado.com</strong>. ¡Tus aportes nos ayudan muchísimo!
        </p>
      </div>

      {intento && faltan && (
        <p className="aviso-faltan" role="alert">
          Faltan respuestas: son tres y todas cuentan.
        </p>
      )}

      <div className="espaciador" />

      <button className="primario grande" disabled={enviando} onClick={enviar}>
        {enviando ? 'Guardando…' : 'Terminar'}
      </button>
    </div>
  );
}
