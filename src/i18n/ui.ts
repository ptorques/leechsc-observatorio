// Languages shown in the switcher. Only `pt` has content today; flip `ready`
// to true (and add the translated pages/strings) to enable the others.
export const languages = [
  { code: 'pt', label: 'PT', name: 'Português', ready: true },
  { code: 'en', label: 'EN', name: 'English', ready: false },
  { code: 'zh', label: '中文', name: '中文', ready: false },
] as const;

export type Lang = (typeof languages)[number]['code'];
export const defaultLang: Lang = 'pt';

// Interface strings. Fill `en` and `zh` when translating.
export const ui = {
  pt: {
    'site.title': 'Observatório LEECHSC',
    'site.subtitle': 'Universidade Federal de Santa Catarina · Instituto I-Chin',
    'site.description': 'Pesquisa sobre as relações entre Santa Catarina e a China.',
    'nav.raison': 'Raison d’être',
    'nav.projects': 'Projetos',
    'nav.about': 'Sobre nós',
    'lang.soon': 'Em breve',
  },
} as const;

export type UiKey = keyof (typeof ui)['pt'];

export function t(key: UiKey, lang: Lang = defaultLang): string {
  const dict = (ui as Record<string, Partial<Record<UiKey, string>>>)[lang];
  return dict?.[key] ?? ui.pt[key];
}
