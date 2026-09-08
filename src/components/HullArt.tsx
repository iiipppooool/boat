/**
 * Art-directed stand-in imagery.
 *
 * Real listings will carry photographs, every seed record has a `photoDirection`
 * brief describing the shot it wants (see data/seed-listings.json). Until those
 * photographs exist, a grey box or an obviously synthetic "boat photo" would both
 * cheapen the page, so each listing instead gets a flat two-tone illustration
 * drawn from four rowing-specific compositions:
 *
 *   waterline, hull profile above its own reflection, on banded water
 *   puddles  , blade puddles from above, with the wake line running off
 *   rigger   , wing rigger geometry as a workshop drawing, with dimension marks
 *   boathouse, dock pilings, horizon, a shell out on the water
 *
 * Composition, palette and the small variations within each are picked from the
 * listing's `artSeed`, so a given boat always looks the same on every page, and
 * a grid of them looks composed rather than random.
 */

type Scene = "waterline" | "puddles" | "rigger" | "boathouse" | "kit" | "gear";

interface Duotone {
  /** Background wash. */
  base: string;
  /** Mid tone for secondary shapes. */
  mid: string;
  /** Darkest tone, the subject. */
  ink: string;
}

const PALETTES: Duotone[] = [
  { base: "#dfd7c6", mid: "#8ea3ab", ink: "#0d242d" },
  { base: "#e6e0d2", mid: "#7f9a8d", ink: "#1d4b3a" },
  { base: "#d8d5cb", mid: "#6d8f9c", ink: "#143543" },
  { base: "#e9e2d3", mid: "#9aa6a0", ink: "#12303a" },
];

const SCENES: Scene[] = ["waterline", "puddles", "rigger", "boathouse", "kit", "gear"];

/**
 * Which composition suits which kind of listing. Drawing a hull profile on a
 * listing for a pair of oars is the sort of detail that makes a page feel
 * generated rather than made, so equipment gets the picture that belongs to it
 * and boats rotate through the three that show a boat.
 */
const SCENES_BY_CATEGORY: Record<string, Scene[]> = {
  // Weighted: a boat listing should usually show a boat. Puddles read well but
  // they are also what an oars listing always gets, so keeping them to a quarter
  // of shells stops the two categories looking alike in a mixed grid.
  shell: ["waterline", "boathouse", "waterline", "puddles"],
  oars: ["puddles"],
  rigging: ["rigger"],
  trailer: ["boathouse"],
  apparel: ["kit"],
  gear: ["gear"],
};

/** Small deterministic PRNG, same seed, same picture, every render. */
function rng(seed: number) {
  let s = (seed % 2147483647) + 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Mixes the seed before taking a modulus. Seeds in the data are sequential
 * (1001, 1002, 1003…), and `seed % 3` over sequential ids would march through
 * the compositions in lockstep with the grid, mixing first means neighbouring
 * cards land on different pictures.
 */
function mix(seed: number): number {
  let h = seed ^ 0x9e3779b9;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return Math.abs(h ^ (h >>> 16));
}

export interface HullArtProps {
  seed: number;
  /** Describes the picture for screen readers; omit for purely decorative use. */
  label?: string;
  /** Force a composition, used for the hero, the gallery tabs and section art. */
  scene?: Scene;
  /** Listing category, so equipment gets a picture of equipment. */
  category?: string;
  className?: string;
  /** Taller crop for detail pages. */
  ratio?: number;
}

export function HullArt({
  seed, label, scene, category, className, ratio = 0.68,
}: HullArtProps) {
  const mixed = mix(seed || 1);
  const palette = PALETTES[mixed % PALETTES.length];
  const pool = (category && SCENES_BY_CATEGORY[category]) || SCENES;
  const chosen = scene ?? pool[Math.floor(mixed / PALETTES.length) % pool.length];
  const rand = rng(seed || 1);
  const w = 400;
  const h = Math.round(w * ratio);

  const a11y = label
    ? { role: "img" as const, "aria-label": label }
    : { "aria-hidden": true as const, focusable: "false" as const };

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid slice"
      className={className}
      {...a11y}
    >
      <rect width={w} height={h} fill={palette.base} />
      {chosen === "waterline" && <Waterline w={w} h={h} p={palette} rand={rand} />}
      {chosen === "puddles" && <Puddles w={w} h={h} p={palette} rand={rand} />}
      {chosen === "rigger" && <Rigger w={w} h={h} p={palette} rand={rand} />}
      {chosen === "boathouse" && <Boathouse w={w} h={h} p={palette} rand={rand} />}
      {chosen === "kit" && <Kit w={w} h={h} p={palette} rand={rand} />}
      {chosen === "gear" && <Gear w={w} h={h} p={palette} rand={rand} />}
    </svg>
  );
}

