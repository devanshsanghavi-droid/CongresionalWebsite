import type { ReactNode } from 'react';
import { CARTA_COMMIT, DEMO_VIDEO_URL, REPO_URL, SITE_REPO_URL } from '../config.ts';

const base = import.meta.env.BASE_URL;
const TRY_URL = `${base}try/`;

/**
 * Figures about the problem.
 *
 * Every number here comes from the project's own sourced fact list (the app's
 * JOURNAL.md §2 and VIDEO-SCRIPT.md "Verify before publishing"), with the
 * wording limits that list sets: whose survey it is, national or California,
 * households or people. Sources are named rather than linked: the project
 * records the publisher and the study, and inventing a URL for one would be
 * exactly the kind of unsourced claim Carta's rules forbid.
 */
const STATS: readonly { figure: string; text: string; source: string; scope: string }[] = [
  {
    figure: '69%',
    text: 'About 25 million people lost Medicaid in the 2023 to 2024 unwinding. Among states that reported a reason, 69% of them were dropped for paperwork, not because anyone found them ineligible.',
    source: 'KFF Medicaid Enrollment and Unwinding Tracker',
    scope: 'United States',
  },
  {
    figure: '66%',
    text: 'About 2 million people were disenrolled from Medi-Cal during the unwinding, 66% of them for procedural reasons.',
    source: 'California Health Care Foundation (CHCF)',
    scope: 'California, Medi-Cal',
  },
  {
    figure: '6×',
    text: 'Households are six times more likely to leave CalFresh in a month when paperwork is due. More than half of those who leave are likely still eligible.',
    source: 'California Policy Lab',
    scope: 'California, CalFresh households',
  },
  {
    figure: '47%',
    text: 'Of people surveyed after being dropped from Medi-Cal, 47% said they never got a renewal form.',
    source: 'DHCS Medi-Cal Disenrollment Survey, Month 1 (1,262 respondents, self-reported)',
    scope: 'California, survey respondents',
  },
];

const SHOTS: readonly { file: string; alt: string; caption: string }[] = [
  {
    file: 'carta-home.jpg',
    alt: 'Carta home screen on an iPhone: three letters, each led by a large countdown. 2 days left in red, 11 days left in amber, 46 in green.',
    caption: 'Home. The nearest deadline is the biggest thing on the screen.',
  },
  {
    file: 'carta-notice-detail.jpg',
    alt: 'A letter in Carta: 2 days left, CalFresh, time to renew. Sections say what the letter says, what you must do, and by when.',
    caption: 'A letter: what it says, what to do, and by when.',
  },
  {
    file: 'carta-explanation.jpg',
    alt: 'The "In plain words" section: a plain-language rewrite of the letter, labelled as written by Carta on the phone and possibly wrong.',
    caption: 'In plain words: written on the phone by an optional AI model, labelled as machine-written.',
  },
  {
    file: 'carta-reminder.jpg',
    alt: 'A lock-screen notification: "Medi-Cal is due today. Send the form back so your benefits continue. Send: proof of income, photo ID."',
    caption: 'A reminder that says what to send, not just that something is due.',
  },
];

function SectionHead({ id, title, children }: { id: string; title: string; children?: ReactNode }) {
  return (
    <div className="section-head">
      <h2 id={id}>{title}</h2>
      {children ? <p>{children}</p> : null}
    </div>
  );
}

function DemoVideo() {
  if (DEMO_VIDEO_URL.trim() === '') return null;
  const external = /^https?:\/\//i.test(DEMO_VIDEO_URL);
  return (
    <section className="section" aria-labelledby="video-title">
      <div className="container">
        <SectionHead id="video-title" title="The demo video" />
        <div className="video">
          {external ? (
            <p>
              <a className="button" href={DEMO_VIDEO_URL} rel="noopener noreferrer">
                Watch the demo video
              </a>{' '}
              <span className="muted">(opens on another website; this site does not embed other sites)</span>
            </p>
          ) : (
            <video controls preload="metadata" src={`${base}${DEMO_VIDEO_URL.replace(/^\//, '')}`}>
              <a href={`${base}${DEMO_VIDEO_URL.replace(/^\//, '')}`}>Download the demo video</a>
            </video>
          )}
        </div>
      </div>
    </section>
  );
}

