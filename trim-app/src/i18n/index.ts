import en from './en';
import ko from './ko';
import type { Translations } from './en';

const lang = import.meta.env.VITE_LANG || 'en';
export const t: Translations = lang === 'ko' ? ko : en;
