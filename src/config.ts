/**
 * Site-wide settings that are expected to change.
 */

/**
 * The demo video. While this is empty, the landing page shows no video section
 * at all (no placeholder box, no "coming soon").
 *
 * - A path on this site (for example `video/carta-demo.mp4`, a file placed in
 *   `public/video/`) is played in the page.
 * - A full URL on another site (YouTube, Vimeo) is shown as a link that opens
 *   that site. It is NOT embedded: an embedded player would load another
 *   company's scripts and trackers, which this site's Content-Security-Policy
 *   forbids by design.
 */
export const DEMO_VIDEO_URL = '';

export const REPO_URL = 'https://github.com/devanshsanghavi-droid/Congressional_App_Challenge';
export const SITE_REPO_URL = 'https://github.com/devanshsanghavi-droid/CongresionalWebsite';

/** The Carta commit the vendored code came from; read from the sync manifest. */
export { carta_commit as CARTA_COMMIT } from './carta/SYNC-MANIFEST.json';
