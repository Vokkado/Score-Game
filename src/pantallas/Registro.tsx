import { useState } from 'react';
import type { Player } from '../game/engine';
import type { StoredGame } from '../game/storage';
import { Campo } from '../componentes/Campo';
import { Casilla } from '../componentes/Casilla';
import { Encabezado } from '../componentes/Encabezado';
import { Info } from '../componentes/Iconos';

/** Formulario en blanco. Vive acá porque App lo usa para limpiar el borrador. */
export const PLAYER_VACIO: Player = {
  nombre: '',
  apellido: '',
  email: '',
  telefono: '',
  profesion: '',
  // Viene marcada: con fila en el stand nadie se frena a marcar una casilla
  // extra, y el beneficio a futuro es parte de lo que se ofrece. Queda a la
  // vista y se desmarca de un toque para quien no lo quiera.
  consent: true,
};

interface Props {
  /** El borrador vive en App: si la persona vuelve a Inicio, no se pierde. */
  valores: Player;
  onCambiar: (p: Player) => void;
  onListo: (p: Player) => void;
  onVolver: () => void;
  yaJugo: (email: string) => Promise<StoredGame | null>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Los obligatorios. El teléfono es el único opcional. */
type CampoId = 'nombre' | 'apellido' | 'email' | 'profesion';

const ORDEN: CampoId[] = ['nombre', 'apellido', 'email', 'profesion'];

type Errores = Partial<Record<CampoId, string>>;

function validar(v: Player): Errores {
  const e: Errores = {};
  if (!v.nombre.trim()) e.nombre = 'Escribí tu nombre';
  if (!v.apellido.trim()) e.apellido = 'Escribí tu apellido';
  if (!v.email.trim()) e.email = 'Escribí tu correo';
  else if (!EMAIL_RE.test(v.email.trim())) e.email = 'Ese correo no parece válido';
  if (!v.profesion.trim()) e.profesion = 'Contanos a qué te dedicás o de dónde venís';
  return e;
}

export function Registro({ valores, onCambiar, onListo, onVolver, yaJugo }: Props) {
  // Qué campos ya tocó la persona: sólo se le marca en rojo lo que pasó por sus
  // manos. Ver un formulario todo en rojo antes de escribir nada espanta.
  const [tocado, setTocado] = useState<Partial<Record<CampoId, boolean>>>({});
  // Al intentar empezar sí se muestra todo lo que falta, tocado o no.
  const [intento, setIntento] = useState(false);
  const [errorEmail, setErrorEmail] = useState('');
  const [verificando, setVerificando] = useState(false);

  const errores = validar(valores);
  const faltan = Object.keys(errores).length > 0;

  const set = (campo: keyof Player, valor: string | boolean) =>
    onCambiar({ ...valores, [campo]: valor });

  /** El error de un campo, sólo si corresponde mostrarlo todavía. */
  const errorDe = (campo: CampoId): string | undefined => {
    if (campo === 'email' && errorEmail) return errorEmail;
    if (!intento && !tocado[campo]) return undefined;
    return errores[campo];
  };

  const enviar = async () => {
    setIntento(true);
    setErrorEmail('');

    if (faltan) {
      // Llevar el foco al primer campo que falta: con seis campos, "revisá lo
      // que está en rojo" no alcanza si el que falta quedó fuera de pantalla.
      const primero = ORDEN.find((c) => errores[c]);
      if (primero) document.getElementById(primero)?.focus();
      return;
    }

    setVerificando(true);
    try {
      // Hay premios de por medio: un intento por persona. El servidor valida lo
      // mismo cuando hay red; esto es la barrera que funciona sin conexión.
      const previo = await yaJugo(valores.email);
      if (previo) {
        setErrorEmail(
          `Ese correo ya jugó y sacó ${previo.points} puntos. Un intento por persona.`,
        );
        document.getElementById('email')?.focus();
        return;
      }
      onListo({
        nombre: valores.nombre.trim(),
        apellido: valores.apellido.trim(),
        email: valores.email.trim().toLowerCase(),
        telefono: valores.telefono.trim(),
        profesion: valores.profesion.trim(),
        consent: valores.consent,
      });
    } finally {
      setVerificando(false);
    }
  };

  return (
    <>
      <Encabezado titulo="Datos para contactarte" onVolver={onVolver} />
      <div className="pantalla">
        <div className="aviso-info">
          <Info size={24} color="var(--vk-info)" />
          <p>
            Lo necesitamos para armar la tabla de posiciones y contactar a los ganadores.
            Y <strong>no sólo eso</strong>: queremos tu contacto para mandarte beneficios
            en un futuro si aceptás.
          </p>
        </div>

        {/* Los campos van sobre una tarjeta blanca: el formulario se lee como
            una sola cosa y no como seis controles sueltos sobre el fondo. */}
        <div className="tarjeta-formulario">
          <Campo
            id="nombre"
            label="Nombre"
            value={valores.nombre}
            onChange={(e) => set('nombre', e.target.value)}
            onBlur={() => setTocado((t) => ({ ...t, nombre: true }))}
            autoComplete="given-name"
            error={errorDe('nombre')}
          />

          <Campo
            id="apellido"
            label="Apellido"
            placeholder="Tu apellido"
            value={valores.apellido}
            onChange={(e) => set('apellido', e.target.value)}
            onBlur={() => setTocado((t) => ({ ...t, apellido: true }))}
            autoComplete="family-name"
            error={errorDe('apellido')}
          />

          <Campo
            id="email"
            label="Correo electrónico"
            tipo="email"
            value={valores.email}
            onChange={(e) => {
              // El "ya jugó" es sobre el correo anterior: al corregirlo deja de
              // aplicar, y dejarlo puesto haría pensar que sigue bloqueado.
              if (errorEmail) setErrorEmail('');
              set('email', e.target.value);
            }}
            onBlur={() => setTocado((t) => ({ ...t, email: true }))}
            autoComplete="email"
            error={errorDe('email')}
          />

          <Campo
            id="profesion"
            label="Profesión o institución"
            placeholder="Nutricionista, Facultad, consultorio…"
            value={valores.profesion}
            onChange={(e) => set('profesion', e.target.value)}
            onBlur={() => setTocado((t) => ({ ...t, profesion: true }))}
            error={errorDe('profesion')}
          />

          <Campo
            id="telefono"
            label="Teléfono (opcional)"
            tipo="tel"
            value={valores.telefono}
            onChange={(e) => set('telefono', e.target.value)}
            autoComplete="tel"
          />
        </div>

        <Casilla
          label="Quiero recibir novedades y beneficios a futuro"
          descripcion="¡Te vamos a contactar para que recibas novedades y tus beneficios más adelante!"
          marcada={valores.consent}
          onCambiar={() => set('consent', !valores.consent)}
        />

        {intento && faltan && (
          <p className="aviso-faltan" role="alert">
            Faltan datos: revisá los campos marcados en rojo.
          </p>
        )}

        <div className="espaciador" />

        {/* El botón no se deshabilita: un botón gris que no responde no explica
            qué falta. Al tocarlo se marca cada campo y el foco va al primero. */}
        <button className="primario grande" disabled={verificando} onClick={enviar}>
          {verificando ? 'Verificando…' : 'Empezar'}
        </button>
        <button className="secundario" onClick={onVolver} disabled={verificando}>
          Volver
        </button>
      </div>
    </>
  );
}
