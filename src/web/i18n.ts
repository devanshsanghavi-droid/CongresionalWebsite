/**
 * Words for the web version, in English and Spanish.
 *
 * Two sources, looked up in this order:
 *
 *   1. `WEB` below: strings only the web version needs (a file picker instead
 *      of a camera screen, a calendar file instead of notifications, the
 *      "show as if today were" control for samples). The English is new.
 *      THE SPANISH IN `WEB.es` IS CARTA'S OWN TRANSLATION, written for this
 *      site, not an official agency translation, and it has not yet had the
 *      fluent-speaker review the app's Spanish had (src/lib/i18n/SOURCES.md in
 *      the app). Plain words, short sentences, the same register as the app.
 *   2. The iPhone app's own string files, vendored unchanged from Carta
 *      (src/carta/lib/i18n/locales/{en,es}.json). Wherever the web version says
 *      the same thing the app says, it uses the app's wording, so the Spanish
 *      a family reads here is the Spanish the app was reviewed with.
 *
 * Plurals follow the app's i18next convention: `key_one` / `key_other`, chosen
 * by `count`. Interpolation is `{{name}}`.
 */

import enApp from '../carta/lib/i18n/locales/en.json';
import esApp from '../carta/lib/i18n/locales/es.json';

export type Lang = 'en' | 'es';

type Dict = { readonly [key: string]: string };

