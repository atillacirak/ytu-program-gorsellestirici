export type ThemeId = 'nordic-yellow' | 'campuskit' | 'classic';

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  tagline: string;
  swatches: [string, string, string];
  fontLabel: string;
  radiusLabel: string;
}

export const THEME_STORAGE_KEY = 'ytudostun_theme_v1';
export const DEFAULT_THEME_ID: ThemeId = 'campuskit';

export const THEMES: ThemeMeta[] = [
  {
    id: 'nordic-yellow',
    name: 'Nordic Yellow',
    tagline: 'İskandinav fonksiyonel · Mavi & Sarı · Flat 4px',
    swatches: ['#003399', '#FFDA1A', '#F2F5FA'],
    fontLabel: 'Noto Sans · JetBrains Mono',
    radiusLabel: '4px · Flat'
  },
  {
    id: 'campuskit',
    name: 'CampusKit',
    tagline: 'Üniversite portalı · Bordo & Altın · Serif',
    swatches: ['#7F1D1D', '#CA8A04', '#FCF7EE'],
    fontLabel: 'Vollkorn · DM Sans · Source Code Pro',
    radiusLabel: '6px · Kolej'
  },
  {
    id: 'classic',
    name: 'YTÜ Klasik',
    tagline: 'Orijinal YTÜ Dostun · Lacivert & Altın',
    swatches: ['#0c3f79', '#e7a240', '#f8fafc'],
    fontLabel: 'Inter · JetBrains Mono',
    radiusLabel: '12–16px'
  }
];

export function isValidThemeId(val: unknown): val is ThemeId {
  return val === 'nordic-yellow' || val === 'campuskit' || val === 'classic';
}
