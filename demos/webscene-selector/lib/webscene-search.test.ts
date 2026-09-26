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
      "title:Frankfurt AND title:mesh",
    );
    expect(webSceneSearchQuery('  " ')).toBeNull();
  });

  it("requests a bounded page and forwards the abort signal", async () => {
    const client = clientWith([]);
    const controller = new AbortController();
    await searchPublicWebScenes("Zurich", { client, signal: controller.signal });
    expect(client.queryItems).toHaveBeenCalledWith(
      {
        query: "title:Zurich", filter: 'type:"Web Scene" AND access:public',
        num: WEBSCENE_SEARCH_RESULT_LIMIT, sortField: "num-views", sortOrder: "desc",
      },
      { signal: controller.signal },
    );
  });

  it("sorts on the server by update date or portal relevance", async () => {
    const client = clientWith([{ id: id(1), title: "Zurich" }]);
    await searchPublicWebScenes("Zurich", { client, sort: "recent" });
    await searchPublicWebScenes("Zurich", { client, sort: "best-match" });
    expect(client.queryItems).toHaveBeenNthCalledWith(1,
      expect.objectContaining({ sortField: "modified", sortOrder: "desc" }), expect.anything());
    expect(client.queryItems).toHaveBeenNthCalledWith(2,
      expect.not.objectContaining({ sortField: expect.anything() }), expect.anything());
  });

  it("falls back to broad text search when no scene title matches", async () => {
    const client: WebSceneSearchClient = { queryItems: vi.fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: id(1), title: "Aerial scene" }]) };
    const results = await searchPublicWebScenes("photogrammetry", { client });
    expect(results).toHaveLength(1);
    expect(client.queryItems).toHaveBeenNthCalledWith(2,
      expect.objectContaining({ query: "photogrammetry" }), expect.anything());
  });

  it("keeps valid results and fills card defaults", async () => {
    const modified = new Date("2026-05-15T00:00:00Z");
    const results = await searchPublicWebScenes("Frankfurt", {
      client: clientWith([
        {
          id: id(1), title: " Frankfurt Airport ", owner: "esri_DE_content", modified, numViews: 1234,
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
        numViews: 1234,
        thumbnailUrl: "https://example.com/t.png", itemPageUrl: "https://www.arcgis.com/home/item.html?id=1",
      },
      {
        id: id(2), title: "No owner", owner: "ArcGIS Online", modified: null, snippet: "",
        numViews: null,
        thumbnailUrl: null, itemPageUrl: `${ARCGIS_ONLINE_URL}/home/item.html?id=${id(2)}`,
      },
    ]);
  });

  it("rejects empty searches without calling the portal", async () => {
    const client = clientWith([]);
    await expect(searchPublicWebScenes("   ", { client })).rejects.toThrow(/Enter a place or topic/);
    expect(client.queryItems).not.toHaveBeenCalled();
  });
});
