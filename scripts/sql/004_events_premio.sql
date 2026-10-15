-- Si el evento tiene premio. Se cambia desde `/eventos` (casilla "Hay premio"
-- del evento en pantalla). Sin premio, el juego oculta todo lo del premio:
-- el póster y el horario de /scoreboard, el chip del 1º puesto en la tabla y
-- el aviso de la pantalla final.
--
-- DEFAULT true: los eventos que ya existen siguen mostrando el premio, como
-- hasta ahora.
--
-- Uso:
--   PGURL="postgresql://..." npm run db:apply -- scripts/sql/004_events_premio.sql

ALTER TABLE event_game.events
  ADD COLUMN IF NOT EXISTS hay_premio BOOLEAN NOT NULL DEFAULT true;