const WEB_EN: Dict = {
  'web.title': 'Try Carta',
  'web.skip': 'Skip to the main content',
  'web.aboutLink': 'About Carta',
  'web.languageSwitch': 'Language',
  'web.banner.title': 'This is the web version of Carta',
  'web.banner.body':
    'It runs the same code the iPhone app uses to read a letter, here in your browser. Photos are read by Tesseract instead of Apple Vision, so it reads photos less well than the app. It has no plain-language AI explanation, and reminders go to your calendar instead of your phone.',
  'web.banner.private': 'Nothing you add leaves this browser. There is no server, no account and no tracking.',

  'web.home.add': 'Add a letter',
  'web.home.storedHere': 'Saved only in this browser, on this device.',
  'web.home.emptyBody':
    'Add a photo of a letter about your benefits, or try a sample letter. Carta reads the date off it and counts down to it.',
  'web.home.open': 'Open',

  'web.add.title': 'Add a letter',
  'web.add.samplesTitle': 'Try a sample letter',
  'web.add.samplesBody':
    'These are made-up letters that were printed and photographed to test Carta. The names and case numbers are invented.',
  'web.add.samplesOcr':
    'A sample uses the words Apple Vision read from the photo on a Mac when Carta’s test set was made, the same kind of reader the iPhone app uses. You can also read it with this browser’s reader to compare.',
  'web.add.useSample': 'Use this sample',
  'web.add.readHere': 'Read it in this browser instead',
  'web.add.ownTitle': 'Your own letter',
  'web.add.ownBody':
    'Take a photo or choose one. It is read here, in this browser. The photo is never uploaded and is not saved.',
  'web.add.takePhoto': 'Take a photo',
  'web.add.choosePhoto': 'Choose a photo',
  'web.add.letterLanguage': 'Language of the letter',
  'web.add.lang.eng': 'English',
  'web.add.lang.spa': 'Spanish',
  'web.add.lang.both': 'Both',
  'web.add.firstTime':
    'The first time, the reader downloads about {{mb}} MB from this website. Nothing goes to anyone else.',
  'web.sample.sar7': 'Six-month report (SAR 7), CalFresh',
  'web.sample.na960x': 'Benefits stopping (NA 960X), CalFresh',
  'web.sample.cf3776': 'Papers needed (CF 377.6), CalFresh',
  'web.sample.mc210': 'Renewal (MC 210 RV), Medi-Cal',
  'web.sample.photoAlt': 'Photo of a sample letter: {{name}}',

  'web.ocr.status': 'Getting ready to read ({{percent}}%)',
  'web.ocr.recognizing': 'Reading the letter ({{percent}}%)',
  'web.ocr.failedBody': 'Something went wrong while reading the photo in this browser. Try again, or try a sample letter.',
  'web.ocr.unsupported':
    'This browser cannot run the reader. Try an up-to-date Safari, Chrome, Edge or Firefox, or try a sample letter.',
  'web.ocr.pickAnother': 'Choose another photo',

  'web.review.engine.apple-vision-recorded': 'Read by Apple Vision when this sample was made.',
  'web.review.engine.tesseract': 'Read by Tesseract, in this browser.',
  'web.review.ssnRemoved': 'Carta found a Social Security number and removed it. It will not be saved.',
  'web.review.notFound': 'Not found. Add it if the letter shows it.',
  'web.review.chooseAction': 'Choose one',
  'web.review.actionRequired': 'Choose what this letter does, then save.',
  'web.review.save': 'Save this letter',
  'web.review.photo': 'Your photo',
  'web.review.showPhoto': 'Show the photo',
  'web.review.highlight': 'The box on the photo shows where Carta read the field you are on.',
  'web.review.photoNotSaved': 'The photo is shown only while you check. It is not saved.',
  'web.review.saveFailed': 'Carta could not save this letter in this browser. Nothing was lost. Try again.',
  'web.review.storeNote':
    'Save keeps this letter only in this browser, without any Social Security number and without the full case number. Browser storage is not encrypted: anyone who uses this browser could see it. “Delete everything” removes it.',
  'web.review.nothingBody': 'Add a letter first. Then Carta shows here what it read.',

  'web.sample.badge': 'Sample letter',
  'web.sample.asIf': 'Shown as if today were {{date}}.',
  'web.sample.asIfLabel': 'Show as if today were',
  'web.sample.useReal': 'Use today’s real date',
  'web.sample.useAsIf': 'Show it as if it just arrived',
  'web.sample.realToday': 'Today is really {{date}}.',
  'web.sample.why':
    'Sample letters are dated September 2026. Pick a day to see the countdown the way a family would have seen it. Letters you add yourself always use the real date.',

  'web.reminders.title': 'Reminders',
  'web.reminders.body':
    'Each at {{time}} on the day shown. The iPhone app sends them as notifications; here, you can add them to your calendar.',
  'web.reminders.tier.t30': '30 days before',
  'web.reminders.tier.t14': '14 days before',
  'web.reminders.tier.t7': '7 days before',
  'web.reminders.tier.t3': '3 days before',
  'web.reminders.tier.t1': '1 day before',
  'web.reminders.tier.day_of': 'On the day',
  'web.reminders.tier.appeal_urgent': 'Ask for a hearing soon',
  'web.reminders.none': 'There are no reminders left: every reminder date has passed.',
  'web.reminders.noDate': 'This letter has no date to remind you about.',
  'web.reminders.add': 'Add reminders to my calendar',
  'web.reminders.addHint':
    'Downloads a calendar file (.ics) with one event per reminder. Open it to add them to your calendar.',
  'web.reminders.sampleNote': 'These are worked out from the “as if” date above.',
  'web.reminders.calendarName': 'Carta reminders',

  'web.detail.papers': 'Papers the letter asks for',
  'web.detail.noDeadlineFound': 'Carta did not find a date to act by on this letter.',
  'web.detail.removeBody': 'Carta will delete this letter from this browser. You cannot undo this.',
  'web.detail.removeFailed': 'Carta could not remove this letter. Try again.',
  'web.detail.notFound': 'This letter is not saved in this browser.',
  'web.detail.source': 'Read the source',
  'web.detail.opensElsewhere': '(opens another website)',
  'web.detail.answered.came': 'You said it came.',
  'web.detail.answered.never_came': 'You said it never came.',
  'web.detail.answered.online': 'You said you get your letters online.',
  'web.detail.askAgainOn': 'Carta will ask again on {{date}}.',
  'web.detail.changeAnswer': 'Change my answer',
  'web.detail.textIsRedacted': 'Any Social Security number was removed before this was saved.',

  'web.doc.proof_of_residency': 'Proof of where you live',

  'web.settings.reminderTime': 'Reminder time',
  'web.settings.reminderTimeHint': 'Used for the calendar file.',
  'web.wipe.what': 'Removes every letter and setting Carta saved in this browser. This cannot be undone.',
  'web.wipe.done': 'Everything Carta saved in this browser is deleted.',
  'web.wipe.failed': 'Carta could not delete everything. Clear this site’s data in your browser settings.',
};

