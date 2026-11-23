import type { ChartInstance, ChartOption, Tokens } from '../lib/charts';

export interface ChartContext<T> {
  data: T;
  /** The <figure> wrapping the chart; holds any controls. */
  root: HTMLElement;
  /** Current value of a control: a <select data-control="name"> or the pressed <button data-control="name" data-value>. */
  control: (name: string) => string | undefined;
  /** Per-chart state that survives re-renders (e.g. what the reader clicked). */
  state: Record<string, unknown>;
}

export type Builder<T> = ((ctx: ChartContext<T>, t: Tokens) => ChartOption) & {
  /** Re-run the builder when the chart is resized (for layouts computed in pixels). */
  rebuildOnResize?: boolean;
  /** Async setup run once before the first render (e.g. loading map geometry). */
  prepare?: () => Promise<void>;
  /** Runs once after mounting, e.g. to react to clicks; call `rerender` after changing `ctx.state`. */
  setup?: (chart: ChartInstance, ctx: ChartContext<T>, rerender: () => void) => void;
};

// ECharts callback params are loosely typed; this keeps builders readable.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Params = any;
