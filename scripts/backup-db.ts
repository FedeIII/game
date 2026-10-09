/**
 * Copies the accounts database (SQLite) to a dated file, and keeps the newest ones. It uses
 * VACUUM INTO, which makes a consistent copy while the server writes. On the VPS a systemd timer
 * runs it every night (deploy/game-backup.timer).
 *
 *   node scripts/backup-db.ts [database] [folder] [keep]
 *   defaults: /var/lib/game/game.db  /var/backups/game  14
 */
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const [database = '/var/lib/game/game.db', folder = '/var/backups/game', keepArg = '14'] = process.argv.slice(2);
const keep = Math.max(1, Number.parseInt(keepArg, 10) || 14);

mkdirSync(folder, { recursive: true, mode: 0o700 });
// UTC, to the millisecond: 20261009-034100-123. The names sort in time order.
const now = new Date();
const stamp = `${now.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15)}-${String(now.getUTCMilliseconds()).padStart(3, '0')}`;
const target = join(folder, `game-${stamp}.db`);
const db = new DatabaseSync(database, { readOnly: true });
db.prepare('VACUUM INTO ?').run(target);
db.close();

const copies = readdirSync(folder)
  .filter((name) => /^game-\d{8}-\d{6}-\d{3}\.db$/.test(name))
  .sort()
  .reverse();
for (const old of copies.slice(keep)) rmSync(join(folder, old));
console.log(`backup: ${target} (${Math.min(copies.length, keep)} kept in ${folder})`);
