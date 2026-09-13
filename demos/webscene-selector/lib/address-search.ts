import { addressToLocations as arcgisAddressToLocations } from "@arcgis/core/rest/locator.js";

export const WORLD_GEOCODE_SERVICE_URL =
  "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer";
export const ADDRESS_SEARCH_RESULT_LIMIT = 8;

export interface AddressSearchCandidate {
  address?: string | null;
  attributes?: Record<string, unknown> | null;
  location?: {
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  score?: number | null;
}

export interface AddressSearchClient {
  addressToLocations(
    url: string,
    parameters: {
      address: { SingleLine: string };
      forStorage: false;
      maxLocations: number;
      outFields: string[];
      outSpatialReference: { wkid: 4326 };
    },
    options: { signal?: AbortSignal },
  ): Promise<AddressSearchCandidate[]>;
}

export interface AddressSearchResult {
  label: string;
  description: string;
  longitude: number;
  latitude: number;
  score: number;
}

const DEFAULT_ADDRESS_SEARCH_CLIENT: AddressSearchClient = {
  async addressToLocations(url, parameters, options) {
    const candidates = await arcgisAddressToLocations(url, parameters, options);
    return candidates.map((candidate) => ({
      address: candidate.address,
      attributes: candidate.attributes as Record<string, unknown> | null | undefined,
      location: candidate.location
        ? {
            latitude: candidate.location.latitude,
            longitude: candidate.location.longitude,
          }
        : null,
      score: candidate.score,
    }));
  },
};

function normalizedSearchText(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, 120);
}

function attributeText(
  attributes: Record<string, unknown> | null | undefined,
  key: string,
): string | null {
  const value = attributes?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function resultDescription(candidate: AddressSearchCandidate): string {
  const attributes = candidate.attributes;
  const parts = ["City", "Region", "Country"]
    .map((key) => attributeText(attributes, key))
    .filter((value, index, values): value is string => (
      value !== null && values.indexOf(value) === index
    ));
  if (parts.length > 0) return parts.join(", ");
  return attributeText(attributes, "Type") ?? "Address match";
}

export async function searchAddresses(
  searchText: string,
  options: {
    client?: AddressSearchClient;
    signal?: AbortSignal;
  } = {},
): Promise<AddressSearchResult[]> {
  const query = normalizedSearchText(searchText);
  if (!query) throw new Error("An address or place is required.");

  const client = options.client ?? DEFAULT_ADDRESS_SEARCH_CLIENT;
  const candidates = await client.addressToLocations(
    WORLD_GEOCODE_SERVICE_URL,
    {
      address: { SingleLine: query },
      forStorage: false,
      maxLocations: ADDRESS_SEARCH_RESULT_LIMIT,
      outFields: ["LongLabel", "City", "Region", "Country", "Type"],
      outSpatialReference: { wkid: 4326 },
    },
    { signal: options.signal },
  );

  const results: AddressSearchResult[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    const longitude = candidate.location?.longitude;
    const latitude = candidate.location?.latitude;
    if (
      !Number.isFinite(longitude)
      || !Number.isFinite(latitude)
      || Number(longitude) < -180
      || Number(longitude) > 180
      || Number(latitude) < -90
      || Number(latitude) > 90
    ) continue;
    const label = attributeText(candidate.attributes, "LongLabel")
      ?? candidate.address?.trim()
      ?? "Unnamed place";
    const description = resultDescription(candidate);
    const key = label.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({
      label,
      description,
      longitude: Number(longitude),
      latitude: Number(latitude),
      score: Number.isFinite(candidate.score) ? Number(candidate.score) : 0,
    });
  }
  return results.slice(0, ADDRESS_SEARCH_RESULT_LIMIT);
}
