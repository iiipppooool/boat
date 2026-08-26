#!/usr/bin/env node
/**
 * Deletes the SQLite inventory so the next boot re-seeds from
 * data/seed-listings.json. Useful after editing the seed file, and the fastest
 * way to clear listings submitted while testing the Sell form.
 *
 *   npm run db:reset
 */
import fs from "node:fs";
import path from "node:path";

const file = process.env.DATABASE_PATH ?? path.join(process.cwd(), "var", "boatxchange.db");
const targets = [file, `${file}-wal`, `${file}-shm`, `${file}-journal`];

let removed = 0;
for (const target of targets) {
  if (fs.existsSync(target)) {
    fs.rmSync(target);
    removed += 1;
  }
}

console.log(
  removed
    ? `Removed ${removed} file(s). The seed listings will be reloaded on next start.`
    : `Nothing to remove — no database at ${file}.`,
);
