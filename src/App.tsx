import { useEffect, useState } from 'react';
import type { Product, Player, Round } from './game/engine';
import { sortear, scoreGuess, totalPoints, totalMs } from './game/engine';
import {
  saveGame,
  findByEmail,
  leerBolsa,
  guardarBolsa,
  type StoredGame,
} from './game/storage';
import { Registro, BORRADOR_VACIO, type Borrador } from './pantallas/Registro';
import { Scoreboard } from './pantallas/Scoreboard';
import { Jugada } from './pantallas/Jugada';
import { Feedback } from './pantallas/Feedback';
import { Resultado } from './pantallas/Resultado';
import { Encuesta } from './pantallas/Encuesta';
import { Inicio } from './pantallas/Inicio';

type Fase =
  | { t: 'cargando' }
  | { t: 'inicio' }
  | { t: 'registro' }
  | { t: 'jugando' }
  | { t: 'feedback'; round: Round }
  | { t: 'resultado' }
  | { t: 'encuesta' }
  | { t: 'gracias' };

/** La única ruta que existe además del juego. */
const RUTA_SCOREBOARD = '/scoreboard';

/**
 * Ruteo mínimo, sin librería: el juego tiene una sola pantalla aparte. Un
 * router entero acá sería más peso en el bundle que viaja al iPad que todo lo
 * que resuelve. `popstate` cubre el botón de atrás del navegador.
 *
 * En producción esto necesita que el hosting devuelva `index.html` para
 * cualquier ruta, si no `/scoreboard` da 404 al entrar directo o al recargar:
 * de eso se ocupa `vercel.json`.
 */
function useRuta(): [string, (r: string) => void] {
  const [ruta, setRuta] = useState(() => window.location.pathname.replace(/\/+$/, '') || '/');

  useEffect(() => {
    const alVolver = () => setRuta(window.location.pathname.replace(/\/+$/, '') || '/');
    window.addEventListener('popstate', alVolver);
    return () => window.removeEventListener('popstate', alVolver);
  }, []);

  const ir = (destino: string) => {
    window.history.pushState({}, '', destino);
    setRuta(destino);
  };

  return [ruta, ir];
}

export function App() {
  const [ruta, ir] = useRuta();
  const [pool, setPool] = useState<Product[]>([]);
  const [fase, setFase] = useState<Fase>({ t: 'cargando' });
  const [player, setPlayer] = useState<Player | null>(null);
  // El formulario a medio llenar vive acá, no en Registro: si la persona toca
  // "Volver" sin querer y vuelve a entrar, encuentra sus datos donde los dejó.
  // Se limpia sólo cuando arranca otra persona — son datos de contacto ajenos.
  const [borrador, setBorrador] = useState<Borrador>(BORRADOR_VACIO);
  const [ronda, setRonda] = useState<Product[]>([]);
  const [indice, setIndice] = useState(0);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [gameId, setGameId] = useState<string>('');

  // Los datos van en el bundle. Si esto falla, el juego no arranca — mejor que
  // arranque a medias y falle en pleno stand.
  useEffect(() => {
    fetch('/products.json')
      .then((r) => r.json())
      .then((p) => {
        setPool(p);
        setFase({ t: 'inicio' });
      })
      .catch(() => setFase({ t: 'cargando' }));
  }, []);

  const empezar = (p: Player) => {
    // La bolsa vive fuera de React (localStorage): tiene que sobrevivir a que
    // alguien recargue la app en pleno evento, no sólo a la partida.
    const { ronda: nueva, yaSalieron } = sortear(pool, leerBolsa());
    guardarBolsa(yaSalieron);

    setPlayer(p);
    setRonda(nueva);
    setIndice(0);
    setRounds([]);
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

  // El scoreboard va antes que todo: no depende del pool ni de la fase del
  // juego, sólo lee las partidas guardadas. Así entra directo aunque
  // `products.json` todavía no haya cargado.
  if (ruta === RUTA_SCOREBOARD) {
    return <Scoreboard onVolver={() => ir('/')} />;
  }

  if (fase.t === 'cargando') {
    return (
      <div className="pantalla">
        <h1>Cargando…</h1>
      </div>
    );
  }

  if (fase.t === 'inicio') {
    return (
      <Inicio
        onEmpezar={() => setFase({ t: 'registro' })}
        onScoreboard={() => ir(RUTA_SCOREBOARD)}
      />
    );
  }

  if (fase.t === 'registro') {
    return (
      <Registro
        valores={borrador}
        onCambiar={setBorrador}
        onListo={empezar}
        onVolver={() => setFase({ t: 'inicio' })}
        yaJugo={findByEmail}
      />
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
    <div className="pantalla pantalla-gracias">
      <div className="espaciador" />
      <h1 className="display">¡Gracias por jugar!</h1>
      <p className="gracias-texto">Tu resultado quedó registrado.</p>
      <p className="gracias-hora">Los premios se entregan a partir de las 17:00 hs.</p>
      <div className="espaciador" />
      {/* "Finalizar" y no "Que juegue otra persona": lo toca quien acaba de
          jugar, no el siguiente, y desde su lugar lo que hace es terminar. */}
      <button
        className="primario grande"
        onClick={() => {
          setPlayer(null);
          // Acá sí se borra el formulario: lo que sigue es otra persona, y sus
          // datos de contacto no pueden aparecer precargados.
          setBorrador(BORRADOR_VACIO);
          setFase({ t: 'inicio' });
        }}
      >
        Finalizar
      </button>
    </div>
  );
}
