#!/usr/bin/env node
/**
 * Bulk listing importer.
 *
 *   npm run dev                                   # in one terminal
 *   npm run import -- data/import-template.csv    # in another
 *   npm run import -- my-stock.csv --dry-run      # validate, write nothing
 *
 * Reads a CSV and creates one listing per row. It posts to the running app's
 * /api/sell endpoint rather than writing to SQLite directly, so every row goes
 * through exactly the same validation a seller's form submission does, there
 * is no second copy of the rules to drift out of date.
 *
 * Use this for stock you own, or for listings you have the seller's permission
 * to carry. Rows land as `pending`, same as any submission.
 *
 * Options:
 *   --dry-run      validate every row, write nothing
 *   --url <base>   target a different instance (default http://localhost:3000)
 */
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const dryRun = args.includes("--dry-run");
const baseUrl = (args[args.indexOf("--url") + 1] ?? "http://localhost:3000").replace(/\/$/, "");

if (!file) {
  console.error("Usage: npm run import -- <file.csv> [--dry-run] [--url http://localhost:3000]");
  process.exit(1);
}
if (!fs.existsSync(file)) {
  console.error(`No such file: ${file}`);
  process.exit(1);
}

/** Minimal RFC-4180 reader: quoted fields, embedded commas, doubled quotes. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"') { quoted = true; continue; }
    if (c === ",") { row.push(field); field = ""; continue; }
    if (c === "\r") continue;
    if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; continue; }
    field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}

const raw = parseCsv(fs.readFileSync(file, "utf8"));
if (raw.length < 2) {
  console.error("The file needs a header row and at least one listing.");
  process.exit(1);
}

const headers = raw[0].map((h) => h.trim());
const rows = raw.slice(1);

const NUMERIC = new Set([
  "year", "seats", "crewWeightMinKg", "crewWeightMaxKg", "hullWeightKg",
  "lengthCm", "price", "quantity",
]);
const LISTS = new Set(["sizes"]);

/** CSV is all strings; the API wants nulls, numbers, arrays and booleans. */
function toPayload(cells) {
  const record = {};
  headers.forEach((header, i) => {
    const value = (cells[i] ?? "").trim();
    if (!value) return;
    if (NUMERIC.has(header)) record[header] = Number(value);
    else if (LISTS.has(header)) record[header] = value.split("|").map((v) => v.trim()).filter(Boolean);
    else if (header === "coxed") record[header] = /^(true|yes|y|1)$/i.test(value);
    else record[header] = value;
  });

  const highlights = ["highlight1", "highlight2", "highlight3"]
    .map((k) => record[k])
    .filter(Boolean);
  delete record.highlight1;
  delete record.highlight2;
  delete record.highlight3;

  return { ...record, sizes: record.sizes ?? [], highlights };
}

const results = { created: [], failed: [] };

for (const [index, cells] of rows.entries()) {
  const line = index + 2; // header is line 1
  const payload = toPayload(cells);
  const label = [payload.year, payload.manufacturer, payload.model].filter(Boolean).join(" ") || `row ${line}`;

  if (dryRun) {
    const missing = ["category", "manufacturer", "model", "year", "price", "currency", "city", "country", "sellerName", "sellerEmail", "description"]
      .filter((k) => payload[k] === undefined || payload[k] === "");
    if (missing.length) results.failed.push({ line, label, errors: { required: `missing: ${missing.join(", ")}` } });
    else results.created.push({ line, label, slug: "(dry run)" });
    continue;
  }

  try {
    const response = await fetch(`${baseUrl}/api/sell`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json();
    if (response.ok) results.created.push({ line, label, slug: body.slug });
    else results.failed.push({ line, label, errors: body.errors ?? { error: "unknown" } });
  } catch (error) {
    console.error(`\nCould not reach ${baseUrl}. Is the app running (npm run dev)?\n`);
    console.error(String(error.message ?? error));
    process.exit(1);
  }
}

console.log(`\n${dryRun ? "Dry run" : "Import"}: ${path.basename(file)}\n`);
for (const { line, label, slug } of results.created) {
  console.log(`  ok    line ${String(line).padStart(3)}  ${label}${dryRun ? "" : `  →  /market/${slug}`}`);
}
for (const { line, label, errors } of results.failed) {
  console.log(`  FAIL  line ${String(line).padStart(3)}  ${label}`);
  for (const [field, message] of Object.entries(errors)) console.log(`          ${field}: ${message}`);
}

console.log(
  `\n${results.created.length} ${dryRun ? "would be created" : "created"}, ${results.failed.length} failed.\n` +
  (dryRun ? "" : "New listings are saved as `pending` until you publish them.\n"),
);
process.exit(results.failed.length ? 1 : 0);
