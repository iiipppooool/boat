#!/usr/bin/env node
/**
 * Models commission options against the current inventory's price distribution,
 * so a change to the fee model is a decision made against numbers rather than
 * a guess. Run: npm run fees
 *
 * The inventory here is seed data, the shape is plausible, the exact figures
 * are not market data. Re-run once real listings exist and the answer may move.
 */
import fs from "node:fs";
import path from "node:path";

const listings = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "data", "seed-listings.json"), "utf8"),
);
const FX = { USD: 1, EUR: 1.09, GBP: 1.27, AUD: 0.66, CAD: 0.73 };
const prices = listings.map((l) => (l.price * FX[l.currency]) / FX.GBP).sort((a, b) => a - b);
const gmv = prices.reduce((a, b) => a + b, 0);

const model = ({ rate, flat = 0, cap = Infinity, freeBelow = 0 }) => (p) =>
  p < freeBelow ? 0 : Math.min(p * rate + flat, cap);

const options = [
  ["2%, cap £600, free <£750  (current)", "2% cap", { rate: 0.02, cap: 600, freeBelow: 750 }],
  ["2% + £10 flat",                       "2%+£10", { rate: 0.02, flat: 10 }],
  ["5% flat, no cap",                     "5% flat", { rate: 0.05 }],
  ["5%, cap £600, free <£200",            "5%/£600", { rate: 0.05, cap: 600, freeBelow: 200 }],
  ["5%, cap £1000, free <£200",           "5%/£1000", { rate: 0.05, cap: 1000, freeBelow: 200 }],
  ["3%, cap £1000, free <£200",           "3%/£1000", { rate: 0.03, cap: 1000, freeBelow: 200 }],
];

const money = (n) => "£" + Math.round(n).toLocaleString();

console.log(`\n${listings.length} listings · GMV ${money(gmv)} if each sold once\n`);
console.log("  " + "model".padEnd(38) + "revenue".padStart(9) + "% of GMV".padStart(10));
console.log("  " + "-".repeat(57));

const results = options.map(([name, short, config]) => {
  const f = model(config);
  const total = prices.reduce((s, p) => s + f(p), 0);
  return { name, short, config, total, pct: (total / gmv) * 100 };
});
const best = Math.max(...results.map((r) => r.total));
for (const r of results) {
  console.log(
    "  " + r.name.padEnd(38) + money(r.total).padStart(9) + (r.pct.toFixed(2) + "%").padStart(10) +
    (r.total === best ? "   <- most revenue" : ""),
  );
}

console.log("\n  Effective rate on the cheapest listings (why a flat fee hurts):\n");
console.log("  " + "sale price".padEnd(12) + results.map((r) => r.short.padStart(10)).join(""));
for (const p of prices.slice(0, 4)) {
  const cells = results.map((r) => {
    const fee = model(r.config)(p);
    return (fee === 0 ? "free" : ((fee / p) * 100).toFixed(0) + "%").padStart(10);
  });
  console.log("  " + money(p).padEnd(12) + cells.join(""));
}

console.log("\n  A flat fee earns more than a higher rate only below the crossover:");
console.log("    2% + £10  vs  5%   ->  equal at £" + Math.round(10 / 0.03));
console.log(
  "    " + prices.filter((p) => p < 333).length + " of " + prices.length +
  " listings sit below that, worth " +
  ((prices.filter((p) => p < 333).reduce((a, b) => a + b, 0) / gmv) * 100).toFixed(1) +
  "% of GMV.\n",
);
