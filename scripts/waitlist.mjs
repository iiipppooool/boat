#!/usr/bin/env node
/**
 * Reads the waiting list out of the database.
 *
 *   npm run waitlist            summary + the twenty most recent signups
 *   npm run waitlist -- --csv   the whole list as CSV on stdout
 *
 * There is no admin UI for this on purpose: the list is a few hundred email
 * addresses, and a page that renders them is a page that can leak them. A
 * command that has to be run on the box is the right amount of friction.
 */
import path from "node:path";
import process from "node:process";
import Database from "better-sqlite3";

const file = process.env.DATABASE_PATH ?? path.join(process.cwd(), "var", "boatxchange.db");
const db = new Database(file, { readonly: true, fileMustExist: true });

const rows = db
  .prepare("SELECT * FROM waitlist WHERE unsubscribed_at IS NULL ORDER BY created_at ASC")
  .all();

if (process.argv.includes("--csv")) {
  const escape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  console.log("position,email,name,role,country,interests,note,joined");
  rows.forEach((row, index) => {
    console.log(
      [
        index + 1,
        escape(row.email),
        escape(row.name),
        escape(row.role),
        escape(row.country),
        escape(JSON.parse(row.interests || "[]").join(" ")),
        escape(row.note),
        escape(row.created_at),
      ].join(","),
    );
  });
  process.exit(0);
}

const count = (column) => {
  const tally = new Map();
  for (const row of rows) tally.set(row[column] || "—", (tally.get(row[column] || "—") ?? 0) + 1);
  return [...tally.entries()].sort((a, b) => b[1] - a[1]);
};

console.log(`\nWaiting list: ${rows.length} on it.\n`);

if (rows.length) {
  console.log("By role");
  for (const [value, n] of count("role")) console.log(`  ${String(n).padStart(5)}  ${value}`);

  console.log("\nBy country");
  for (const [value, n] of count("country").slice(0, 15)) {
    console.log(`  ${String(n).padStart(5)}  ${value}`);
  }

  const interests = new Map();
  for (const row of rows) {
    for (const interest of JSON.parse(row.interests || "[]")) {
      interests.set(interest, (interests.get(interest) ?? 0) + 1);
    }
  }
  if (interests.size) {
    console.log("\nBy interest");
    for (const [value, n] of [...interests].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${String(n).padStart(5)}  ${value}`);
    }
  }

  console.log("\nMost recent");
  for (const row of rows.slice(-20).reverse()) {
    console.log(`  ${row.created_at.slice(0, 16).replace("T", " ")}  ${row.email}`);
  }

  const notes = rows.filter((row) => row.note);
  if (notes.length) {
    console.log(`\nNotes (${notes.length})`);
    for (const row of notes.slice(-10)) console.log(`\n  ${row.email}\n  ${row.note}`);
  }
}

const gone = db
  .prepare("SELECT COUNT(*) AS n FROM waitlist WHERE unsubscribed_at IS NOT NULL")
  .get().n;
console.log(`\n${gone} have left the list.\n`);
