-- Schema standalone del minijuego Score-Game. NO es una migración del
-- Backend (ver CONTEXT.md §2): se corre a mano, una sola vez, contra la
-- misma Neon que usa el Backend, ANTES de deployar el endpoint /api/event-game.
--
-- Uso:
--   PGURL="postgresql://..." npm run db:apply -- scripts/sql/001_create_event_game_schema.sql

CREATE SCHEMA IF NOT EXISTS event_game;

CREATE TABLE IF NOT EXISTS event_game.players (
  id         UUID PRIMARY KEY,        -- SIN gen_random_uuid(): lo genera el cliente
                                       -- (crypto.randomUUID()), así un reintento de
                                       -- red es idempotente por PK.
  nombre     TEXT NOT NULL,
  apellido   TEXT NOT NULL,
  email      TEXT NOT NULL,
  telefono   TEXT,
  profesion  TEXT,
  consent    BOOLEAN NOT NULL DEFAULT false,
  points     INTEGER NOT NULL CHECK (points BETWEEN 0 AND 500),
  ms         INTEGER NOT NULL CHECK (ms >= 0),
  played_at  TIMESTAMPTZ NOT NULL,    -- viene del cliente (Date.now() al terminar
                                       -- la partida). NUNCA default now(): puede
                                       -- subirse horas después si no había wifi.
  -- Encuesta final: tres escalas 1-10 (§8r) + comentario. Nullable en la
  -- tabla aunque hoy la UI las exige todas: partidas viejas (antes de §8q/8r)
  -- se subieron con el juego de la mañana y no tienen estos campos.
  puntaje_general   SMALLINT CHECK (puntaje_general BETWEEN 1 AND 10),
  acuerdo_puntajes  SMALLINT CHECK (acuerdo_puntajes BETWEEN 1 AND 10),
  nps               SMALLINT CHECK (nps BETWEEN 1 AND 10),
  comentario        TEXT,
  synced_at  TIMESTAMPTZ NOT NULL DEFAULT now() -- cuándo llegó al servidor, distinto de played_at.
);

CREATE UNIQUE INDEX IF NOT EXISTS event_game_players_email_unique_idx
  ON event_game.players (lower(email));

CREATE TABLE IF NOT EXISTS event_game.rounds (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id  UUID NOT NULL REFERENCES event_game.players(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  guess      SMALLINT NOT NULL CHECK (guess BETWEEN 0 AND 100),
  real_score SMALLINT NOT NULL CHECK (real_score BETWEEN 0 AND 100),
  points     SMALLINT NOT NULL CHECK (points BETWEEN 0 AND 100),
  ms         INTEGER NOT NULL CHECK (ms >= 0)
);

CREATE INDEX IF NOT EXISTS event_game_rounds_player_id_idx  ON event_game.rounds (player_id);
CREATE INDEX IF NOT EXISTS event_game_rounds_product_id_idx ON event_game.rounds (product_id);
