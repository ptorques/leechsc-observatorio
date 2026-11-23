import type { ChartOption, Tokens } from '../lib/charts';

export interface ChartContext<T> {
  data: T;
  /** The <figure> wrapping the chart; holds any controls. */
  root: HTMLElement;
  /** Current value of a control: a <select data-control="name"> or the pressed <button data-control="name" data-value>. */
  control: (name: string) => string | undefined;
}

export type Builder<T> = (ctx: ChartContext<T>, t: Tokens) => ChartOption;

// ECharts callback params are loosely typed; this keeps builders readable.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Params = any;
