// Shared ECharts setup. Only the pieces we use are imported, to keep the bundle
// small; register more chart types/components here as new visualizations need them.
import * as echarts from 'echarts/core';
import {
  BarChart,
  LineChart,
  MapChart,
  RadarChart,
  SankeyChart,
  ScatterChart,
} from 'echarts/charts';
import {
  DataZoomComponent,
  GeoComponent,
  GraphicComponent,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  RadarComponent,
  TooltipComponent,
  VisualMapContinuousComponent,
} from 'echarts/components';
import { LabelLayout } from 'echarts/features';
import { SVGRenderer } from 'echarts/renderers';

echarts.use([
  BarChart,
  LineChart,
  MapChart,
  RadarChart,
  SankeyChart,
  ScatterChart,
  DataZoomComponent,
  GeoComponent,
  GraphicComponent,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  RadarComponent,
  TooltipComponent,
  VisualMapContinuousComponent,
  LabelLayout,
  SVGRenderer,
]);

export type ChartOption = echarts.EChartsCoreOption;
export type ChartInstance = echarts.ECharts;
export const registerMap = echarts.registerMap;

export interface Tokens {
  bg: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  grid: string;
  red: string;
  green: string;
  ochre: string;
  slate: string;
  taupe: string;
  font: string;
}

export function readTokens(): Tokens {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string) => css.getPropertyValue(name).trim();
  return {
    bg: v('--bg'),
    surface: v('--surface'),
    text: v('--text'),
    muted: v('--muted'),
    border: v('--border'),
    grid: v('--grid'),
    red: v('--red'),
    green: v('--green'),
    ochre: v('--ochre'),
    slate: v('--slate'),
    taupe: v('--taupe'),
    font: v('--serif'),
  };
}

/** `#rrggbb` → `rgba(r,g,b,a)` */
export function alpha(hex: string, a: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Defaults every chart shares, so builders only describe their data. */
export function baseOption(t: Tokens): ChartOption {
  return {
    color: [t.red, t.green, t.ochre, t.slate, t.taupe],
    textStyle: { fontFamily: t.font, color: t.muted, fontSize: 13 },
    animationDuration: 900,
    animationEasing: 'cubicOut',
    legend: {
      top: 0,
      icon: 'rect',
      itemWidth: 14,
      itemHeight: 8,
      textStyle: { color: t.text, fontFamily: t.font },
    },
    grid: { left: 8, right: 16, top: 40, bottom: 8, containLabel: true },
  };
}

export function tooltip(t: Tokens, extra: Record<string, unknown> = {}) {
  return {
    backgroundColor: t.surface,
    borderColor: t.border,
    borderWidth: 1,
    padding: [8, 12],
    textStyle: { color: t.text, fontFamily: t.font, fontSize: 13 },
    extraCssText: 'box-shadow: 0 4px 14px rgba(43,33,28,.12); border-radius: 3px;',
    ...extra,
  };
}

export function categoryAxis(t: Tokens, extra: Record<string, unknown> = {}) {
  return {
    type: 'category',
    axisLine: { lineStyle: { color: t.text } },
    axisTick: { show: false },
    axisLabel: { color: t.muted },
    ...extra,
  };
}

export function valueAxis(t: Tokens, extra: Record<string, unknown> = {}) {
  return {
    type: 'value',
    splitLine: { lineStyle: { color: t.grid } },
    axisLabel: { color: t.muted },
    ...extra,
  };
}

export function slider(t: Tokens, extra: Record<string, unknown> = {}) {
  return {
    type: 'slider',
    height: 16,
    bottom: 6,
    borderColor: t.border,
    backgroundColor: t.surface,
    fillerColor: alpha(t.red, 0.12),
    dataBackground: { lineStyle: { color: t.taupe }, areaStyle: { color: alpha(t.taupe, 0.3) } },
    handleStyle: { color: t.surface, borderColor: t.red },
    moveHandleStyle: { color: t.red, opacity: 0.4 },
    textStyle: { color: t.muted, fontFamily: t.font },
    ...extra,
  };
}

/**
 * Mounts a chart into `el`. `build` receives the color tokens and returns the
 * option. Returns the instance and a function that re-renders (merging, so
 * changes animate).
 */
export function mountChart(
  el: HTMLElement,
  build: (t: Tokens) => ChartOption,
  { rebuildOnResize = false } = {},
) {
  const chart = echarts.init(el, undefined, { renderer: 'svg' });
  const tokens = readTokens();
  chart.setOption(build(tokens));
  new ResizeObserver(() => {
    chart.resize();
    if (rebuildOnResize) chart.setOption(build(tokens));
  }).observe(el);
  return { chart, rerender: () => chart.setOption(build(tokens)) };
}

/** Linear blend between two `#rrggbb` colors (`k` from 0 to 1). */
export function mix(a: string, b: string, k: number): string {
  const p = (h: string) => parseInt(h.replace('#', ''), 16);
  const [x, y] = [p(a), p(b)];
  const ch = (s: number) => Math.round(((x >> s) & 255) * (1 - k) + ((y >> s) & 255) * k);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}
