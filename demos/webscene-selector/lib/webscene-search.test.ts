/**
 * Contract checks for the public WebScene search: query restriction, input
 * normalization, result cleanup, and the fallback item page link.
 */
import { describe, expect, it, vi } from "vitest";
import {
  ARCGIS_ONLINE_URL,
  WEBSCENE_SEARCH_RESULT_LIMIT,
  searchPublicWebScenes,
  webSceneSearchQuery,
  type WebSceneSearchClient,
} from "./webscene-search";

/** Injects a canned portal response and records calls through a Vitest spy. */
function clientWith(items: unknown[]): WebSceneSearchClient {
  return { queryItems: vi.fn(async () => items) as never };
}

const id = (n: number) => n.toString(16).padStart(32, "a");

describe("public WebScene search", () => {
  it("restricts matches to public WebScenes and normalizes input", () => {
    expect(webSceneSearchQuery('  Frankfurt   "mesh" ')).toBe(
      '(Frankfurt mesh) AND type:"Web Scene" AND access:public',
    );
    expect(webSceneSearchQuery('  " ')).toBeNull();
  });

  it("requests a bounded page and forwards the abort signal", async () => {
    const client = clientWith([]);
    const controller = new AbortController();
    await searchPublicWebScenes("Zurich", { client, signal: controller.signal });
    expect(client.queryItems).toHaveBeenCalledWith(
      { query: '(Zurich) AND type:"Web Scene" AND access:public', num: WEBSCENE_SEARCH_RESULT_LIMIT },
      { signal: controller.signal },
    );
  });

  it("keeps valid results and fills card defaults", async () => {
    const modified = new Date("2026-05-15T00:00:00Z");
    const results = await searchPublicWebScenes("Frankfurt", {
      client: clientWith([
        {
          id: id(1), title: " Frankfurt Airport ", owner: "esri_DE_content", modified,
          thumbnailUrl: "https://example.com/t.png", itemPageUrl: "https://www.arcgis.com/home/item.html?id=1",
        },
        { id: id(2), title: "No owner" },
        { id: "not-an-item-id", title: "Broken" },
        { id: id(3), title: "  " },
      ]),
    });
    expect(results).toEqual([
      {
        id: id(1), title: "Frankfurt Airport", owner: "esri_DE_content", modified, snippet: "",
        thumbnailUrl: "https://example.com/t.png", itemPageUrl: "https://www.arcgis.com/home/item.html?id=1",
      },
      {
        id: id(2), title: "No owner", owner: "ArcGIS Online", modified: null, snippet: "",
        thumbnailUrl: null, itemPageUrl: `${ARCGIS_ONLINE_URL}/home/item.html?id=${id(2)}`,
      },
    ]);
  });

  it("rejects empty searches without calling the portal", async () => {
    const client = clientWith([]);
    await expect(searchPublicWebScenes("   ", { client })).rejects.toThrow(/Enter words/);
    expect(client.queryItems).not.toHaveBeenCalled();
  });
});
