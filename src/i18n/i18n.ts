/**
 * Resolves flight UI language and number-format locale, then looks up messages.
 *
 * Explicit preferences win when supported. Automatic selection checks the
 * document, browser language list, browser language, and Intl locale in that
 * order before falling back to English. Regional tags retain their region for
 * formatting while message lookup uses a supported base language.
 */
import {
  DEFAULT_FLIGHT_LOCALE,
  FLIGHT_MESSAGES,
  type FlightLocale,
  type FlightMessageKey,
  SUPPORTED_FLIGHT_LOCALES,
} from "./catalogs";

/** Replacement values for `{name}` placeholders in translated messages. */
export type FlightTranslationVariables = Readonly<Record<string, string | number>>;
/** Power-mode names used by translated controls. */
export type FlightPowerModeName = "slow" | "normal" | "turbo";
/** Camera-mode names used by translated controls. */
export type FlightCameraModeName = "chase" | "cockpit";
/** Explicit locale or `auto` to resolve from browser/document preferences. */
export type FlightLocalePreference = FlightLocale | "auto";

/** Ordered locale sources consulted when resolving automatic preferences. */
export interface FlightLocaleContext {
  documentLanguage?: string | null;
  navigatorLanguages?: readonly string[] | null;
  navigatorLanguage?: string | null;
  intlLocale?: string | null;
  fallback?: FlightLocale;
}

/** Explicit preference and optional browser-locale overrides for detection helpers. */
export interface DetectFlightLocaleOptions extends FlightLocaleContext {
  locale?: string | null;
}

/** Maps a language tag such as `fr-CH` to its supported base locale, or returns null. */
export function supportedFlightLocale(value: string | null | undefined): FlightLocale | null {
  if (!value?.trim()) return null;
  const normalized = value.trim().toLowerCase().split(/[-_]/, 1)[0];
  return SUPPORTED_FLIGHT_LOCALES.find((locale) => locale === normalized) ?? null;
}

function canonicalSupportedFormatLocale(
  value: string | null | undefined,
): string | null {
  const messageLocale = supportedFlightLocale(value);
  if (!messageLocale || !value?.trim()) return null;
  try {
    return Intl.getCanonicalLocales(value.trim().replaceAll("_", "-"))[0]
      ?? messageLocale;
  } catch {
    return messageLocale;
  }
}

/**
 * Resolves a canonical Intl locale while requiring its language to be supported.
 * @param preference Explicit supported language, or `auto` to use `context`.
 * @param context Automatic candidates are checked document, navigator languages, navigator language, then Intl locale.
 */
export function resolveFlightFormatLocale(
  preference: FlightLocalePreference | string | null | undefined = "auto",
  context: FlightLocaleContext = {},
): string {
  if (preference !== "auto") {
    const explicitLocale = canonicalSupportedFormatLocale(preference);
    if (explicitLocale) return explicitLocale;
  }
  const candidates = [
    context.documentLanguage,
    ...(context.navigatorLanguages ?? []),
    context.navigatorLanguage,
    context.intlLocale,
  ];
  for (const candidate of candidates) {
    const locale = canonicalSupportedFormatLocale(candidate);
    if (locale) return locale;
  }
  return context.fallback ?? DEFAULT_FLIGHT_LOCALE;
}

/**
 * Resolves a supported message locale from an explicit preference or locale context.
 * @param preference Explicit supported language, or `auto` to use `context`.
 * @param context Automatic candidates are checked document, navigator languages, navigator language, then Intl locale.
 */
export function resolveFlightLocale(
  preference: FlightLocalePreference | string | null | undefined = "auto",
  context: FlightLocaleContext = {},
): FlightLocale {
  if (preference !== "auto") {
    const explicitLocale = supportedFlightLocale(preference);
    if (explicitLocale) return explicitLocale;
  }
  const candidates = [
    context.documentLanguage,
    ...(context.navigatorLanguages ?? []),
    context.navigatorLanguage,
    context.intlLocale,
  ];
  for (const candidate of candidates) {
    const locale = supportedFlightLocale(candidate);
    if (locale) return locale;
  }
  return context.fallback ?? DEFAULT_FLIGHT_LOCALE;
}

function globalDocumentLanguage(): string | null {
  return typeof document === "undefined" ? null : document.documentElement.lang || null;
}

function globalNavigatorLanguages(): readonly string[] {
  return typeof navigator === "undefined" ? [] : navigator.languages;
}

function globalNavigatorLanguage(): string | null {
  return typeof navigator === "undefined" ? null : navigator.language;
}

function globalIntlLocale(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    return null;
  }
}

/** Detects message locale from overrides or document and browser language settings. */
export function detectFlightLocale(options: DetectFlightLocaleOptions = {}): FlightLocale {
  const documentLanguage = options.documentLanguage === undefined
    ? globalDocumentLanguage()
    : options.documentLanguage;
  const navigatorLanguages = options.navigatorLanguages === undefined
    ? globalNavigatorLanguages()
    : options.navigatorLanguages ?? [];
  const navigatorLanguage = options.navigatorLanguage === undefined
    ? globalNavigatorLanguage()
    : options.navigatorLanguage;
  const intlLocale = options.intlLocale === undefined
    ? globalIntlLocale()
    : options.intlLocale;

  return resolveFlightLocale(options.locale ?? "auto", {
    documentLanguage,
    navigatorLanguages,
    navigatorLanguage,
    intlLocale,
    fallback: options.fallback,
  });
}

