import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { useI18n } from '../context.ts';

/**
 * For a confirm box that replaces the button that opened it. Returns a ref for
 * that button, and puts focus back on it when the box closes, so Cancel does
 * not drop a keyboard or screen-reader user at the top of the page.
 */
export function useReturnFocus(open: boolean): RefObject<HTMLButtonElement | null> {
  const ref = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !open) ref.current?.focus();
    wasOpen.current = open;
  }, [open]);
  return ref;
}

/**
 * What this page is, and what it is not. In full before anyone has added a
 * letter; folded to one line once there is a countdown to show, because the
 * countdown, not an explanation, is what Home is for (the app's SPEC §7).
 */
export function WebBanner({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  if (compact) {
    return (
      <details className="notice-box">
        <summary>{t('web.banner.title')}</summary>
        <p>{t('web.banner.body')}</p>
        <p>
          <strong>{t('web.banner.private')}</strong>
        </p>
      </details>
    );
  }
  return (
    <section className="notice-box" aria-labelledby="web-banner-title">
      <h2 id="web-banner-title">{t('web.banner.title')}</h2>
      <p>{t('web.banner.body')}</p>
      <p>
        <strong>{t('web.banner.private')}</strong>
      </p>
    </section>
  );
}

export function Disclaimer() {
  const { t } = useI18n();
  return (
    <p className="small" style={{ marginTop: 32 }}>
      <strong>{t('disclaimer.notLegalAdvice')}</strong>
    </p>
  );
}
