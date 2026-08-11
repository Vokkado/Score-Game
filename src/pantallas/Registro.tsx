import { useState } from 'react';
import type { Player } from '../game/engine';
import type { StoredGame } from '../game/storage';

interface Props {
  onListo: (p: Player) => void;
  yaJugo: (email: string) => Promise<StoredGame | null>;
}

export function Registro({ onListo, yaJugo }: Props) {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
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
        setError(`Ese email ya jugó y sacó ${previo.points} puntos. Un intento por persona.`);
        return;
      }
      onListo({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        email: email.trim().toLowerCase(),
        profesion: profesion.trim(),
        consent,
      });
    } finally {
      setVerificando(false);
    }
  };

  return (
    <div className="pantalla">
      <h1>Antes de jugar</h1>
      <p className="sub">Lo necesitamos para armar el ranking y contactar a los ganadores.</p>

      <label htmlFor="nombre">Nombre</label>
      <input
        id="nombre"
        type="text"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        autoComplete="given-name"
        autoCapitalize="words"
      />

      <label htmlFor="apellido">Apellido</label>
      <input
        id="apellido"
        type="text"
        value={apellido}
        onChange={(e) => setApellido(e.target.value)}
        autoComplete="family-name"
        autoCapitalize="words"
      />

      <label htmlFor="email">Email</label>
      <input
        id="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        autoCapitalize="off"
        inputMode="email"
      />

      <label htmlFor="profesion">Profesión o institución (opcional)</label>
      <input
        id="profesion"
        type="text"
        value={profesion}
        onChange={(e) => setProfesion(e.target.value)}
        autoCapitalize="words"
      />

      {error && <p className="error">{error}</p>}

      <label className="checkbox">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>Quiero recibir novedades de Vokkado por email.</span>
      </label>

      <button className="primario" disabled={!completo || verificando} onClick={enviar}>
        {verificando ? 'Verificando…' : 'Jugar'}
      </button>
    </div>
  );
}
