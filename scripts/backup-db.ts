/**
 * Makes an encrypted copy of the accounts database (SQLite), and keeps the newest ones. VACUUM INTO
 * makes a consistent copy while the server writes. gpg encrypts it (AES256, symmetric, with the
 * passphrase in a root-only file), and a test decryption must give the same bytes back. The plain
 * copy exists only during the run, in the backup folder (0700); then the script deletes it. This
 * is the method of the house-md and wallet backups on the VPS. On the VPS a systemd timer runs it
 * every night (deploy/game-backup.timer). Restore: deploy/README.md, "Accounts".
 *
 *   node scripts/backup-db.ts [database] [folder] [keep]
 *   defaults: /var/lib/game/game.db  /var/backups/game  14
 *   BACKUP_PASSPHRASE_FILE: the gpg passphrase (default /etc/game/backup.passphrase, mode 0600)
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const [database = '/var/lib/game/game.db', folder = '/var/backups/game', keepArg = '14'] = process.argv.slice(2);
const keep = Math.max(1, Number.parseInt(keepArg, 10) || 14);
const passphraseFile = process.env.BACKUP_PASSPHRASE_FILE || '/etc/game/backup.passphrase';

const sha256 = (data: Buffer) => createHash('sha256').update(data).digest('hex');

function checkPassphraseFile(): void {
  let mode: number;
  try {
    mode = statSync(passphraseFile).mode;
  } catch {
    throw new Error(`no passphrase file ${passphraseFile} (see deploy/README.md, "Accounts")`);
  }
  if (mode & 0o077) throw new Error(`${passphraseFile} must be readable by its owner only (chmod 600)`);
  if (readFileSync(passphraseFile, 'utf8').trim() === '') throw new Error(`${passphraseFile} is empty`);
}

// UTC, to the millisecond: 20261009-034100-123. The names sort in time order.
const now = new Date();
const stamp = `${now.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15)}-${String(now.getUTCMilliseconds()).padStart(3, '0')}`;
const plain = join(folder, `.game-${stamp}.db.tmp`);
const target = join(folder, `game-${stamp}.db.gpg`);

try {
  checkPassphraseFile();
  mkdirSync(folder, { recursive: true, mode: 0o700 });
  // A run that was killed can leave its plain copy. It must not stay on the disk.
  for (const name of readdirSync(folder)) if (/^\.game-.*\.db\.tmp$/.test(name)) rmSync(join(folder, name), { force: true });

  const db = new DatabaseSync(database, { readOnly: true });
  try {
    db.prepare('VACUUM INTO ?').run(plain);
  } finally {
    db.close();
  }

  const gpg = spawnSync('gpg', ['--batch', '--yes', '--quiet', '--symmetric', '--cipher-algo', 'AES256', '--passphrase-file', passphraseFile, '--output', target, plain], { encoding: 'utf8' });
  if (gpg.status !== 0) throw new Error(`gpg: ${gpg.error?.message ?? gpg.stderr.trim()}`);
  chmodSync(target, 0o600);

  // The test decryption: a copy that the passphrase of this box cannot open is no backup.
  const check = spawnSync('gpg', ['--batch', '--quiet', '--decrypt', '--passphrase-file', passphraseFile, target], { maxBuffer: 1 << 30 });
  if (check.status !== 0 || sha256(check.stdout) !== sha256(readFileSync(plain))) {
    throw new Error('the test decryption of the new copy failed');
  }
} catch (error) {
  rmSync(target, { force: true });
  console.error(`backup: ERROR: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
} finally {
  rmSync(plain, { force: true });
}

if (!process.exitCode) {
  const copies = readdirSync(folder)
    .filter((name) => /^game-\d{8}-\d{6}-\d{3}\.db\.gpg$/.test(name))
    .sort()
    .reverse();
  for (const old of copies.slice(keep)) rmSync(join(folder, old));
  console.log(`backup: ${target} (${Math.min(copies.length, keep)} kept in ${folder})`);
}
