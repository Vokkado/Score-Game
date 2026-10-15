-- Qué evento muestra el ranking. Se elige a mano desde la ruta `/eventos` del
-- juego; ya no es "el último con fecha <= hoy". Sin ninguno marcado, el
-- ranking queda vacío.
--
-- Uso:
--   PGURL="postgresql://..." npm run db:apply -- scripts/sql/003_events_mostrando.sql

ALTER TABLE event_game.events
  ADD COLUMN IF NOT EXISTS mostrando BOOLEAN NOT NULL DEFAULT false;

-- Como máximo un evento marcado a la vez.
CREATE UNIQUE INDEX IF NOT EXISTS event_game_events_mostrando_idx
  ON event_game.events (mostrando) WHERE mostrando;