/** CARTA'S OWN TRANSLATION (web version). Not an official agency translation. */
const WEB_ES: Dict = {
  'web.title': 'Pruebe Carta',
  'web.skip': 'Ir al contenido principal',
  'web.aboutLink': 'Acerca de Carta',
  'web.languageSwitch': 'Idioma',
  'web.banner.title': 'Esta es la versión web de Carta',
  'web.banner.body':
    'Usa el mismo código que la app de iPhone usa para leer una carta, aquí en su navegador. Las fotos las lee Tesseract en vez de Apple Vision, así que lee las fotos peor que la app. No tiene la explicación con IA en palabras sencillas, y los recordatorios van a su calendario en vez de a su teléfono.',
  'web.banner.private': 'Nada de lo que agregue sale de este navegador. No hay servidor, ni cuenta, ni rastreo.',

  'web.home.add': 'Agregar una carta',
  'web.home.storedHere': 'Guardado solo en este navegador, en este aparato.',
  'web.home.emptyBody':
    'Agregue una foto de una carta sobre sus beneficios, o pruebe una carta de muestra. Carta lee la fecha y cuenta los días que faltan.',
  'web.home.open': 'Abrir',

  'web.add.title': 'Agregar una carta',
  'web.add.samplesTitle': 'Pruebe una carta de muestra',
  'web.add.samplesBody':
    'Son cartas inventadas que se imprimieron y fotografiaron para probar Carta. Los nombres y números de caso son inventados.',
  'web.add.samplesOcr':
    'Una muestra usa las palabras que Apple Vision leyó de la foto en una Mac cuando se hizo el conjunto de prueba de Carta, el mismo tipo de lector que usa la app de iPhone. También puede leerla con el lector de este navegador para comparar.',
  'web.add.useSample': 'Usar esta muestra',
  'web.add.readHere': 'Leerla en este navegador',
  'web.add.ownTitle': 'Su propia carta',
  'web.add.ownBody':
    'Tome una foto o elija una. Se lee aquí, en este navegador. La foto nunca se sube y no se guarda.',
  'web.add.takePhoto': 'Tomar una foto',
  'web.add.choosePhoto': 'Elegir una foto',
  'web.add.letterLanguage': 'Idioma de la carta',
  'web.add.lang.eng': 'Inglés',
  'web.add.lang.spa': 'Español',
  'web.add.lang.both': 'Los dos',
  'web.add.firstTime':
    'La primera vez, el lector descarga unos {{mb}} MB de este sitio web. No se envía nada a nadie más.',
  'web.sample.sar7': 'Reporte de seis meses (SAR 7), CalFresh',
  'web.sample.na960x': 'Sus beneficios van a parar (NA 960X), CalFresh',
  'web.sample.cf3776': 'Necesitan papeles (CF 377.6), CalFresh',
  'web.sample.mc210': 'Renovación (MC 210 RV), Medi-Cal',
  'web.sample.photoAlt': 'Foto de una carta de muestra: {{name}}',

  'web.ocr.status': 'Preparándose para leer ({{percent}}%)',
  'web.ocr.recognizing': 'Leyendo la carta ({{percent}}%)',
  'web.ocr.failedBody':
    'Algo salió mal al leer la foto en este navegador. Intente otra vez, o pruebe una carta de muestra.',
  'web.ocr.unsupported':
    'Este navegador no puede usar el lector. Pruebe con Safari, Chrome, Edge o Firefox actualizados, o pruebe una carta de muestra.',
  'web.ocr.pickAnother': 'Elegir otra foto',

  'web.review.engine.apple-vision-recorded': 'La leyó Apple Vision cuando se hizo esta muestra.',
  'web.review.engine.tesseract': 'La leyó Tesseract, en este navegador.',
  'web.review.ssnRemoved': 'Carta encontró un número de Seguro Social y lo quitó. No se va a guardar.',
  'web.review.notFound': 'No se encontró. Agréguelo si la carta lo muestra.',
  'web.review.chooseAction': 'Elija una opción',
  'web.review.actionRequired': 'Elija qué hace esta carta y luego guarde.',
  'web.review.save': 'Guardar esta carta',
  'web.review.photo': 'Su foto',
  'web.review.showPhoto': 'Mostrar la foto',
  'web.review.highlight': 'El recuadro en la foto muestra dónde leyó Carta el dato en el que está.',
  'web.review.photoNotSaved': 'La foto se muestra solo mientras revisa. No se guarda.',
  'web.review.saveFailed': 'Carta no pudo guardar esta carta en este navegador. No se perdió nada. Intente otra vez.',
  'web.review.storeNote':
    'Al guardar, la carta se queda solo en este navegador, sin ningún número de Seguro Social y sin el número de caso completo. Lo que guarda el navegador no está cifrado: cualquier persona que use este navegador podría verlo. “Borrar todo” lo quita.',
  'web.review.nothingBody': 'Primero agregue una carta. Luego Carta le muestra aquí lo que leyó.',

  'web.sample.badge': 'Carta de muestra',
  'web.sample.asIf': 'Se muestra como si hoy fuera el {{date}}.',
  'web.sample.asIfLabel': 'Mostrar como si hoy fuera',
  'web.sample.useReal': 'Usar la fecha real de hoy',
  'web.sample.useAsIf': 'Mostrarla como si acabara de llegar',
  'web.sample.realToday': 'Hoy en realidad es el {{date}}.',
  'web.sample.why':
    'Las cartas de muestra tienen fechas de septiembre de 2026. Elija un día para ver la cuenta regresiva como la habría visto una familia. Las cartas que usted agregue siempre usan la fecha real.',

  'web.reminders.title': 'Recordatorios',
  'web.reminders.body':
    'Cada uno a las {{time}} del día que se muestra. La app de iPhone los envía como notificaciones; aquí puede agregarlos a su calendario.',
  'web.reminders.tier.t30': '30 días antes',
  'web.reminders.tier.t14': '14 días antes',
  'web.reminders.tier.t7': '7 días antes',
  'web.reminders.tier.t3': '3 días antes',
  'web.reminders.tier.t1': '1 día antes',
  'web.reminders.tier.day_of': 'El mismo día',
  'web.reminders.tier.appeal_urgent': 'Pida una audiencia pronto',
  'web.reminders.none': 'Ya no quedan recordatorios: todas las fechas ya pasaron.',
  'web.reminders.noDate': 'Esta carta no tiene una fecha para recordarle.',
  'web.reminders.add': 'Agregar recordatorios a mi calendario',
  'web.reminders.addHint':
    'Descarga un archivo de calendario (.ics) con un evento por recordatorio. Ábralo para agregarlos a su calendario.',
  'web.reminders.sampleNote': 'Se calculan con la fecha “como si” de arriba.',
  'web.reminders.calendarName': 'Recordatorios de Carta',

  'web.detail.papers': 'Papeles que pide la carta',
  'web.detail.noDeadlineFound': 'Carta no encontró en esta carta una fecha para actuar.',
  'web.detail.removeBody': 'Carta va a borrar esta carta de este navegador. No se puede deshacer.',
  'web.detail.removeFailed': 'Carta no pudo quitar esta carta. Intente otra vez.',
  'web.detail.notFound': 'Esta carta no está guardada en este navegador.',
  'web.detail.source': 'Leer la fuente',
  'web.detail.opensElsewhere': '(abre otro sitio web)',
  'web.detail.answered.came': 'Usted dijo que ya llegó.',
  'web.detail.answered.never_came': 'Usted dijo que nunca llegó.',
  'web.detail.answered.online': 'Usted dijo que recibe sus cartas por internet.',
  'web.detail.askAgainOn': 'Carta le preguntará otra vez el {{date}}.',
  'web.detail.changeAnswer': 'Cambiar mi respuesta',
  'web.detail.textIsRedacted': 'Cualquier número de Seguro Social se quitó antes de guardar esto.',

  'web.doc.proof_of_residency': 'Prueba de dónde vive',

  'web.settings.reminderTime': 'Hora de los recordatorios',
  'web.settings.reminderTimeHint': 'Se usa para el archivo de calendario.',
  'web.wipe.what': 'Quita todas las cartas y ajustes que Carta guardó en este navegador. No se puede deshacer.',
  'web.wipe.done': 'Todo lo que Carta guardó en este navegador se borró.',
  'web.wipe.failed':
    'Carta no pudo borrar todo. Borre los datos de este sitio en los ajustes de su navegador.',
};

