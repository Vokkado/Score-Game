import { useState } from 'react';

interface Props {
  onEnviar: (survey: { nps: number | null; comentario: string }) => void;
}

/**
 * Dos preguntas y nada más. Con fila en el stand, cualquier cosa más larga la
 * abandona la mayoría, y una encuesta a medias no sirve para nada.
 */
export function Encuesta({ onEnviar }: Props) {
  const [nps, setNps] = useState<number | null>(null);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviar = () => {
    setEnviando(true);
    onEnviar({ nps, comentario: comentario.trim() });
  };

  return (
    <div className="pantalla">
      <h1>¿Qué te pareció?</h1>
      <p className="sub">Dos preguntas rápidas y terminamos.</p>

      <label>Del 0 al 10, ¿qué tan probable es que recomiendes Vokkado a un colega?</label>
      <div className="nps">
        {Array.from({ length: 11 }, (_, i) => (
          <button
            key={i}
            className={nps === i ? 'elegido' : ''}
            onClick={() => setNps(i)}
            aria-pressed={nps === i}
          >
            {i}
          </button>
        ))}
      </div>
      <div className="escala" style={{ marginBottom: 28 }}>
        <span>Nada probable</span>
        <span>Muy probable</span>
      </div>

      <label htmlFor="comentario">¿Qué le agregarías o cambiarías? (opcional)</label>
      <textarea
        id="comentario"
        rows={3}
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        placeholder="Lo que se te ocurra"
      />

      <div className="espaciador" />

      <button className="primario" disabled={enviando} onClick={enviar}>
        {enviando ? 'Guardando…' : 'Terminar'}
      </button>
      <button className="secundario" disabled={enviando} onClick={() => onEnviar({ nps: null, comentario: '' })}>
        Prefiero no contestar
      </button>
    </div>
  );
}
