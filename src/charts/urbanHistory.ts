import type { UrbanHistory } from '../data/placeholder';
import { alpha, baseOption, slider, tooltip, valueAxis } from '../lib/charts';
import { fmt1, yearLabel } from '../lib/format';
import type { Builder, Params } from './types';

/** Long-run urbanization line with alternating dynasty bands; zoom with the slider. */
export const urbanHistory: Builder<UrbanHistory> = ({ data }, t) => {
  const first = data.points[0][0];
  const last = data.points[data.points.length - 1][0];
  return {
    ...baseOption(t),
    legend: { show: false },
    grid: { left: 8, right: 16, top: 30, bottom: 44, containLabel: true },
    tooltip: tooltip(t, {
      trigger: 'axis',
      formatter: (ps: Params[]) => {
        const [y, v] = ps[0].data;
        const era = data.eras.find((e) => y >= e.start && y < e.end);
        return `<b>${yearLabel(y)}</b>${era ? ` · ${era.name}` : ''}<br/>Urbanização: ${fmt1.format(v)}%`;
      },
    }),
    xAxis: valueAxis(t, {
      min: first,
      max: last,
      splitLine: { show: false },
      axisLine: { show: true, lineStyle: { color: t.text } },
      axisLabel: { color: t.muted, formatter: (v: number) => yearLabel(v) },
    }),
    // axisLine off: otherwise it is drawn at year 0, mid-chart
    yAxis: valueAxis(t, { axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: t.muted, formatter: '{value}%' } }),
    dataZoom: [{ type: 'inside' }, slider(t)],
    series: [
      {
        type: 'line',
        data: data.points,
        smooth: 0.25,
        symbol: 'none',
        lineStyle: { color: t.red, width: 2 },
        areaStyle: { color: alpha(t.red, 0.1) },
        markArea: {
          silent: true,
          data: data.eras.map((e, i) => [
            {
              name: e.end - e.start >= 80 ? e.name : '',
              xAxis: Math.max(e.start, first),
              itemStyle: { color: i % 2 ? alpha(t.green, 0.1) : 'transparent' },
              label: { color: t.green, fontFamily: t.font, fontSize: 12, position: 'insideTop' },
            },
            { xAxis: e.end },
          ]),
        },
      },
    ],
  };
};
