import { describe, expect, it } from "vitest";
import {
  createFlightTranslator,
  DEFAULT_FLIGHT_LOCALE,
  detectFlightFormatLocale,
  detectFlightLocale,
  FLIGHT_LANGUAGE_NAMES,
  FLIGHT_MESSAGES,
  flightCameraModeActionLabel,
  flightText,
  flightPowerModeAriaLabel,
  flightPowerModeLabel,
  resolveFlightFormatLocale,
  resolveFlightLocale,
  SUPPORTED_FLIGHT_LOCALES,
  supportedFlightLocale,
  translateFlightMessage,
} from "./index";

describe("flight UI localization", () => {
  it("supports English, German, French, Italian, and Spanish", () => {
    expect(SUPPORTED_FLIGHT_LOCALES).toEqual(["en", "de", "fr", "it", "es"]);
    expect(DEFAULT_FLIGHT_LOCALE).toBe("en");
    expect(FLIGHT_LANGUAGE_NAMES).toEqual({
      en: "English",
      de: "Deutsch",
      fr: "Français",
      it: "Italiano",
      es: "Español",
    });
    expect(Object.keys(FLIGHT_MESSAGES)).toEqual(SUPPORTED_FLIGHT_LOCALES);
  });

  it("normalizes ArcGIS-style regional language tags", () => {
    expect(supportedFlightLocale("de-CH")).toBe("de");
    expect(supportedFlightLocale("fr_CH")).toBe("fr");
    expect(supportedFlightLocale("ES-mx")).toBe("es");
    expect(supportedFlightLocale("rm-CH")).toBeNull();
  });

  it("resolves the first supported candidate and honors an explicit fallback", () => {
    expect(resolveFlightLocale("auto", {
      documentLanguage: "rm-CH",
      navigatorLanguages: ["it-IT", "en-US"],
    })).toBe("it");
    expect(resolveFlightLocale("auto", {
      documentLanguage: null,
      navigatorLanguages: ["pt-BR"],
      fallback: "fr",
    })).toBe("fr");
    expect(resolveFlightLocale("de", { documentLanguage: "fr-CH" })).toBe("de");
  });

  it("detects explicit, document and browser languages in priority order", () => {
    expect(detectFlightLocale({
      locale: "es-ES",
      documentLanguage: "fr-CH",
      navigatorLanguages: ["de-CH"],
      navigatorLanguage: "it-IT",
      intlLocale: "en-US",
    })).toBe("es");
    expect(detectFlightLocale({
      locale: "pt-BR",
      documentLanguage: "fr-CH",
      navigatorLanguages: ["de-CH"],
      navigatorLanguage: "it-IT",
      intlLocale: "en-US",
    })).toBe("fr");
    expect(detectFlightLocale({
      documentLanguage: null,
      navigatorLanguages: ["rm-CH", "es-MX"],
      navigatorLanguage: "de-CH",
      intlLocale: "en-US",
    })).toBe("es");
  });

  it("keeps regional tags for numeric formatting", () => {
    expect(resolveFlightFormatLocale("auto", { documentLanguage: "de-CH" })).toBe("de-CH");
    expect(resolveFlightFormatLocale("fr_CH")).toBe("fr-CH");
    expect(detectFlightFormatLocale({ locale: "es-MX", documentLanguage: "de-CH" })).toBe("es-MX");
  });

  it("uses the documented flight terminology", () => {
    expect(flightPowerModeLabel("de", "normal")).toBe("Reiseflug");
    expect(flightPowerModeLabel("fr", "slow")).toBe("Réduite");
    expect(flightPowerModeLabel("it", "normal")).toBe("Crociera");
    expect(flightCameraModeActionLabel("de", "chase")).toBe("Zur Aussenansicht wechseln");
    expect(translateFlightMessage("fr", "flight.continue")).toBe("Reprendre le vol");
  });

  it("provides complete Spanish controls and accessible speed labels", () => {
    expect(flightPowerModeLabel("es", "slow")).toBe("Reducida");
    expect(flightPowerModeLabel("es", "normal")).toBe("Crucero");
    expect(flightPowerModeLabel("es", "turbo")).toBe("Turbo");
    expect(flightPowerModeAriaLabel("es", "normal", true)).toBe(
      "Velocidad de crucero, seleccionada",
    );
    expect(flightCameraModeActionLabel("es", "cockpit")).toBe("Cambiar a vista de cabina");
    expect(translateFlightMessage("es", "flight.continue")).toBe("Reanudar el vuelo");
    expect(flightText("es", "controlsAria")).toBe("Controles de vuelo y de la escena");
    expect(flightText("es", "start")).toBe("Iniciar el vuelo");
    expect(flightText("es", "resume")).toBe("Reanudar el vuelo");
    expect(flightText("es", "selectSpeed", { mode: "turbo" })).toBe(
      "Seleccionar velocidad turbo",
    );
  });

  it("interpolates variables without keeping shared locale state", () => {
    expect(translateFlightMessage("fr", "language.current", { language: "Français" })).toBe(
      "Langue : Français. Choisir une autre langue",
    );
    const translateSpanish = createFlightTranslator("es");
    expect(translateSpanish("flight.selectSpeed", { mode: "turbo" })).toBe(
      "Seleccionar velocidad turbo",
    );
  });
});
