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

// =========================== Raison d'être ===============================

export const kpis = [
  { value: '1º', label: 'parceiro comercial de Santa Catarina' },
  { value: '38%', label: 'das importações catarinenses' },
  { value: 'US$ 11,2 bi', label: 'em corrente de comércio (2024)' },
  { value: '+142%', label: 'em dez anos' },
];

// --- Partner shares of SC trade over time (stacked 100% area) ---
export interface PartnerShare {
  years: number[];
  series: { name: string; values: number[] }[];
}
export const partnerShare: PartnerShare = (() => {
  const years = range(2000, 2024);
  const raw = {
    China: years.map((y) => 3 + 34 * logistic((y - 2011) / 3) + noise(1.2)),
    'Estados Unidos': years.map((_, i) => 26 - 0.45 * i + noise(1.5)),
    'União Europeia': years.map((_, i) => 24 - 0.3 * i + noise(1.5)),
    Argentina: years.map((_, i) => 14 - 0.25 * i + noise(1.2)),
    Outros: years.map(() => 30 + noise(2)),
  };
  const names = Object.keys(raw) as (keyof typeof raw)[];
  const series = names.map((name) => ({ name, values: [] as number[] }));
  years.forEach((_, i) => {
    const total = names.reduce((s, n) => s + Math.max(raw[n][i], 0.5), 0);
    names.forEach((n, k) => series[k].values.push(round((Math.max(raw[n][i], 0.5) / total) * 100)));
  });
  return { years, series };
})();

// --- SC vs Chinese provinces (bubble scatter) ---
export interface ProvincePoint {
  name: string;
  gdpPc: number; // US$ mil
  growth: number; // % a.a.
  pop: number; // milhões
}
export interface ProvinceBubble {
  provinces: ProvincePoint[];
  sc: ProvincePoint;
}
const PROVINCES = [
  'Pequim', 'Tianjin', 'Hebei', 'Shanxi', 'Mongólia Interior', 'Liaoning', 'Jilin',
  'Heilongjiang', 'Xangai', 'Jiangsu', 'Zhejiang', 'Anhui', 'Fujian', 'Jiangxi',
  'Shandong', 'Henan', 'Hubei', 'Hunan', 'Guangdong', 'Guangxi', 'Hainan',
  'Chongqing', 'Sichuan', 'Guizhou', 'Yunnan', 'Tibete', 'Shaanxi', 'Gansu',
  'Qinghai', 'Ningxia', 'Xinjiang',
];
export const provinceBubble: ProvinceBubble = {
  provinces: PROVINCES.map((name) => ({
    name,
    gdpPc: round(between(6, 28)),
    growth: round(between(3.5, 9)),
    pop: round(between(3, 120)),
  })),
  sc: { name: 'Santa Catarina', gdpPc: 11.4, growth: 3.1, pop: 8.1 },
};

// --- Where SC exports go (sankey: product → destination) ---
export interface Flow {
  nodes: { name: string; kind: 'product' | 'destination' }[];
  links: { source: string; target: string; value: number }[];
}
export const exportSankey: Flow = (() => {
  const products: [string, number][] = [
    ['Carne suína', 0.62],
    ['Carne de frango', 0.45],
    ['Soja', 0.7],
    ['Madeira', 0.2],
    ['Motores elétricos', 0.08],
    ['Cerâmica', 0.05],
    ['Têxteis', 0.06],
  ];
  const others = ['Estados Unidos', 'União Europeia', 'Argentina', 'Japão', 'Outros'];
  const links: Flow['links'] = [];
  for (const [p, chinaShare] of products) {
    const total = between(150, 900);
    links.push({ source: p, target: 'China', value: round(total * chinaShare, 0) });
    const rest = total * (1 - chinaShare);
    const w = others.map(() => rand());
    const ws = w.reduce((a, b) => a + b, 0);
    others.forEach((o, i) => {
      const v = round((rest * w[i]) / ws, 0);
      if (v >= 12) links.push({ source: p, target: o, value: v });
    });
  }
  return {
    nodes: [
      ...products.map(([name]) => ({ name, kind: 'product' as const })),
      ...['China', ...others].map((name) => ({ name, kind: 'destination' as const })),
    ],
    links,
  };
})();

// --- What SC imports from China (treemap with drill-down) ---
export interface TreeNode {
  name: string;
  value?: number;
  children?: TreeNode[];
}
export const importTreemap: TreeNode[] = (
  [
    ['Máquinas e equipamentos', ['Motores e geradores', 'Máquinas industriais', 'Bombas e compressores', 'Peças']],
    ['Eletrônicos', ['Painéis solares', 'Telefones', 'Computadores', 'Componentes']],
    ['Químicos', ['Orgânicos', 'Fertilizantes', 'Farmacêuticos']],
    ['Têxteis', ['Fios', 'Tecidos', 'Vestuário']],
    ['Metais', ['Aço', 'Alumínio', 'Obras de metal']],
    ['Plásticos e borracha', ['Resinas', 'Pneus', 'Artefatos']],
  ] as [string, string[]][]
).map(([name, kids]) => ({
  name,
  children: kids.map((k) => ({ name: k, value: round(between(60, 900), 0) })),
}));

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
