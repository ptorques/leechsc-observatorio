import type { Footprint, FootprintProvince } from '../data/scChina';
import { baseOption, mix, registerMap, tooltip } from '../lib/charts';
import { fmt, fmt1 } from '../lib/format';
import type { Builder, Params } from './types';

type Metric = 'va' | 'purchases';

const LABELS: Record<Metric, string> = {
  va: 'Valor adicionado gerado',
  purchases: 'Compras diretas',
};

/** One province with the values of the selected product group. */
interface Row extends FootprintProvince {
  purchases: number;
  va: number;
  vaDirect: number;
}

/**
 * Albers equal-area conic for China (standard parallels 25°N and 47°N, central
 * meridian 105°E). Equal-area, so the size of a province on screen is
 * proportional to its real area. ECharts expects y to grow downward.
 */
const albers = (() => {
  const rad = Math.PI / 180;
  const [p1, p2, p0, l0] = [25 * rad, 47 * rad, 35 * rad, 105 * rad];
  const n = (Math.sin(p1) + Math.sin(p2)) / 2;
  const C = Math.cos(p1) ** 2 + 2 * n * Math.sin(p1);
  const r0 = Math.sqrt(C - 2 * n * Math.sin(p0)) / n;
  return {
    project: ([lon, lat]: number[]) => {
      const r = Math.sqrt(C - 2 * n * Math.sin(lat * rad)) / n;
      const th = n * (lon * rad - l0);
      return [r * Math.sin(th), -(r0 - r * Math.cos(th))];
    },
    unproject: ([x, y]: number[]) => {
      const dy = r0 + y;
      const r = Math.hypot(x, dy);
      const th = Math.atan2(x, dy);
      return [(l0 + th / n) / rad, Math.asin((C - (r * n) ** 2) / (2 * n)) / rad];
    },
  };
})();

/**
 * Choropleth of China's provinces colored by the chosen metric and product
 * group (controls `metric` and `sector`), with a ranking of the largest values
 * beside it on wide screens. The color scale is rescaled for each selection. The geometry
 * (src/data/china-geo.json, made by analysis/china_map.py) is loaded on demand.
 */
export const footprintMap: Builder<Footprint> = ({ data, root, control }, t) => {
  const metric = (control('metric') as Metric) ?? 'va';
  const sector = data.sectors.find((s) => s.name === control('sector')) ?? data.sectors[0];
  const rows: Row[] = data.provinces.map((p, i) => ({
    ...p,
    purchases: sector.purchases[i],
    va: sector.va[i],
    vaDirect: sector.vaDirect[i],
  }));
  const hue = { va: t.red, purchases: t.green }[metric];
  const val = (p: Row) => p[metric];
  const max = Math.max(...rows.map(val));
  // square-root scale so the interior provinces remain distinguishable from zero
  const k = (v: number) => Math.sqrt(Math.max(v, 0) / max);
  const low = mix(t.surface, hue, 0.08);
  const fill = (v: number) => mix(t.surface, hue, 0.08 + 0.92 * k(v));
  const noData = mix(t.bg, t.border, 0.45);

  const chart = root.querySelector<HTMLElement>('[data-chart]') ?? root;
  const W = chart.clientWidth || 600;
  const H = chart.clientHeight || 440;
  const wide = W >= 720;
  const mapW = wide ? W * 0.6 : W;

  const byName = new Map(rows.map((p) => [p.name, p]));
  const ranked = [...rows].sort((a, b) => val(b) - val(a));
  const top = ranked.slice(0, 10).reverse();
  const labeled = new Set(ranked.slice(0, 3).map((p) => p.name));

  const short = (v: number) => (v >= 1000 ? `${fmt1.format(v / 1000)} bi` : fmt.format(v));

  const tip = (name: string) => {
    const p = byName.get(name);
    if (!p) return `<b>${name}</b><br/><span style="color:${t.muted}">fora da matriz inter-regional do CEADS</span>`;
    const indirect = p.va > 0 ? 1 - p.vaDirect / p.va : 0;
    return [
      `<b>${p.name}</b> <span style="color:${t.muted}">${p.zh} · ${p.region}</span>`,
      `<span style="color:${t.muted}">${sector.name}</span>`,
      `Valor adicionado gerado: <b>US$ ${fmt.format(p.va)} mi</b>`,
      `&nbsp;&nbsp;via cadeias internas: ${fmt1.format(indirect * 100)}%`,
      `Compras diretas de SC: US$ ${fmt.format(p.purchases)} mi`,
    ].join('<br/>');
  };

  return {
    ...baseOption(t),
    legend: { show: false },
    animationDurationUpdate: 600,
    tooltip: tooltip(t, { trigger: 'item', formatter: (p: Params) => tip(p.name) }),
    // color legend for the map (the bars carry their own values)
    visualMap: {
      type: 'continuous',
      seriesIndex: 0,
      min: 0,
      max: 1,
      inRange: { color: [low, hue] },
      text: [short(max), '0'],
      textGap: 6,
      textStyle: { color: t.muted, fontFamily: t.font, fontSize: 11 },
      orient: 'horizontal',
      itemWidth: 10,
      itemHeight: wide ? 120 : 90,
      left: 4,
      bottom: 4,
      calculable: false,
      hoverLink: false,
    },
    grid: wide ? { left: mapW + 30, right: 64, top: 28, bottom: 8, containLabel: true } : { show: false },
    xAxis: { type: 'value', show: false },
    yAxis: {
      type: 'category',
      show: wide,
      data: top.map((p) => p.name),
      name: `Maiores · ${LABELS[metric].toLowerCase()}`,
      nameLocation: 'end',
      nameGap: 10,
      nameTextStyle: { color: t.muted, align: 'left', fontStyle: 'italic', padding: [0, 0, 0, -100] },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: t.text, fontSize: 12 },
    },
    series: [
      {
        type: 'map',
        // not 'china': ECharts would add its own South China Sea inset under that name
        map: 'china-provinces',
        showLegendSymbol: false,
        projection: albers,
        left: 0,
        top: 4,
        width: mapW,
        height: H - 36,
        roam: false,
        selectedMode: false,
        itemStyle: { areaColor: noData, borderColor: t.bg, borderWidth: 0.8 },
        emphasis: {
          label: { show: false },
          itemStyle: { borderColor: t.text, borderWidth: 1.4 },
        },
        label: {
          fontFamily: t.font,
          color: t.text,
          textBorderColor: t.surface,
          textBorderWidth: 3,
          rich: {
            n: { fontSize: 12, fontFamily: t.font, color: t.text, lineHeight: 15 },
            v: { fontSize: 11, fontFamily: t.font, color: t.muted },
          },
        },
        data: rows.map((p) => ({
          name: p.name,
          value: k(val(p)),
          label: { show: labeled.has(p.name), formatter: `{n|${p.name}}\n{v|${short(val(p))}}` },
          // keep the fill on hover; only the outline changes
          emphasis: { itemStyle: { areaColor: fill(val(p)) } },
        })),
      },
      ...(wide
        ? [
            {
              type: 'bar',
              barWidth: '62%',
              data: top.map((p) => ({ name: p.name, value: val(p), itemStyle: { color: fill(val(p)) } })),
              label: {
                show: true,
                position: 'right',
                color: t.muted,
                fontSize: 12,
                formatter: (p: Params) => short(Number(p.value)),
              },
            },
          ]
        : []),
    ],
  };
};
footprintMap.rebuildOnResize = true;
footprintMap.prepare = async () => {
  const geo = await import('../data/china-geo.json');
  registerMap('china-provinces', geo.default as Parameters<typeof registerMap>[1]);
};
