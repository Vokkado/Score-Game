import { useState } from 'react';
import type { Player } from '../game/engine';
import type { StoredGame } from '../game/storage';
import { Campo } from '../componentes/Campo';
import { Casilla } from '../componentes/Casilla';
import { Encabezado } from '../componentes/Encabezado';

interface Props {
  onListo: (p: Player) => void;
  onVolver: () => void;
  yaJugo: (email: string) => Promise<StoredGame | null>;
}

export function Registro({ onListo, onVolver, yaJugo }: Props) {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [profesion, setProfesion] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [verificando, setVerificando] = useState(false);

  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const completo = nombre.trim() && apellido.trim() && emailValido;

  const enviar = async () => {
    setError('');
    setVerificando(true);
    try {
      // Hay premios de por medio: un intento por persona. El servidor valida lo
      // mismo cuando hay red; esto es la barrera que funciona sin conexión.
      const previo = await yaJugo(email);
      if (previo) {
        setError(`Ese correo ya jugó y sacó ${previo.points} puntos. Un intento por persona.`);
        return;
      }
      onListo({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        email: email.trim().toLowerCase(),
        telefono: telefono.trim(),
        profesion: profesion.trim(),
        consent,
      });
    } finally {
      setVerificando(false);
    }
  };

  return (
    <>
      <Encabezado titulo="Tus datos" onVolver={onVolver} />
      <div className="pantalla">
        <p className="sub">
          Los necesitamos para armar la tabla de posiciones y avisarles a los ganadores.
        </p>

        <Campo
          id="nombre"
          label="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          autoComplete="given-name"
        />

        <Campo
          id="apellido"
          label="Apellido"
          placeholder="Tu apellido"
          value={apellido}
          onChange={(e) => setApellido(e.target.value)}
          autoComplete="family-name"
        />

        <Campo
          id="email"
          label="Correo electrónico"
          tipo="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          error={error || undefined}
        />

        <Campo
          id="telefono"
          label="Teléfono (opcional)"
          tipo="tel"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          autoComplete="tel"
        />

        <Campo
          id="profesion"
          label="Profesión o institución (opcional)"
          placeholder="Nutricionista, Facultad, consultorio…"
          value={profesion}
          onChange={(e) => setProfesion(e.target.value)}
        />

        <Casilla
          label="Quiero recibir novedades"
          descripcion="Te escribimos sólo si tenemos algo para contarte sobre Vokkado."
          marcada={consent}
          onCambiar={() => setConsent(!consent)}
        />

        <div className="espaciador" />

        <button className="primario" disabled={!completo || verificando} onClick={enviar}>
          {verificando ? 'Verificando…' : 'Empezar'}
        </button>
        <button className="secundario" onClick={onVolver} disabled={verificando}>
          Volver
        </button>
      </div>
    </>
  );
}
