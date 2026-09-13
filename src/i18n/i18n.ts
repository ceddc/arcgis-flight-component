import {
  DEFAULT_FLIGHT_LOCALE,
  FLIGHT_MESSAGES,
  type FlightLocale,
  type FlightMessageKey,
  SUPPORTED_FLIGHT_LOCALES,
} from "./catalogs";

export type FlightTranslationVariables = Readonly<Record<string, string | number>>;
export type FlightPowerModeName = "slow" | "normal" | "turbo";
export type FlightCameraModeName = "chase" | "cockpit";
export type FlightLocalePreference = FlightLocale | "auto";

export interface FlightLocaleContext {
  documentLanguage?: string | null;
  navigatorLanguages?: readonly string[] | null;
  navigatorLanguage?: string | null;
  intlLocale?: string | null;
  fallback?: FlightLocale;
}

export interface DetectFlightLocaleOptions extends FlightLocaleContext {
  locale?: string | null;
}

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

export type FlightTextKey = keyof typeof FLIGHT_TEXT_KEYS;

export function flightText(
  locale: FlightLocale,
  key: FlightTextKey,
  variables: FlightTranslationVariables = {},
): string {
  return translateFlightMessage(locale, FLIGHT_TEXT_KEYS[key], variables);
}

export function createFlightTranslator(locale: FlightLocale) {
  return (key: FlightMessageKey, variables: FlightTranslationVariables = {}): string =>
    translateFlightMessage(locale, key, variables);
}

export function flightPowerModeLabel(locale: FlightLocale, mode: FlightPowerModeName): string {
  const keyByMode = {
    slow: "flight.slow",
    normal: "flight.cruise",
    turbo: "flight.turbo",
  } as const satisfies Record<FlightPowerModeName, FlightMessageKey>;
  return translateFlightMessage(locale, keyByMode[mode]);
}

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

export function flightPowerModeActionLabel(locale: FlightLocale, mode: FlightPowerModeName): string {
  const keyByMode = {
    slow: "flight.selectSlowSpeed",
    normal: "flight.selectCruiseSpeed",
    turbo: "flight.selectTurboSpeed",
  } as const satisfies Record<FlightPowerModeName, FlightMessageKey>;
  return translateFlightMessage(locale, keyByMode[mode]);
}

export function flightCameraModeLabel(locale: FlightLocale, mode: FlightCameraModeName): string {
  return translateFlightMessage(locale, mode === "cockpit" ? "flight.cockpit" : "flight.exterior");
}

export function flightCameraModeActionLabel(locale: FlightLocale, mode: FlightCameraModeName): string {
  return translateFlightMessage(
    locale,
    mode === "cockpit" ? "flight.switchCockpit" : "flight.switchExterior",
  );
}
