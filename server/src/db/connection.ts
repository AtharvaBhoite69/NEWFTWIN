import knex from 'knex';
import path from 'path';
import { config } from '../config';
import fs from 'fs';

// Ensure data directory exists
const dataDir = path.dirname(config.db.filename);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = knex({
  client: 'sqlite3',
  connection: {
    filename: config.db.filename,
  },
  useNullAsDefault: true,
  pool: {
    afterCreate: (conn: any, cb: Function) => {
      conn.run('PRAGMA journal_mode = WAL', () => {
        conn.run('PRAGMA foreign_keys = ON', cb);
      });
    },
  },
});

export default db;