interface SceneProps {
  w: number;
  h: number;
  p: Duotone;
  rand: () => number;
}

/** Far bank: the tree-and-boathouse line you see across every stretch of water. */
function FarBank({ w, y, p, rand }: { w: number; y: number; p: Duotone; rand: () => number }) {
  const teeth: string[] = [];
  let x = -10;
  while (x < w + 10) {
    const width = 14 + rand() * 26;
    const height = 8 + rand() * 20;
    teeth.push(`M${x} ${y} L${x} ${y - height} L${x + width} ${y - height * (0.5 + rand() * 0.6)} L${x + width} ${y} Z`);
    x += width;
  }
  return <path d={teeth.join(" ")} fill={p.mid} opacity="0.55" />;
}

/** Hull profile above its reflection: the shape you see from the next lane. */
function Waterline({ w, h, p, rand }: SceneProps) {
  const line = h * 0.62;
  const sheer = h * 0.055;
  const bowRise = h * 0.03;
  const x0 = w * 0.04;
  const x1 = w * 0.97;

  const hull = `M${x0} ${line} C ${w * 0.24} ${line - sheer}, ${w * 0.72} ${line - sheer - bowRise}, ${x1} ${line - bowRise * 1.9} L ${x1 - w * 0.02} ${line} Z`;
  const reflection = `M${x0} ${line} C ${w * 0.24} ${line + sheer * 0.75}, ${w * 0.72} ${line + sheer * 0.7 + bowRise}, ${x1} ${line + bowRise * 1.3} L ${x1 - w * 0.02} ${line} Z`;
  const rigX = w * 0.44;
  const rigY = line - sheer * 0.95;
  const armX = w * 0.085;
  const armY = h * 0.11;

  return (
    <g>
      {/* sky, banded */}
      {[0, 1, 2].map((i) => (
        <rect key={i} x={0} y={h * (0.06 + i * 0.075)} width={w} height={h * 0.035} fill={p.mid} opacity={0.14 + i * 0.06} />
      ))}
      <FarBank w={w} y={line - h * 0.11} p={p} rand={rand} />
      <rect x={0} y={line - h * 0.11} width={w} height={h * 0.11} fill={p.mid} opacity="0.16" />

      {/* water */}
      <rect x={0} y={line} width={w} height={h - line} fill={p.mid} opacity="0.28" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect
          key={i}
          x={0}
          y={line + h * 0.11 + i * (h * 0.072)}
          width={w}
          height={h * (0.012 + rand() * 0.012)}
          fill={p.ink}
          opacity={0.16 - i * 0.026}
        />
      ))}

      <path d={reflection} fill={p.ink} opacity="0.2" />
      <path d={hull} fill={p.ink} />

      {/* rigger arms and pins */}
      <path
        d={`M${rigX} ${rigY} l ${-armX} ${-armY} M${rigX} ${rigY} l ${armX} ${-armY}`}
        stroke={p.ink}
        strokeWidth={h * 0.014}
        strokeLinecap="round"
        fill="none"
      />
      <circle cx={rigX - armX} cy={rigY - armY} r={h * 0.021} fill="var(--brass-600)" />
      <circle cx={rigX + armX} cy={rigY - armY} r={h * 0.021} fill="var(--brass-600)" />
    </g>
  );
}

