#!/usr/bin/env node
/**
 * Backs up the SQLite database safely.
 *
 *   npm run backup                    # -> backups/boatxchange-YYYY-MM-DD-HHmm.db
 *   npm run backup -- --out /path     # somewhere else
 *
 * It uses SQLite's own backup API rather than copying the file. That matters:
 * the database runs in WAL mode, so at any moment part of the committed state
 * lives in the -wal file. `cp boatxchange.db backup.db` while the app is running
 * gives you a file that is missing recent writes and may not open at all. This
 * produces a consistent snapshot with the app still serving.
 *
 * Keep these somewhere that is not the same disk as the database. A volume
 * snapshot from your host is a complement to this, not a replacement, restoring
 * one is an operation, restoring this is a file copy.
 */
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const args = process.argv.slice(2);
const outFlag = args.indexOf("--out");
const outDir = outFlag === -1 ? path.join(process.cwd(), "backups") : args[outFlag + 1];

const source = process.env.DATABASE_PATH ?? path.join(process.cwd(), "var", "boatxchange.db");
if (!fs.existsSync(source)) {
  console.error(`No database at ${source}. Nothing to back up.`);
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 16);
const target = path.join(outDir, `boatxchange-${stamp}.db`);

const db = new Database(source, { readonly: true });
try {
  await db.backup(target);
  const { size } = fs.statSync(target);
  const counts = new Database(target, { readonly: true });
  const listings = counts.prepare("SELECT COUNT(*) AS n FROM listings").get().n;
  const sellerRows = counts.prepare("SELECT COUNT(*) AS n FROM listings WHERE source != 'seed'").get().n;
  counts.close();

  console.log(
    `\n${target}\n` +
    `  ${(size / 1024).toFixed(0)} KB · ${listings} listings (${sellerRows} not seed data)\n\n` +
    `Store this off the machine it came from.\n`,
  );
} catch (error) {
  console.error("Backup failed:", error.message);
  process.exit(1);
} finally {
  db.close();
}
