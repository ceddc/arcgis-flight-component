import { describe, expect, it, vi } from "vitest";
import {
  ADDRESS_SEARCH_RESULT_LIMIT,
  searchAddresses,
  WORLD_GEOCODE_SERVICE_URL,
  type AddressSearchClient,
} from "./address-search";

function clientWith(candidates: unknown[]): AddressSearchClient {
  return {
    addressToLocations: vi.fn(async () => candidates) as never,
  };
}

describe("address search", () => {
  it("requests non-stored WGS84 matches from the World Geocoder", async () => {
    const client = clientWith([
      {
        address: "Bern",
        attributes: {
          LongLabel: "Bern, Bern, Switzerland",
          City: "Bern",
          Country: "CHE",
        },
        location: { longitude: 7.4474, latitude: 46.948 },
        score: 99,
      },
      {
        address: "Bern",
        attributes: {
          LongLabel: "Bern, Bern, Switzerland",
          City: "Bern",
          Country: "CHE",
        },
        location: { longitude: 7.4475, latitude: 46.9481 },
        score: 98,
      },
    ]);

    const results = await searchAddresses("  Bern   Switzerland  ", { client });

    expect(client.addressToLocations).toHaveBeenCalledWith(
      WORLD_GEOCODE_SERVICE_URL,
      {
        address: { SingleLine: "Bern Switzerland" },
        forStorage: false,
        maxLocations: ADDRESS_SEARCH_RESULT_LIMIT,
        outFields: ["LongLabel", "City", "Region", "Country", "Type"],
        outSpatialReference: { wkid: 4326 },
      },
      { signal: undefined },
    );
    expect(results).toEqual([{
      label: "Bern, Bern, Switzerland",
      description: "Bern, CHE",
      longitude: 7.4474,
      latitude: 46.948,
      score: 99,
    }]);
  });

  it("rejects an empty query and ignores candidates without valid coordinates", async () => {
    const client = clientWith([
      { address: "Missing location", location: null },
      { address: "Invalid location", location: { longitude: 250, latitude: 20 } },
    ]);

    await expect(searchAddresses("   ", { client })).rejects.toThrow(
      "An address or place is required.",
    );
    expect(client.addressToLocations).not.toHaveBeenCalled();
    await expect(searchAddresses("Somewhere", { client })).resolves.toEqual([]);
  });
});