const WEB: Record<Lang, Dict> = { en: WEB_EN, es: WEB_ES };
const APP: Record<Lang, unknown> = { en: enApp, es: esApp };

function fromApp(lang: Lang, key: string): string | undefined {
  let node: unknown = APP[lang];
  for (const part of key.split('.')) {
    if (node === null || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : undefined;
}

export function lookup(lang: Lang, key: string): string | undefined {
  return WEB[lang][key] ?? fromApp(lang, key);
}

export type Params = Readonly<Record<string, string | number>>;

/** Translate. A missing key renders the key itself, and tests/i18n.test.ts fails on it. */
export function translate(lang: Lang, key: string, params?: Params): string {
  let template: string | undefined;
  const count = params?.['count'];
  if (typeof count === 'number') {
    template = lookup(lang, `${key}_${count === 1 ? 'one' : 'other'}`);
  }
  template ??= lookup(lang, key) ?? key;
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, name: string) => String(params?.[name] ?? ''));
}

export function initialLanguage(stored: Lang | undefined, browserLanguages: readonly string[]): Lang {
  if (stored !== undefined) return stored;
  return browserLanguages[0]?.toLowerCase().startsWith('es') === true ? 'es' : 'en';
}

export const WEB_KEYS = Object.keys(WEB_EN);
export const WEB_KEYS_ES = Object.keys(WEB_ES);
