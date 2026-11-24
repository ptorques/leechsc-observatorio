import type { SectorRadar } from '../data/placeholder';
import { alpha, baseOption, tooltip } from '../lib/charts';
import type { Builder } from './types';

/** Radar: SC's sector shares vs the province picked in the <select data-control="province">. */
export const sectorRadar: Builder<SectorRadar> = ({ data, control, root }, t) => {
  const narrow = root.clientWidth < 480;
  const name = control('province') ?? data.provinces[0].name;
  const province = data.provinces.find((p) => p.name === name) ?? data.provinces[0];
  const max = Math.ceil(Math.max(...data.sc, ...data.provinces.flatMap((p) => p.values)) / 5) * 5;

  return {
    ...baseOption(t),
    legend: { ...(baseOption(t).legend as object), data: ['Santa Catarina', province.name] },
    tooltip: tooltip(t, { trigger: 'item' }),
    radar: {
      center: ['50%', '56%'],
      radius: narrow ? '44%' : '68%',
      shape: 'polygon',
      splitNumber: 4,
      indicator: data.sectors.map((s) => ({ name: s, max })),
      axisName: { color: t.text, fontFamily: t.font, fontSize: narrow ? 11 : 13 },
      axisLine: { lineStyle: { color: t.grid } },
      splitLine: { lineStyle: { color: t.grid } },
      splitArea: { areaStyle: { color: [t.surface, t.bg] } },
    },
    series: [
      {
        type: 'radar',
        symbolSize: 5,
        animationDurationUpdate: 600,
        data: [
          {
            name: 'Santa Catarina',
            value: data.sc,
            itemStyle: { color: t.red },
            lineStyle: { color: t.red, width: 2 },
            areaStyle: { color: alpha(t.red, 0.18) },
          },
          {
            name: province.name,
            value: province.values,
            itemStyle: { color: t.green },
            lineStyle: { color: t.green, width: 2 },
            areaStyle: { color: alpha(t.green, 0.18) },
          },
        ],
      },
    ],
  };
};
sectorRadar.rebuildOnResize = true;
