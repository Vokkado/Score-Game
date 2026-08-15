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
 */
export function Encuesta({ onEnviar }: Props) {
  const [gusta, setGusta] = useState<number | null>(null);
  const [nps, setNps] = useState<number | null>(null);
  const [utilidad, setUtilidad] = useState<number | null>(null);
  const [comentario, setComentario] = useState('');
  const [intento, setIntento] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const faltaGusta = gusta === null;
  const faltaNps = nps === null;
  const faltaUtilidad = utilidad === null;
  const faltaComentario = comentario.trim().length === 0;
  const faltan = faltaGusta || faltaNps || faltaUtilidad || faltaComentario;

  const enviar = () => {
    setIntento(true);
    if (faltan) {
      // Al primero que falta, igual que en el registro: con cuatro preguntas,
      // "revisá lo que está en rojo" no alcanza si quedó fuera de pantalla.
      const primero = faltaGusta
        ? 'p-gusta'
        : faltaNps
          ? 'p-nps'
          : faltaUtilidad
            ? 'p-utilidad'
            : 'comentario';
      document.getElementById(primero)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      if (primero === 'comentario') document.getElementById('comentario')?.focus();
      return;
    }
    setEnviando(true);
    onEnviar({ gusta, nps, utilidad, comentario: comentario.trim() });
  };

  const err = (falta: boolean) => (intento && falta ? 'Elegí un valor del 1 al 10' : undefined);

  return (
    <div className="pantalla pantalla-encuesta">
      <h1>¿Qué te pareció?</h1>
      <p className="sub">Cuatro preguntas rápidas y terminamos.</p>

      <EscalaPuntos
        id="p-gusta"
        label="Del 1 al 10, ¿cuánto te gusta Vokkado?"
        extremoBajo="Nada"
        extremoAlto="Muchísimo"
        valor={gusta}
        onElegir={setGusta}
        error={err(faltaGusta)}
      />

      <EscalaPuntos
        id="p-nps"
        label="Del 1 al 10, ¿qué tan probable es que le recomiendes Vokkado a un colega?"
        extremoBajo="Nada probable"
        extremoAlto="Muy probable"
        valor={nps}
        onElegir={setNps}
        error={err(faltaNps)}
      />

      <EscalaPuntos
        id="p-utilidad"
        label="Del 1 al 10, ¿qué tan útil te resulta la herramienta para nutricionistas?"
        extremoBajo="Nada útil"
        extremoAlto="Muy útil"
        valor={utilidad}
        onElegir={setUtilidad}
        error={err(faltaUtilidad)}
      />

      <div className="campo">
        <label htmlFor="comentario">
          ¿Qué sugerencias tenés para la herramienta o para la app?
        </label>
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
