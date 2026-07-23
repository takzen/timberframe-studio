import { translate, type Translate } from './i18n';
import { useStore } from './store';

/** Hook returning a translate function bound to the current UI language. */
export function useT(): Translate {
  const lang = useStore((s) => s.language);
  return (key, vars) => translate(lang, key, vars);
}
