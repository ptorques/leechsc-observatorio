/**
 * ⚠️ DADOS ALEATÓRIOS PROVISÓRIOS.
 * Everything in this file is generated from a fixed random seed only to lay out
 * the charts. None of it is real. Replace each export with real data (keeping
 * the same shape, or adjusting the matching builder in src/charts/).
 */

// ---------- seeded random helpers (deterministic between builds) ----------
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261122);
const between = (a: number, b: number) => a + (b - a) * rand();
const noise = (amp: number) => (rand() - 0.5) * 2 * amp;
const round = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d;
const range = (a: number, b: number, step = 1) =>
  Array.from({ length: Math.floor((b - a) / step) + 1 }, (_, i) => a + i * step);
const logistic = (x: number) => 1 / (1 + Math.exp(-x));

// ============================== Projetos ==================================

// --- Sector comparison: SC vs a Chinese province (radar) ---
export interface SectorRadar {
  sectors: string[];
  sc: number[];
  provinces: { name: string; values: number[] }[];
}
const SECTORS = [
  'Agropecuária',
  'Alimentos',
  'Têxtil e vestuário',
  'Madeira e móveis',
  'Metalmecânica',
  'Eletroeletrônicos',
  'Serviços avançados',
];
export const sectorRadar: SectorRadar = {
  sectors: SECTORS,
  sc: SECTORS.map(() => round(between(6, 26))),
  provinces: ['Zhejiang', 'Guangdong', 'Jiangsu', 'Fujian', 'Shandong', 'Sichuan'].map((name) => ({
    name,
    values: SECTORS.map(() => round(between(4, 28))),
  })),
};

// --- Event study: provincial officials and GDP growth ---
export interface EventStudy {
  periods: number[];
  officials: Record<string, { label: string; coef: number[]; lo: number[]; hi: number[] }>;
}
export const officialsEvent: EventStudy = (() => {
  const periods = range(-4, 6);
  const make = (label: string, peak: number) => {
    const coef = periods.map((k) =>
      k < 0 ? round(noise(0.12), 2) : round(peak * k * Math.exp(-k / 2.5) + noise(0.1), 2),
    );
    const se = periods.map((k) => 0.14 + 0.03 * Math.abs(k));
    return {
      label,
      coef,
      lo: coef.map((c, i) => round(c - 1.96 * se[i], 2)),
      hi: coef.map((c, i) => round(c + 1.96 * se[i], 2)),
    };
  };
  return {
    periods,
    officials: {
      secretario: make('Secretário do partido', 0.42),
      governador: make('Governador', 0.18),
    },
  };
})();

// --- Urbanization in China across history (line + dynasty bands) ---
export interface UrbanHistory {
  points: [number, number][]; // [year, urbanization %]
  eras: { name: string; start: number; end: number }[];
}
export const urbanHistory: UrbanHistory = (() => {
  const years = [...range(-200, 1900, 25), ...range(1910, 2020, 10)];
  const points = years.map((y): [number, number] => {
    let v: number;
    if (y < 1900) {
      // medieval peak around the Song, slow decline afterwards
      v = 9 + 9 * Math.exp(-(((y - 1100) / 380) ** 2)) - 0.0012 * Math.max(0, y - 1400);
    } else {
      v = 7 + 57 * logistic((y - 1995) / 12);
    }
    return [y, round(Math.max(3, v + noise(y < 1900 ? 0.8 : 0.6)))];
  });
  return {
    points,
    eras: [
      { name: 'Han', start: -206, end: 220 },
      { name: 'Seis Dinastias', start: 220, end: 581 },
      { name: 'Sui', start: 581, end: 618 },
      { name: 'Tang', start: 618, end: 907 },
      { name: 'Cinco Dinastias', start: 907, end: 960 },
      { name: 'Song', start: 960, end: 1279 },
      { name: 'Yuan', start: 1279, end: 1368 },
      { name: 'Ming', start: 1368, end: 1644 },
      { name: 'Qing', start: 1644, end: 1912 },
      { name: 'República', start: 1912, end: 1949 },
      { name: 'RPC', start: 1949, end: 2020 },
    ],
  };
})();

/** Data for each project chart, keyed by the `chart` field in the project's Markdown. */
export const projectData = {
  'sector-radar': sectorRadar,
  'officials-event': officialsEvent,
  'urban-history': urbanHistory,
} as const;
