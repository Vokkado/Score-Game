import { useState } from 'react';
import type { Survey } from '../game/storage';
import { EscalaPuntos } from '../componentes/EscalaPuntos';
import { Info } from '../componentes/Iconos';

interface Props {
  onEnviar: (survey: Survey) => void;
}

/**
 * Encuesta final. Tres escalas y un comentario, **todo obligatorio**.
 *
 * Antes eran dos preguntas y había un botón de "Prefiero no contestar": se
 * sacó a pedido del usuario. El razonamiento original —con fila en el stand,
 * cualquier cosa más larga la abandona la mayoría— sigue siendo cierto, así
 * que las tres escalas se responden de un toque cada una y lo único que hay
 * que escribir es el comentario final.
 *
 * **Las preguntas sólo hablan de lo que la persona vivió** (§8r): jugó cinco
 * rondas y alguien del stand le contó de la app. Preguntarle qué tan útil le
 * resulta la herramienta para nutricionistas, como en la primera versión, era
 * pedirle que evalúe algo que capaz ni vio.
 */
export function Encuesta({ onEnviar }: Props) {
  const [general, setGeneral] = useState<number | null>(null);
  const [acuerdo, setAcuerdo] = useState<number | null>(null);
  const [nps, setNps] = useState<number | null>(null);
  const [comentario, setComentario] = useState('');
  const [intento, setIntento] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const faltaGeneral = general === null;
  const faltaAcuerdo = acuerdo === null;
  const faltaNps = nps === null;
  const faltaComentario = comentario.trim().length === 0;
  const faltan = faltaGeneral || faltaAcuerdo || faltaNps || faltaComentario;

  const enviar = () => {
    setIntento(true);
    if (faltan) {
      // Al primero que falta, igual que en el registro: con cuatro preguntas,
      // "revisá lo que está en rojo" no alcanza si quedó fuera de pantalla.
      const primero = faltaGeneral
        ? 'p-general'
        : faltaAcuerdo
          ? 'p-acuerdo'
          : faltaNps
            ? 'p-nps'
            : 'comentario';
      document.getElementById(primero)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      if (primero === 'comentario') document.getElementById('comentario')?.focus();
      return;
    }
    setEnviando(true);
    onEnviar({ general, acuerdo, nps, comentario: comentario.trim() });
  };

  const err = (falta: boolean) => (intento && falta ? 'Elegí un valor del 1 al 10' : undefined);

  return (
    <div className="pantalla pantalla-encuesta">
      <h1>¿Qué te pareció?</h1>
      <p className="sub">Cuatro preguntas rápidas y terminamos.</p>

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

      {/* La que más le sirve al producto: el que contesta es nutricionista y
          acaba de ver ocho desgloses reales. Si el motor puntúa raro, acá es
          donde va a aparecer. */}
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
        label="Del 1 al 10, ¿qué tan probable es que le recomiendes la app de Vokkado a un paciente?"
        extremoBajo="Nada probable"
        extremoAlto="Muy probable"
        valor={nps}
        onElegir={setNps}
        error={err(faltaNps)}
      />

      <div className="campo">
        <label htmlFor="comentario">
          ¿Qué sugerencias tenés sobre la app o la herramienta para nutricionistas?
        </label>
        {/* En vez de dar por hecho que la vio —el error de la versión
            anterior—, la invita a verla. */}
        <p className="ayuda-campo">
          Si todavía no la viste, pasá por el stand después de jugar y te la mostramos.
        </p>
        <textarea
          id="comentario"
          rows={3}
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder="Lo que se te ocurra: nos sirve todo"
          aria-invalid={intento && faltaComentario ? true : undefined}
          className={intento && faltaComentario ? 'con-error' : ''}
        />
        {intento && faltaComentario && (
          <p className="mensaje-error">Contanos algo, aunque sea corto</p>
        )}
      </div>

      <div className="aviso-info">
        <Info size={24} color="var(--vk-info)" />
        <p>
          Si se te ocurre algo más, contale a cualquier persona del stand o escribinos a{' '}
          <strong>contact@vokkado.com</strong>. ¡Tus aportes nos ayudan muchísimo!
        </p>
      </div>

      {intento && faltan && (
        <p className="aviso-faltan" role="alert">
          Faltan respuestas: son cuatro y todas cuentan.
        </p>
      )}

      <div className="espaciador" />

      <button className="primario grande" disabled={enviando} onClick={enviar}>
        {enviando ? 'Guardando…' : 'Terminar'}
      </button>
    </div>
  );
}
