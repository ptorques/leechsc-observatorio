import type { PartnerShare } from '../data/scChina';
import { baseOption, categoryAxis, tooltip, valueAxis } from '../lib/charts';
import { fmt1 } from '../lib/format';
import type { Builder, Params } from './types';

/** 100% stacked area: each partner's share of SC imports or exports, China on the bottom. */
export const partnerShare: Builder<PartnerShare> = ({ data, control }, t) => {
  const colors = [t.red, t.slate, t.ochre, t.green, t.taupe];
  const series = control('flow') === 'exports' ? data.exports : data.imports;
  return {
    ...baseOption(t),
    tooltip: tooltip(t, {
      trigger: 'axis',
      axisPointer: { type: 'line', lineStyle: { color: t.text, type: 'dashed' } },
      valueFormatter: (v: Params) => `${fmt1.format(Number(v))}%`,
    }),
    xAxis: categoryAxis(t, { data: data.years, boundaryGap: false }),
    yAxis: valueAxis(t, { max: 100, axisLabel: { color: t.muted, formatter: '{value}%' } }),
    series: series.map((s, i) => ({
      name: s.name,
      type: 'line',
      stack: 'share',
      smooth: 0.3,
      symbol: 'none',
      data: s.values,
      lineStyle: { width: i === 0 ? 2 : 0.8, color: colors[i] },
      itemStyle: { color: colors[i] },
      areaStyle: { color: colors[i], opacity: i === 0 ? 0.85 : 0.45 },
      emphasis: { focus: 'series', areaStyle: { opacity: 0.95 } },
    })),
  };
};
