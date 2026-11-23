import type { EventStudy } from '../data/placeholder';
import { alpha, baseOption, categoryAxis, tooltip, valueAxis } from '../lib/charts';
import { fmt2, signed } from '../lib/format';
import type { Builder, Params } from './types';

/** Event study: estimated effect (with 95% CI band) around an official taking office. */
export const officialsEvent: Builder<EventStudy> = ({ data, control }, t) => {
  const key = control('official') ?? Object.keys(data.officials)[0];
  const s = data.officials[key];
  const labels = data.periods.map((k) => (k === 0 ? 'posse' : k > 0 ? `+${k}` : `−${-k}`));

  return {
    ...baseOption(t),
    legend: { show: false },
    grid: { left: 8, right: 16, top: 36, bottom: 28, containLabel: true },
    tooltip: tooltip(t, {
      trigger: 'axis',
      formatter: (ps: Params[]) => {
        const i = ps[0].dataIndex;
        return `<b>Ano ${labels[i]}</b><br/>Efeito: ${signed(s.coef[i])} p.p.<br/>IC 95%: [${signed(s.lo[i])}; ${signed(s.hi[i])}]`;
      },
    }),
    xAxis: categoryAxis(t, {
      data: labels,
      boundaryGap: false,
      name: 'Anos em relação à posse',
      nameLocation: 'middle',
      nameGap: 28,
      nameTextStyle: { color: t.muted },
    }),
    yAxis: valueAxis(t, {
      name: 'Δ crescimento do PIB (p.p.)',
      nameTextStyle: { color: t.muted, align: 'left' },
      axisLabel: { color: t.muted, formatter: (v: number) => fmt2.format(v) },
    }),
    series: [
      // CI band = invisible lower line + stacked (hi − lo) area on top of it
      {
        type: 'line',
        data: s.lo,
        stack: 'ci',
        stackStrategy: 'all',
        symbol: 'none',
        lineStyle: { opacity: 0 },
        silent: true,
      },
      {
        type: 'line',
        data: s.hi.map((h, i) => +(h - s.lo[i]).toFixed(2)),
        stack: 'ci',
        stackStrategy: 'all',
        symbol: 'none',
        lineStyle: { opacity: 0 },
        areaStyle: { color: alpha(t.red, 0.14) },
        silent: true,
      },
      {
        name: s.label,
        type: 'line',
        data: s.coef,
        symbol: 'circle',
        symbolSize: 7,
        lineStyle: { color: t.red, width: 2 },
        itemStyle: { color: t.red, borderColor: t.surface, borderWidth: 1 },
        animationDurationUpdate: 600,
        markLine: {
          symbol: 'none',
          silent: true,
          lineStyle: { color: t.muted, type: 'dashed', width: 1 },
          label: { show: false },
          data: [{ xAxis: labels.indexOf('posse') }, { yAxis: 0 }],
        },
      },
    ],
  };
};
