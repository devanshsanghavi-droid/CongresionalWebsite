import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { I18nContext } from './context.ts';
import type { I18n } from './context.ts';
import { initialLanguage, translate } from './i18n.ts';
import type { Lang } from './i18n.ts';
import type { Draft } from './letter.ts';
import { listLetters, readSettings, writeSettings } from './store.ts';
import type { Settings } from './store.ts';
import type { StoredLetter } from './letter.ts';
import { Home } from './screens/Home.tsx';
import { Add } from './screens/Add.tsx';
import { Review } from './screens/Review.tsx';
import { Detail } from './screens/Detail.tsx';

export type Route = { name: 'home' } | { name: 'add' } | { name: 'review' } | { name: 'letter'; id: string };

function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, '');
  if (path === '/add') return { name: 'add' };
  if (path === '/review') return { name: 'review' };
  const letter = /^\/letter\/([a-z0-9]+)$/.exec(path);
  if (letter?.[1]) return { name: 'letter', id: letter[1] };
  return { name: 'home' };
}

export const href = (route: Route): string => {
  switch (route.name) {
    case 'home':
      return '#/';
    case 'add':
      return '#/add';
    case 'review':
      return '#/review';
    case 'letter':
      return `#/letter/${route.id}`;
  }
};

export function navigate(route: Route): void {
  window.location.hash = href(route);
}

export interface AppState {
  readonly letters: readonly StoredLetter[];
  readonly refresh: () => void;
  readonly settings: Settings;
  readonly setSettings: (s: Settings) => void;
  readonly draft: Draft | undefined;
  readonly setDraft: (d: Draft | undefined) => void;
  readonly realNow: number;
}

export function App() {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));
  const [settings, setSettingsState] = useState<Settings>(() => readSettings());
  const [lang, setLang] = useState<Lang>(() => initialLanguage(readSettings().language, navigator.languages ?? []));
  const [letters, setLetters] = useState<readonly StoredLetter[]>(() => listLetters());
  const [draft, setDraftState] = useState<Draft | undefined>(undefined);
  // The photo being checked lives in memory as an object URL; it is released
  // as soon as the draft it belongs to is saved, discarded or replaced.
  const setDraft = useCallback((next: Draft | undefined) => {
    setDraftState((previous) => {
      if (previous?.photoUrl.startsWith('blob:') && previous.photoUrl !== next?.photoUrl) {
        URL.revokeObjectURL(previous.photoUrl);
      }
      return next;
    });
  }, []);
  const [realNow, setRealNow] = useState(() => Date.now());
  const mainRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    const onHash = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // A countdown left open overnight should not stay on yesterday.
  useEffect(() => {
    const timer = window.setInterval(() => setRealNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  // The tab title says which screen this is, so history, tab switchers and a
  // screen reader's window list do not all say "Try Carta".
  const screenTitle = (() => {
    switch (route.name) {
      case 'home':
        return translate(lang, 'home.title');
      case 'add':
        return translate(lang, 'web.add.title');
      case 'review':
        return translate(lang, 'review.title');
      case 'letter':
        return letters.find((l) => l.id === route.id)?.programId ?? translate(lang, 'common.unknownProgram');
    }
  })();
  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = `${screenTitle} · ${translate(lang, 'web.title')} · Carta`;
  }, [lang, screenTitle]);

  // On a screen change, move focus to the new screen's heading, so a screen
  // reader announces where it is and keyboard users start at the top.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo(0, 0);
    const heading = mainRef.current?.querySelector('h1');
    if (heading instanceof HTMLElement) {
      heading.setAttribute('tabindex', '-1');
      heading.focus();
    }
  }, [route]);

  const refresh = useCallback(() => setLetters(listLetters()), []);

  const setSettings = useCallback((next: Settings) => {
    setSettingsState(next);
    writeSettings(next);
  }, []);

  const chooseLang = (next: Lang) => {
    setLang(next);
    setSettings({ ...settings, language: next });
  };

  const i18n: I18n = useMemo(() => ({ lang, t: (key, params) => translate(lang, key, params) }), [lang]);
  const { t } = i18n;

  const wide = route.name === 'review' || route.name === 'add';
  const state: AppState = { letters, refresh, settings, setSettings, draft, setDraft, realNow };

  return (
    <I18nContext.Provider value={i18n}>
      <a className="skip-link" href="#main" onClick={(e) => { e.preventDefault(); mainRef.current?.focus(); }}>
        {t('web.skip')}
      </a>
      <header className="app-header">
        <div className={`container ${wide ? 'wide' : ''}`}>
          <nav aria-label={t('web.nav.label')}>
            <span className="wordmark" aria-hidden="true">
              Carta
            </span>
            <a href={href({ name: 'home' })}>{t('home.title')}</a>
            {/* The landing page is in English only, and the Spanish link says so. */}
            <a href={import.meta.env.BASE_URL} hrefLang="en">
              {t('web.aboutLink')}
            </a>
          </nav>
          <div className="lang-switch" role="group" aria-label={t('web.languageSwitch')}>
            <button type="button" lang="en" aria-pressed={lang === 'en'} onClick={() => chooseLang('en')}>
              English
            </button>
            <button type="button" lang="es" aria-pressed={lang === 'es'} onClick={() => chooseLang('es')}>
              Español
            </button>
          </div>
        </div>
      </header>
      <main
        id="main"
        ref={mainRef}
        tabIndex={-1}
        className={`container app-main ${wide ? 'wide' : ''}`}
      >
        {route.name === 'home' ? <Home state={state} /> : null}
        {route.name === 'add' ? <Add state={state} /> : null}
        {route.name === 'review' ? <Review state={state} /> : null}
        {route.name === 'letter' ? <Detail state={state} id={route.id} /> : null}
      </main>
    </I18nContext.Provider>
  );
}
