// Client entry: finds every <Chart> on the page and mounts it when it scrolls
// into view (so its intro animation is actually seen).
import { builders } from '../charts';
import { mountChart } from '../lib/charts';

function controlValue(root: HTMLElement, name: string): string | undefined {
  const select = root.querySelector<HTMLSelectElement>(`select[data-control="${name}"]`);
  if (select) return select.value;
  return root.querySelector<HTMLElement>(`button[data-control="${name}"][aria-pressed="true"]`)?.dataset.value;
}

async function init(root: HTMLElement) {
  const el = root.querySelector<HTMLElement>('[data-chart]');
  if (!el) return;
  const build = builders[el.dataset.chart ?? ''];
  if (!build) {
    console.warn(`Unknown chart "${el.dataset.chart}"`);
    return;
  }
  await build.prepare?.();
  const data = JSON.parse(el.dataset.payload ?? 'null');
  const ctx = { data, root, control: (name: string) => controlValue(root, name), state: {} };
  const { chart, rerender } = mountChart(el, (t) => build(ctx, t), { rebuildOnResize: !!build.rebuildOnResize });
  build.setup?.(chart, ctx, rerender);

  root.querySelectorAll<HTMLElement>('[data-control]').forEach((c) => {
    if (c instanceof HTMLSelectElement) {
      c.addEventListener('change', rerender);
    } else {
      c.addEventListener('click', () => {
        root
          .querySelectorAll(`[data-control="${c.dataset.control}"]`)
          .forEach((b) => b.setAttribute('aria-pressed', String(b === c)));
        rerender();
      });
    }
  });
}

const observer = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      observer.unobserve(e.target);
      // one broken chart must not stop the others from mounting
      init(e.target as HTMLElement).catch((err) => {
        console.error(err);
        (e.target as HTMLElement).dataset.chartError = String(err);
      });
    }
  },
  { threshold: 0.15 },
);

// Wait for Latin Modern so chart labels are measured with the right font.
document.fonts.ready.then(() => {
  document.querySelectorAll<HTMLElement>('[data-chart-root]').forEach((r) => observer.observe(r));
});