export function Landing() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to the main content
      </a>
      <header className="site-header">
        <div className="container">
          <a className="wordmark" href={base}>
            Carta
          </a>
          <nav className="site-nav" aria-label="Main">
            <ul>
              <li>
                <a href={TRY_URL}>Try Carta</a>
              </li>
              <li>
                <a href="#how">How it works</a>
              </li>
              <li>
                <a href="#privacy">Privacy</a>
              </li>
              <li>
                <a href="#platforms">Platforms</a>
              </li>
              <li>
                <a href={REPO_URL}>Code on GitHub</a>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <main id="main">
        <section className="hero" aria-labelledby="hero-title">
          <div className="container hero-grid">
            <div>
              <p className="eyebrow">Congressional App Challenge 2026 · CA-16 · Devansh Sanghavi</p>
              <h1 id="hero-title">
                Carta reads benefit letters for families on CalFresh and <span className="nowrap">Medi-Cal</span> so
                they don’t miss a deadline.
              </h1>
              <p className="lede">
                Most benefits tools help people apply. <strong>Carta helps them stay.</strong> Photograph the letter,
                check what Carta read, and the deadline becomes a countdown and a set of reminders that say what to
                send.
              </p>
              <div className="actions">
                <a className="button" href={TRY_URL}>
                  Try Carta in your browser
                </a>
                <a className="button secondary" href={REPO_URL}>
                  See the iPhone app’s code
                </a>
              </div>
              <p className="muted small">
                The iPhone app is the main app. The web version runs the same letter-reading code in your browser,
                with some honest differences, listed under <a href="#platforms">Platforms</a>.
              </p>
            </div>
            <div className="phone">
              <img
                src={`${base}screenshots/carta-home.jpg`}
                width={720}
                height={1565}
                alt="Carta's home screen on an iPhone: letters led by large countdowns in red, amber and green."
              />
            </div>
          </div>
        </section>

        <DemoVideo />

        <section className="section" aria-labelledby="problem-title">
          <div className="container">
            <SectionHead id="problem-title" title="People lose benefits over paperwork">
              Most people who lose CalFresh or Medi-Cal are not found ineligible. They miss a six-month report, a
              request for papers, or a renewal that came during a double shift. Researchers call this churn. The
              letters that cause it are dense, often English-only, with the deadline in the third paragraph.
            </SectionHead>
            <div className="grid two">
              {STATS.map((s) => (
                <div key={s.figure}>
                  <p className="stat-figure">{s.figure}</p>
                  <p>{s.text}</p>
                  <p className="source">
                    Source: {s.source}. Scope: {s.scope}.
                  </p>
                </div>
              ))}
            </div>
            <p className="caption" style={{ marginTop: 16 }}>
              Figures as the project’s sourced fact list records them, each with its own limits: the survey figure is
              about the people who answered it, not all Californians.
            </p>
          </div>
        </section>

        <section className="section" aria-labelledby="why-title">
          <div className="container">
            <SectionHead id="why-title" title="Why not just paste the letter into a chatbot?">
              Understanding a letter is easy to get anywhere. Remembering it, and acting on it, is not.
            </SectionHead>
            <blockquote className="quote">
              A chatbot will explain a letter today. It will not know, five weeks later at 9 am, that your SAR 7 is
              due Thursday and you have not attached a pay stub.
            </blockquote>
            <p className="prose" style={{ marginTop: 24 }}>
              So in Carta the countdown is the biggest thing on the screen, and the explanation is there to earn
              trust in it: “12 days” is worth nothing unless you believe the app read your letter correctly. Carta is
              built for one person in particular: Maria, 34, in San Jose (a composite, not a real person). Two kids,
              two part-time jobs, CalFresh and Medi-Cal, Spanish first, one phone and a limited data plan.
            </p>
          </div>
        </section>

        <section className="section" aria-labelledby="app-title">
          <div className="container">
            <SectionHead id="app-title" title="What the iPhone app does">
              In the order a family meets it. Everything runs on the phone, in English and Spanish, and works in
              airplane mode.
            </SectionHead>
            <ul className="shots">
              {SHOTS.map((s) => (
                <li key={s.file}>
                  <figure>
                    <img src={`${base}screenshots/${s.file}`} width={720} height={1565} alt={s.alt} loading="lazy" />
                    <figcaption>{s.caption}</figcaption>
                  </figure>
                </li>
              ))}
            </ul>
            <div className="grid three">
              <div>
                <h3>Check what Carta read</h3>
                <p>
                  Every field is shown to confirm or fix before anything is scheduled. The two that fail quietly, the
                  name and the case number, are flagged “Please check this” every time.
                </p>
              </div>
              <div>
                <h3>A countdown and reminders</h3>
                <p>
                  Reminders arrive 30, 14, 7, 3 and 1 days before, and on the day, at 9 am. Each names the programme,
                  what to do, and the papers the letter asked for.
                </p>
              </div>
              <div>
                <h3>Before you mail it</h3>
                <p>
                  Photograph a filled-in six-month report and Carta circles a blank yes/no box, a missing signature or
                  an early date. It never says “complete”: the county decides. Works on the project’s demonstration
                  copy of the form only.
                </p>
              </div>
              <div>
                <h3>If your benefits stop</h3>
                <p>
                  The ways back a stop notice does not print, like 30 days to turn in what was missing so CalFresh may
                  start again. Each rule is quoted from its source, marked “ask your county to confirm”.
                </p>
              </div>
              <div>
                <h3>Letters on the way</h3>
                <p>
                  A six-month report means a CalFresh renewal notice about five months later. If that month passes
                  with nothing scanned, Carta asks: did it come?
                </p>
              </div>
              <div>
                <h3>In plain words</h3>
                <p>
                  An optional 1 GB AI model, running on the phone, rewrites the letter simply. It is never asked for a
                  date, and the original is always one tap away.
                </p>
              </div>
            </div>
            <p className="caption" style={{ marginTop: 16 }}>
              Also: a phone-to-phone hand-off for helpers (encrypted, through the two cameras; not yet tried between
              two real phones), a checklist of papers, and “Delete everything”. The newest features have been checked
              in the iOS Simulator; the camera and the AI model have run on a real iPhone.
            </p>
          </div>
        </section>

        <section className="section" id="how" aria-labelledby="how-title">
          <div className="container">
            <SectionHead id="how-title" title="How it is built">
              TypeScript, React Native and Expo, with Apple Vision for text, llama.cpp running Qwen2.5 1.5B for the
              optional explanation, SQLite with AES-256-GCM for the letter text, and Jest for the tests.
            </SectionHead>
            <ol className="pipeline" aria-label="What happens to a photo, in order">
              <li>
                <span>
                  <strong>Read the photo on the phone.</strong> Apple Vision finds the words and where they sit.
                </span>
              </li>
              <li>
                <span>
                  <strong>Remove the Social Security number</strong> before anything else sees the text.
                </span>
              </li>
              <li>
                <span>
                  <strong>Fixed rules find the fields:</strong> dates, programme, form, case number, from patterns,
                  word lists and the layout of the page.
                </span>
              </li>
              <li>
                <span>
                  <strong>The family confirms</strong> every date and name. Nothing is scheduled before that.
                </span>
              </li>
              <li>
                <span>
                  <strong>Countdown and reminders,</strong> counted in calendar days so a daylight-saving change never
                  moves a deadline.
                </span>
              </li>
            </ol>
            <div className="grid two">
              <div>
                <h3>Fixed rules read the dates, not AI</h3>
                <p>
                  On 5 test photos, scored on a Mac, a small AI model (Qwen2.5 1.5B) got four dates wrong and made up
                  two. The fixed rules got none wrong and made none up. So the AI is kept away from dates.
                </p>
              </div>
              <div>
                <h3>The AI only explains</h3>
                <p>
                  The model runs on the iPhone itself and only rewrites a letter in plain words, on request. It is an
                  optional download; every screen works without it.
                </p>
              </div>
              <div>
                <h3>752 tests, on every update</h3>
                <p>
                  Carta runs 752 automated tests in 28 suites, re-run on a clean Ubuntu machine on every push to the
                  main branch. They cover reading letters, dates across daylight saving, eight ways a Social Security
                  number appears, screens and accessibility.
                </p>
              </div>
              <div>
                <h3>A test that cuts off the internet</h3>
                <p>
                  The privacy test booby-traps the network functions so any call fails, proves the traps work, replays
                  79 recorded scans (23 real photos and 56 damaged on purpose), and reads the app’s other 82 source
                  files for any network call. Only the optional model download is excluded, by name. A network call
                  planted on purpose was caught.
                </p>
              </div>
              <div>
                <h3>Measured honestly</h3>
                <p>
                  On the test letters it was built with, 96.9% of the key details it filled in were right. On two
                  letters it had never seen, it filled in 6 details, all 6 right, and left 6 blank for the family
                  rather than guess.
                </p>
              </div>
              <div>
                <h3>Never invents a rule</h3>
                <p>
                  Every second-chance date comes from a rule quoted word for word, with its source and the date it was
                  checked. If a value is not on the letter, the field stays empty.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="privacy" aria-labelledby="privacy-title">
          <div className="container">
            <SectionHead id="privacy-title" title="Privacy">
              Nothing about a letter is ever sent anywhere, in the app or on this site.
            </SectionHead>
            <div className="grid two">
              <div>
                <h3>The iPhone app</h3>
                <p>
                  No account, no server, no API key. The app makes exactly one network call: the optional AI model
                  download, which carries no letter data. Everything else works in airplane mode.
                </p>
                <p>
                  What is stored, precisely: the letter text and the name are encrypted with AES-256-GCM under a key
                  that never leaves the phone; the case number is never stored, only a salted hash and its last four
                  digits; the photo is deleted once it has been read; the dates, programme and form type are stored
                  plainly so the app can sort and show them. It is field-level encryption, not an encrypted database,
                  and all of it stays on the phone.
                </p>
              </div>
              <div>
                <h3>This website</h3>
                <p>
                  No backend, no analytics, no cookies, no fonts or scripts from anyone else. A letter you add is read
                  in your browser and saved only in this browser’s local storage, with any Social Security number and
                  the full case number removed first. That storage is not encrypted, and the page says so before you
                  save. Photos are not saved. “Delete everything” removes it all.
                </p>
                <p>
                  Every page carries a Content-Security-Policy that only allows this site’s own address. So the
                  browser itself blocks any request to anywhere else, even one made by mistake. Links to sources open
                  other websites only when you choose to follow them.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="platforms" aria-labelledby="platforms-title">
          <div className="container">
            <SectionHead id="platforms-title" title="Platforms, stated plainly" />
            <div className="grid three">
              <div>
                <h3>iPhone</h3>
                <p>
                  <span className="tag green">The main app</span>
                </p>
                <p>
                  Everything described on this page. The camera and the AI model have run on a real iPhone 16 Pro; the
                  newest features have been checked in the iOS Simulator.
                </p>
              </div>
              <div>
                <h3>Web</h3>
                <p>
                  <span className="tag green">Live on this site</span>
                </p>
                <p>
                  Runs Carta’s own letter-reading code in the browser, copied from the app by a script that stamps each
                  file with where it came from. Text is read by Tesseract instead of Apple Vision, so photos are read
                  less well. No on-device AI explanation. Reminders go to your calendar as a file, not as phone
                  notifications. No form check, hand-off or checklist. <a href={TRY_URL}>Try it</a>.
                </p>
                <p className="small muted">
                  Measured on Carta’s 23 real test photos (176 details in all): with Apple Vision reading, Carta filled
                  in 154 details, 4 of them wrong; with Tesseract, 120, 1 of them wrong. The rest were left blank for
                  the person to fill in. <a href={`${SITE_REPO_URL}/blob/main/measurements/tesseract-vs-vision.md`}>The measurement</a>.
                </p>
              </div>
              <div>
                <h3>Android</h3>
                <p>
                  <span className="tag amber">Not yet verified</span>
                </p>
                <p>
                  The same React Native code targets Android, where Google ML Kit reads the text. An Android build has
                  not been verified, and none of the accuracy figures here describe it.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="section" aria-labelledby="about-title">
          <div className="container">
            <SectionHead id="about-title" title="About">
              Built solo for the 2026 Congressional App Challenge.
            </SectionHead>
            <div className="grid two">
              <div>
                <h3>Devansh Sanghavi</h3>
                <p>
                  Carta was made by Devansh Sanghavi, in California’s 16th congressional district (Rep. Sam Liccardo),
                  for families in San Jose and Santa Clara County, so that paperwork is never the reason a family loses
                  food or health care.
                </p>
                <p>
                  <a href={REPO_URL}>The iPhone app’s code on GitHub</a>
                  <br />
                  <a href={SITE_REPO_URL}>This website’s code on GitHub</a>
                </p>
              </div>
              <div>
                <h3>How AI was used to build it</h3>
                <p>
                  Two different things, stated separately. <strong>The product</strong> uses a small language model at
                  runtime, on the phone, to rewrite letters in plain words: that is a feature. <strong>The code</strong>{' '}
                  was written with AI assistance: Claude Code was used throughout, including the letter-reading code.
                  Design decisions, priorities, scope and product judgement were the author’s; the implementation is
                  substantially AI-written. This website was built the same way.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container">
          <p className="disclaimer">Carta is not legal advice and never contacts any agency.</p>
          <p className="small">
            The sample letters on this site are fictional. The web version’s code was copied from Carta at commit{' '}
            <code>{CARTA_COMMIT.slice(0, 7)}</code>.
          </p>
          <ul>
            <li>
              <a href={TRY_URL}>Try Carta</a>
            </li>
            <li>
              <a href={REPO_URL}>iPhone app code</a>
            </li>
            <li>
              <a href={SITE_REPO_URL}>Website code</a>
            </li>
          </ul>
        </div>
      </footer>
    </>
  );
}