/** Puddles from above, what a boat leaves behind, receding down the wake. */
function Puddles({ w, h, p, rand }: SceneProps) {
  const count = 6;
  const jitter = rand();

  return (
    <g>
      <rect x={0} y={0} width={w} height={h * 0.16} fill={p.mid} opacity="0.3" />
      <rect x={0} y={h * 0.16} width={w} height={h * 0.012} fill={p.ink} opacity="0.28" />

      {/* the wake, running off to the far corner */}
      <path
        d={`M${-10} ${h * 0.95} Q ${w * 0.45} ${h * 0.72} ${w + 10} ${h * 0.2}`}
        stroke={p.ink}
        strokeWidth={h * 0.008}
        fill="none"
        opacity="0.4"
      />

      {Array.from({ length: count }).map((_, i) => {
        const t = i / (count - 1);
        const cx = w * (0.08 + t * 0.78);
        const cy = h * (0.9 - t * 0.6) + (i % 2 ? -h * 0.04 * jitter : h * 0.03 * jitter);
        const r = h * (0.24 - t * 0.15);
        return (
          <g key={i} opacity={1 - t * 0.4}>
            <ellipse cx={cx} cy={cy} rx={r} ry={r * 0.4} fill={p.ink} opacity="0.1" />
            <ellipse cx={cx} cy={cy} rx={r} ry={r * 0.4} fill="none" stroke={p.ink} strokeWidth={h * 0.008 - t * h * 0.003} />
            <ellipse cx={cx} cy={cy} rx={r * 0.52} ry={r * 0.21} fill="none" stroke={p.ink} strokeWidth={h * 0.005} opacity="0.7" />
          </g>
        );
      })}

      {/* the blade that made them, entering from the top right */}
      <path
        d={`M${w * 0.78} ${h * 0.3} l ${w * 0.11} ${-h * 0.13} l ${w * 0.07} ${h * 0.11} l ${-w * 0.1} ${h * 0.15} z`}
        fill="var(--brass-600)"
      />
      <path
        d={`M${w * 0.79} ${h * 0.31} L ${w * 0.58} ${h * 0.52}`}
        stroke={p.ink}
        strokeWidth={h * 0.018}
        strokeLinecap="round"
      />
    </g>
  );
}

/** Wing rigger geometry, drawn as a workshop dimension sketch. */
function Rigger({ w, h, p, rand }: SceneProps) {
  const cx = w * 0.5;
  const deck = h * 0.66;
  const span = w * (0.33 + rand() * 0.04);
  const rise = h * (0.3 + rand() * 0.07);

  return (
    <g>
      {/* graph paper */}
      {Array.from({ length: 9 }).map((_, i) => (
        <rect key={`h${i}`} x={0} y={(h / 9) * i} width={w} height="1" fill={p.mid} opacity="0.3" />
      ))}
      {Array.from({ length: 14 }).map((_, i) => (
        <rect key={`v${i}`} x={(w / 14) * i} y={0} width="1" height={h} fill={p.mid} opacity="0.18" />
      ))}

      {/* hull section */}
      <path
        d={`M${cx - w * 0.09} ${deck} L${cx + w * 0.09} ${deck} L${cx + w * 0.055} ${h * 0.95} Q${cx} ${h} ${cx - w * 0.055} ${h * 0.95} Z`}
        fill={p.ink}
      />
      <rect x={cx - w * 0.1} y={deck - h * 0.02} width={w * 0.2} height={h * 0.025} fill={p.ink} />

      {/* wing arc */}
      <path
        d={`M${cx - span} ${deck - h * 0.03} Q ${cx} ${deck - rise - h * 0.12} ${cx + span} ${deck - h * 0.03}`}
        stroke={p.ink}
        strokeWidth={h * 0.026}
        fill="none"
        strokeLinecap="round"
      />

      {/* pins and gates */}
      {[-1, 1].map((side) => (
        <g key={side}>
          <rect x={cx + side * span - w * 0.006} y={deck - h * 0.15} width={w * 0.012} height={h * 0.13} fill={p.ink} />
          <rect x={cx + side * span - w * 0.03} y={deck - h * 0.185} width={w * 0.06} height={h * 0.04} fill="var(--brass-600)" />
        </g>
      ))}

      {/* spread dimension */}
      <g stroke={p.ink} strokeWidth="1.2" opacity="0.7" fill="none">
        <path d={`M${cx - span} ${h * 0.14} H${cx + span}`} />
        <path d={`M${cx - span} ${h * 0.1} V${h * 0.18}`} />
        <path d={`M${cx + span} ${h * 0.1} V${h * 0.18}`} />
        <path d={`M${cx} ${h * 0.06} V${h * 0.22}`} strokeDasharray="4 4" />
        <path d={`M${cx - span} ${h * 0.16} V${deck - h * 0.19}`} strokeDasharray="3 5" opacity="0.45" />
        <path d={`M${cx + span} ${h * 0.16} V${deck - h * 0.19}`} strokeDasharray="3 5" opacity="0.45" />
      </g>
    </g>
  );
}

