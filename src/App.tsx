import { useEffect, useState } from 'react';
import type { Product, Wildcard, Player, Round } from './game/engine';
import { pickRound, scoreGuess, totalPoints, totalMs, shuffle } from './game/engine';
import { saveGame, findByEmail, type StoredGame } from './game/storage';
import { Registro } from './pantallas/Registro';
import { Jugada } from './pantallas/Jugada';
import { Feedback } from './pantallas/Feedback';
import { Comodin } from './pantallas/Comodin';
import { Resultado } from './pantallas/Resultado';
import { Encuesta } from './pantallas/Encuesta';
import { Inicio } from './pantallas/Inicio';

type Fase =
  | { t: 'cargando' }
  | { t: 'inicio' }
  | { t: 'registro' }
  | { t: 'jugando' }
  | { t: 'feedback'; round: Round }
  | { t: 'comodin' }
  | { t: 'resultado' }
  | { t: 'encuesta' }
  | { t: 'gracias' };

export function App() {
  const [pool, setPool] = useState<Product[]>([]);
  const [wildcards, setWildcards] = useState<Wildcard[]>([]);
  const [fase, setFase] = useState<Fase>({ t: 'cargando' });
  const [player, setPlayer] = useState<Player | null>(null);
  const [ronda, setRonda] = useState<Product[]>([]);
  const [indice, setIndice] = useState(0);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [comodin, setComodin] = useState<Wildcard | null>(null);
  const [gameId, setGameId] = useState<string>('');

  // Los datos van en el bundle. Si esto falla, el juego no arranca — mejor que
  // arranque a medias y falle en pleno stand.
  useEffect(() => {
    Promise.all([
      fetch('/products.json').then((r) => r.json()),
      fetch('/wildcards.json').then((r) => r.json()),
    ])
      .then(([p, w]) => {
        setPool(p);
        setWildcards(w);
        setFase({ t: 'inicio' });
      })
      .catch(() => setFase({ t: 'cargando' }));
  }, []);

  const empezar = (p: Player) => {
    setPlayer(p);
    setRonda(pickRound(pool));
    setIndice(0);
    setRounds([]);
    setComodin(shuffle(wildcards)[0] ?? null);
    setGameId(crypto.randomUUID());
    setFase({ t: 'jugando' });
  };

  const responder = (guess: number, ms: number) => {
    const producto = ronda[indice];
    const round: Round = {
      productId: producto.id,
      guess,
      realScore: producto.score,
      points: scoreGuess(guess, producto.score),
      ms,
    };
    setRounds((prev) => [...prev, round]);
    setFase({ t: 'feedback', round });
  };

  const siguiente = () => {
    if (indice + 1 < ronda.length) {
      setIndice(indice + 1);
      setFase({ t: 'jugando' });
    } else if (comodin) {
      setFase({ t: 'comodin' });
    } else {
      setFase({ t: 'resultado' });
    }
  };

  const guardar = async (survey: StoredGame['survey']) => {
    if (!player) return;
    const game: StoredGame = {
      id: gameId,
      email: player.email.trim().toLowerCase(),
      nombre: player.nombre,
      apellido: player.apellido,
      telefono: player.telefono,
      profesion: player.profesion,
      consent: player.consent,
      points: totalPoints(rounds),
      ms: totalMs(rounds),
      playedAt: Date.now(),
      rounds,
      survey,
      synced: false,
    };
    await saveGame(game);
    setFase({ t: 'gracias' });
  };

  if (fase.t === 'cargando') {
    return (
      <div className="pantalla">
        <h1>Cargando…</h1>
      </div>
    );
  }

  if (fase.t === 'inicio') {
    return <Inicio onEmpezar={() => setFase({ t: 'registro' })} />;
  }

  if (fase.t === 'registro') {
    return (
      <Registro onListo={empezar} onVolver={() => setFase({ t: 'inicio' })} yaJugo={findByEmail} />
    );
  }

  if (fase.t === 'jugando') {
    return (
      <Jugada
        key={indice}
        producto={ronda[indice]}
        numero={indice + 1}
        total={ronda.length}
        onResponder={responder}
      />
    );
  }

  if (fase.t === 'feedback') {
    return (
      <Feedback
        producto={ronda[indice]}
        round={fase.round}
        esUltimo={indice + 1 >= ronda.length}
        onSeguir={siguiente}
      />
    );
  }

  if (fase.t === 'comodin' && comodin) {
    return <Comodin wildcard={comodin} onSeguir={() => setFase({ t: 'resultado' })} />;
  }

  if (fase.t === 'resultado') {
    return (
      <Resultado
        rounds={rounds}
        player={player!}
        onSeguir={() => setFase({ t: 'encuesta' })}
      />
    );
  }

  if (fase.t === 'encuesta') {
    return <Encuesta onEnviar={guardar} />;
  }

  return (
    <div className="pantalla">
      <div className="espaciador" />
      <h1 className="display">¡Gracias por jugar!</h1>
      <p className="sub">
        Tu resultado quedó registrado. Los ganadores se anuncian al cierre del evento.
      </p>
      <div className="espaciador" />
      <button
        className="primario"
        onClick={() => {
          setPlayer(null);
          setFase({ t: 'inicio' });
        }}
      >
        Que juegue otra persona
      </button>
    </div>
  );
}