/** Detects the Intl formatting locale using the same preference order as message lookup. */
export function detectFlightFormatLocale(
  options: DetectFlightLocaleOptions = {},
): string {
  const documentLanguage = options.documentLanguage === undefined
    ? globalDocumentLanguage()
    : options.documentLanguage;
  const navigatorLanguages = options.navigatorLanguages === undefined
    ? globalNavigatorLanguages()
    : options.navigatorLanguages ?? [];
  const navigatorLanguage = options.navigatorLanguage === undefined
    ? globalNavigatorLanguage()
    : options.navigatorLanguage;
  const intlLocale = options.intlLocale === undefined
    ? globalIntlLocale()
    : options.intlLocale;
  return resolveFlightFormatLocale(options.locale ?? "auto", {
    documentLanguage,
    navigatorLanguages,
    navigatorLanguage,
    intlLocale,
    fallback: options.fallback,
  });
}

/**
 * Looks up a translated catalog message and substitutes provided placeholders.
 * @param variables Values replace matching `{name}` markers; unmatched markers remain unchanged.
 */
export function translateFlightMessage(
  locale: FlightLocale,
  key: FlightMessageKey,
  variables: FlightTranslationVariables = {},
): string {
  return Object.entries(variables).reduce(
    (message, [name, value]) => message.replaceAll("{" + name + "}", String(value)),
    FLIGHT_MESSAGES[locale][key],
  );
}

const FLIGHT_TEXT_KEYS = {
  controlsAria: "flight.controlsAria",
  start: "flight.start",
  pause: "flight.pause",
  resume: "flight.continue",
  slow: "flight.slow",
  cruise: "flight.cruise",
  turbo: "flight.turbo",
  selectSpeed: "flight.selectSpeed",
  cockpit: "flight.cockpit",
  exterior: "flight.exterior",
  switchCockpit: "flight.switchCockpit",
  switchExterior: "flight.switchExterior",
  recover: "flight.recover",
  settings: "flight.settings",
  settingsTitle: "settings.title",
  status: "status.label",
  statusIdle: "status.idle",
  statusLoading: "status.loading",
  statusReady: "status.ready",
  statusRunning: "status.running",
  statusPaused: "status.paused",
  statusError: "status.error",
} as const satisfies Record<string, FlightMessageKey>;

/** Short stable keys for frequently used control and status messages. */
export type FlightTextKey = keyof typeof FLIGHT_TEXT_KEYS;

/** Translates one common control/status key and any placeholders. */
export function flightText(
  locale: FlightLocale,
  key: FlightTextKey,
  variables: FlightTranslationVariables = {},
): string {
  return translateFlightMessage(locale, FLIGHT_TEXT_KEYS[key], variables);
}

/** Creates a locale-bound lookup function for repeated UI rendering. */
export function createFlightTranslator(locale: FlightLocale) {
  return (key: FlightMessageKey, variables: FlightTranslationVariables = {}): string =>
    translateFlightMessage(locale, key, variables);
}

/** Returns the short visible label for a power mode. */
export function flightPowerModeLabel(locale: FlightLocale, mode: FlightPowerModeName): string {
  const keyByMode = {
    slow: "flight.slow",
    normal: "flight.cruise",
    turbo: "flight.turbo",
  } as const satisfies Record<FlightPowerModeName, FlightMessageKey>;
  return translateFlightMessage(locale, keyByMode[mode]);
}

/** Returns a power-mode accessibility label that also states whether it is selected. */
export function flightPowerModeAriaLabel(
  locale: FlightLocale,
  mode: FlightPowerModeName,
  selected: boolean,
): string {
  const keysByMode = {
    slow: ["flight.slowSpeed", "flight.slowSpeedSelected"],
    normal: ["flight.cruiseSpeed", "flight.cruiseSpeedSelected"],
    turbo: ["flight.turboSpeed", "flight.turboSpeedSelected"],
  } as const satisfies Record<FlightPowerModeName, readonly [FlightMessageKey, FlightMessageKey]>;
  return translateFlightMessage(locale, keysByMode[mode][selected ? 1 : 0]);
}

/** Returns action text for selecting a power mode. */
export function flightPowerModeActionLabel(locale: FlightLocale, mode: FlightPowerModeName): string {
  const keyByMode = {
    slow: "flight.selectSlowSpeed",
    normal: "flight.selectCruiseSpeed",
    turbo: "flight.selectTurboSpeed",
  } as const satisfies Record<FlightPowerModeName, FlightMessageKey>;
  return translateFlightMessage(locale, keyByMode[mode]);
}

/** Returns the visible name for the selected camera mode. */
export function flightCameraModeLabel(locale: FlightLocale, mode: FlightCameraModeName): string {
  return translateFlightMessage(locale, mode === "cockpit" ? "flight.cockpit" : "flight.exterior");
}

/** Returns action text for switching to the other camera mode. */
export function flightCameraModeActionLabel(locale: FlightLocale, mode: FlightCameraModeName): string {
  return translateFlightMessage(
    locale,
    mode === "cockpit" ? "flight.switchCockpit" : "flight.switchExterior",
  );
}
