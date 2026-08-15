/**
 * Corre un archivo .sql contra Neon.
 * Uso: PGURL=postgresql://... node scripts/run-sql.js scripts/sql/001_create_event_game_schema.sql
 */
const fs = require('fs');
const { Client } = require('pg');

async function main() {
  const file = process.argv[2];
  if (!file) { console.error('Uso: PGURL=... node scripts/run-sql.js <archivo.sql>'); process.exit(1); }
  const url = process.env.PGURL;
  if (!url) { console.error('Falta PGURL'); process.exit(1); }

  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(fs.readFileSync(file, 'utf8'));
    console.log(`OK: ${file} aplicado.`);
  } finally {
    await client.end();
  }
}
main().catch((err) => { console.error(err); process.exit(1); });
