import type { ProvinceBubble, ProvincePoint } from '../data/placeholder';
import { alpha, baseOption, tooltip, valueAxis } from '../lib/charts';
import { fmt1 } from '../lib/format';
import type { Builder, Params } from './types';

const point = (p: ProvincePoint) => [p.gdpPc, p.growth, p.pop, p.name];
const size = (d: number[]) => 6 + Math.sqrt(d[2]) * 3.2;

/** Bubble scatter: Chinese provinces vs Santa Catarina (x = GDP per capita, y = growth, size = population). */
export const provinceBubble: Builder<ProvinceBubble> = ({ data }, t) => ({
  ...baseOption(t),
  grid: { left: 8, right: 24, top: 40, bottom: 28, containLabel: true },
  tooltip: tooltip(t, {
    trigger: 'item',
    formatter: (p: Params) => {
      const [x, y, pop, name] = p.data;
      return `<b>${name}</b><br/>PIB per capita: US$ ${fmt1.format(x)} mil<br/>Crescimento: ${fmt1.format(y)}% a.a.<br/>População: ${fmt1.format(pop)} mi`;
    },
  }),
  xAxis: valueAxis(t, {
    name: 'PIB per capita (US$ mil)',
    nameLocation: 'middle',
    nameGap: 28,
    nameTextStyle: { color: t.muted },
    scale: true,
  }),
  yAxis: valueAxis(t, {
    name: 'Crescimento médio (% a.a.)',
    nameTextStyle: { color: t.muted, align: 'left' },
    // pad below/above the data so edge bubbles aren't clipped
    min: (v: { min: number }) => Math.floor(v.min) - 1,
    max: (v: { max: number }) => Math.ceil(v.max) + 1,
  }),
  dataZoom: [
    { type: 'inside', xAxisIndex: 0 },
    { type: 'inside', yAxisIndex: 0 },
  ],
  series: [
    {
      name: 'Províncias chinesas',
      type: 'scatter',
      data: data.provinces.map(point),
      symbolSize: size,
      itemStyle: { color: alpha(t.green, 0.45), borderColor: t.green, borderWidth: 1 },
      emphasis: {
        focus: 'self',
        itemStyle: { color: alpha(t.green, 0.8) },
        label: { show: true, formatter: (p: Params) => p.data[3], position: 'top', color: t.text },
      },
      labelLayout: { hideOverlap: true },
    },
    {
      name: 'Santa Catarina',
      type: 'scatter',
      data: [point(data.sc)],
      symbolSize: size,
      z: 5,
      itemStyle: { color: t.red, borderColor: t.surface, borderWidth: 1.5 },
      label: {
        show: true,
        formatter: 'Santa Catarina',
        position: 'right',
        color: t.red,
        fontWeight: 'bold',
        fontFamily: t.font,
      },
    },
  ],
});