/** Dock pilings, horizon, a shell out on the water, the view from a boathouse. */
function Boathouse({ w, h, p, rand }: SceneProps) {
  const horizon = h * 0.5;
  const pilings = 5 + Math.floor(rand() * 3);
  const deck = h * 0.78;

  return (
    <g>
      {/* sky */}
      {[0, 1, 2].map((i) => (
        <rect key={i} x={0} y={h * (0.05 + i * 0.09)} width={w} height={h * 0.035} fill={p.mid} opacity={0.16 + i * 0.07} />
      ))}
      <FarBank w={w} y={horizon} p={p} rand={rand} />

      {/* water */}
      <rect x={0} y={horizon} width={w} height={h - horizon} fill={p.mid} opacity="0.32" />
      <rect x={0} y={horizon} width={w} height={h * 0.008} fill={p.ink} opacity="0.5" />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={0} y={horizon + h * (0.14 + i * 0.1)} width={w} height={h * 0.012} fill={p.ink} opacity={0.13 - i * 0.03} />
      ))}

      {/* an eight, out on the water */}
      <g transform={`translate(${w * 0.42} ${horizon - h * 0.035})`}>
        <path d={`M0 0 q ${w * 0.14} ${-h * 0.02} ${w * 0.28} 0 q ${-w * 0.14} ${h * 0.02} ${-w * 0.28} 0 z`} fill={p.ink} />
        {Array.from({ length: 5 }).map((_, i) => (
          <path
            key={i}
            d={`M${w * (0.04 + i * 0.05)} ${-h * 0.004} l ${-w * 0.022} ${-h * 0.05}`}
            stroke={p.ink}
            strokeWidth="1.6"
            opacity="0.8"
          />
        ))}
      </g>

      {/* dock */}
      <rect x={0} y={deck} width={w * 0.5} height={h * 0.055} fill={p.ink} />
      {Array.from({ length: pilings }).map((_, i) => (
        <rect
          key={i}
          x={w * 0.02 + i * ((w * 0.46) / pilings)}
          y={deck - h * (0.1 + (i % 2) * 0.05)}
          width={w * 0.022}
          height={h}
          fill={p.ink}
          opacity="0.92"
        />
      ))}

      {/* a blade left lying on the dock */}
      <path
        d={`M${w * 0.06} ${deck - h * 0.015} l ${w * 0.13} ${-h * 0.035} l ${w * 0.02} ${h * 0.05} l ${-w * 0.14} ${h * 0.032} z`}
        fill="var(--brass-600)"
      />
    </g>
  );
}

/**
 * An all-in-one, flat-laid. The rowing unisuit is one of the few garments with a
 * silhouette a rower can name across a room, straps, a torso that runs
 * uninterrupted into the shorts, and a club stripe on the diagonal. The stripe
 * is drawn as an explicit parallelogram inside the body rather than clipped,
 * so several of these can sit on one page without colliding over an element id.
 */
function Kit({ w, h, p, rand }: SceneProps) {
  const cx = w * 0.5;
  const top = h * 0.14;
  const shoulder = w * 0.075;
  const chest = w * 0.115;
  const waist = w * 0.095;
  const hip = w * 0.13;
  const chestY = top + h * 0.14;
  const waistY = top + h * 0.4;
  const hemY = h * 0.86;
  const gusset = h * 0.72;

  const body = [
    `M${cx - shoulder} ${top}`,
    `L${cx - chest} ${chestY}`,
    `L${cx - waist} ${waistY}`,
    `L${cx - hip} ${hemY}`,
    `L${cx - w * 0.012} ${hemY}`,
    `L${cx} ${gusset}`,
    `L${cx + w * 0.012} ${hemY}`,
    `L${cx + hip} ${hemY}`,
    `L${cx + waist} ${waistY}`,
    `L${cx + chest} ${chestY}`,
    `L${cx + shoulder} ${top}`,
    `L${cx + w * 0.028} ${top + h * 0.045}`,
    `L${cx - w * 0.028} ${top + h * 0.045}`,
    "Z",
  ].join(" ");

  // Club stripe: a band across the torso, running corner to corner.
  const stripeTop = chestY + h * 0.04;
  const stripeBand = h * 0.075;
  const stripe = [
    `M${cx - chest * 0.98} ${stripeTop + stripeBand}`,
    `L${cx + chest * 0.9} ${stripeTop - h * 0.05}`,
    `L${cx + chest * 0.88} ${stripeTop + h * 0.02}`,
    `L${cx - chest * 0.96} ${stripeTop + stripeBand + h * 0.07}`,
    "Z",
  ].join(" ");

  return (
    <g>
      {/* folded shelf behind, so the frame is not one object in a void */}
      {[0, 1, 2].map((i) => (
        <rect key={i} x={0} y={h * (0.1 + i * 0.3)} width={w} height={h * 0.02} fill={p.mid} opacity={0.3 - i * 0.06} />
      ))}
      <rect x={0} y={h * 0.88} width={w} height={h * 0.12} fill={p.mid} opacity="0.34" />

      {/* a second garment, folded, off to the side */}
      <g opacity="0.55">
        <rect x={w * 0.06} y={h * 0.5} width={w * 0.15} height={h * 0.26} fill={p.ink} opacity="0.75" />
        <rect x={w * 0.06} y={h * 0.58} width={w * 0.15} height={h * 0.035} fill={p.base} opacity="0.8" />
      </g>
      <g opacity="0.45">
        <rect x={w * 0.79} y={h * 0.44} width={w * 0.15} height={h * 0.22} fill={p.ink} opacity="0.6" />
        <rect x={w * 0.79} y={h * 0.52} width={w * 0.15} height={h * 0.03} fill={p.base} opacity="0.8" />
      </g>

      <path d={body} fill={p.ink} />
      <path d={stripe} fill="var(--brass-600)" />
      {/* the numbered patch every club suit ends up with */}
      <rect x={cx - w * 0.035} y={waistY + h * 0.08} width={w * 0.07} height={h * 0.07} fill={p.base} opacity="0.85" />
    </g>
  );
}

