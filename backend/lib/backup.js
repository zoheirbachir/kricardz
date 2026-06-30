const fs = require('fs');
const path = require('path');
const db = require('../db/database');

/* Where snapshots are written. On Render free tier this disk is ephemeral, so
   these survive only until the next restart — the durable copy is the one an
   admin downloads. On a VPS / persistent disk they're real rolling backups. */
const BACKUP_DIR = path.join(__dirname, '../backups');
const MAX_BACKUPS = Number(process.env.MAX_BACKUPS) || 15;

function ensureDir() { fs.mkdirSync(BACKUP_DIR, { recursive: true }); }

/* Create a consistent snapshot of the live DB. `VACUUM INTO` checkpoints the WAL
   and writes a clean, single-file copy — safe to run while the server is serving. */
function backupNow(label = 'auto') {
  ensureDir();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeLabel = String(label).replace(/[^a-z0-9_-]/gi, '') || 'auto';
  const file = path.join(BACKUP_DIR, `kricar-${safeLabel}-${stamp}.db`);
  const sqlPath = file.replace(/\\/g, '/').replace(/'/g, "''"); // SQLite likes forward slashes
  db.exec(`VACUUM INTO '${sqlPath}'`);
  rotate();
  return file;
}

/* Keep only the most recent MAX_BACKUPS snapshots. */
function rotate() {
  const extra = listBackups().slice(MAX_BACKUPS);
  for (const b of extra) {
    try { fs.unlinkSync(path.join(BACKUP_DIR, b.name)); } catch { /* ignore */ }
  }
}

function listBackups() {
  ensureDir();
  return fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.db'))
    .map(name => {
      const st = fs.statSync(path.join(BACKUP_DIR, name));
      return { name, size: st.size, created_at: st.mtime.toISOString() };
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at)); // newest first
}

function backupPath(name) {
  /* Guard against path traversal — only plain .db filenames inside BACKUP_DIR. */
  if (!/^[a-z0-9_.-]+\.db$/i.test(name)) return null;
  const p = path.join(BACKUP_DIR, name);
  return fs.existsSync(p) ? p : null;
}

/* Start periodic backups + a final one on graceful shutdown. */
function startAutoBackups(intervalHours = Number(process.env.BACKUP_INTERVAL_HOURS) || 6) {
  try { backupNow('startup'); } catch (e) { console.error('startup backup failed:', e.message); }
  setInterval(() => {
    try { backupNow('auto'); } catch (e) { console.error('auto backup failed:', e.message); }
  }, intervalHours * 3600 * 1000).unref();

  const onExit = (sig) => {
    try { backupNow('shutdown'); } catch { /* ignore */ }
    process.exit(0);
  };
  process.on('SIGTERM', onExit); // Render sends SIGTERM before stopping the service
  process.on('SIGINT', onExit);
}

module.exports = { backupNow, listBackups, backupPath, startAutoBackups, BACKUP_DIR };
