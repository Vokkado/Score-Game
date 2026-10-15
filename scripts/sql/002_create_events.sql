-- Eventos del juego: uno por día. Permite arrancar un evento nuevo sin vaciar
-- las tablas. Cada partida cae en el evento cuya `fecha` coincide con el día
-- de su `played_at` (hora de Montevideo); el ranking muestra sólo el último
-- evento con fecha <= hoy.
--
-- Uso:
--   PGURL="postgresql://..." npm run db:apply -- scripts/sql/002_create_events.sql
--
-- Arrancar un evento nuevo:
--   INSERT INTO event_game.events (nombre, fecha) VALUES ('Congreso X', '2026-11-20');
--
-- Las partidas que ya estaban quedan con event_id NULL (fuera de todo ranking)
-- hasta asignarlas a mano:
--   UPDATE event_game.players SET event_id = (SELECT id FROM event_game.events WHERE fecha = '2026-09-19')
--   WHERE (played_at AT TIME ZONE 'America/Montevideo')::date = '2026-09-19';

CREATE TABLE IF NOT EXISTS event_game.events (
  id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  fecha  DATE NOT NULL UNIQUE
);

-- Nullable a propósito: una partida jugada un día sin evento cargado (pruebas)
-- se guarda igual en vez de fallar y quedar reintentándose desde el iPad.
ALTER TABLE event_game.players
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES event_game.events(id);

-- Un intento por email dentro de cada evento, no en toda la tabla. Con
-- event_id NULL no hay restricción (los NULL son distintos entre sí).
DROP INDEX IF EXISTS event_game.event_game_players_email_unique_idx;
CREATE UNIQUE INDEX IF NOT EXISTS event_game_players_event_email_unique_idx
  ON event_game.players (event_id, lower(email));