/**
 * A cox box in plan view, drawn on the same graph paper as the rigger sketch,
 * the two are the workshop half of the inventory, and sharing a visual language
 * makes a mixed grid feel deliberate rather than assembled.
 */
function Gear({ w, h, p, rand }: SceneProps) {
  const bx = w * 0.2;
  const by = h * 0.2;
  const bw = w * 0.44;
  const bh = h * 0.58;
  const r = Math.min(w, h) * 0.04;
  const jitter = rand();

  return (
    <g>
      {Array.from({ length: 9 }).map((_, i) => (
        <rect key={`h${i}`} x={0} y={(h / 9) * i} width={w} height="1" fill={p.mid} opacity="0.3" />
      ))}
      {Array.from({ length: 14 }).map((_, i) => (
        <rect key={`v${i}`} x={(w / 14) * i} y={0} width="1" height={h} fill={p.mid} opacity="0.18" />
      ))}

      {/* cable, coiling away to the boat */}
      <path
        d={`M${bx + bw} ${by + bh * 0.5} C ${w * 0.82} ${by + bh * (0.2 + jitter * 0.2)}, ${w * 0.72} ${h * 0.92}, ${w * 0.96} ${h * 0.82}`}
        stroke={p.ink}
        strokeWidth={h * 0.016}
        fill="none"
        strokeLinecap="round"
        opacity="0.85"
      />
      <rect x={w * 0.93} y={h * 0.78} width={w * 0.055} height={h * 0.075} rx={r * 0.4} fill="var(--brass-600)" />

      {/* body */}
      <rect x={bx} y={by} width={bw} height={bh} rx={r} fill={p.ink} />
      {/* display */}
      <rect x={bx + bw * 0.1} y={by + bh * 0.1} width={bw * 0.8} height={bh * 0.42} rx={r * 0.4} fill={p.base} opacity="0.92" />
      {/* readout: a big figure and two smaller ones */}
      <rect x={bx + bw * 0.16} y={by + bh * 0.18} width={bw * 0.42} height={bh * 0.13} fill={p.ink} opacity="0.85" />
      <rect x={bx + bw * 0.16} y={by + bh * 0.36} width={bw * 0.24} height={bh * 0.07} fill={p.ink} opacity="0.5" />
      <rect x={bx + bw * 0.46} y={by + bh * 0.36} width={bw * 0.28} height={bh * 0.07} fill={p.ink} opacity="0.5" />

      {/* buttons */}
      {[0.22, 0.5, 0.78].map((t, i) => (
        <circle
          key={t}
          cx={bx + bw * t}
          cy={by + bh * 0.74}
          r={Math.min(w, h) * 0.038}
          fill={i === 1 ? "var(--brass-600)" : p.base}
          opacity={i === 1 ? 1 : 0.75}
        />
      ))}

      {/* dimension tick, as on the rigger sketch */}
      <g stroke={p.ink} strokeWidth="1.2" opacity="0.55" fill="none">
        <path d={`M${bx} ${h * 0.1} H${bx + bw}`} />
        <path d={`M${bx} ${h * 0.07} V${h * 0.13}`} />
        <path d={`M${bx + bw} ${h * 0.07} V${h * 0.13}`} />
      </g>
    </g>
  );
}
