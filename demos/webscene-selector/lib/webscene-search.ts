/**
 * Searches public ArcGIS Online WebScenes for the scene explorer's WebScene
 * tab. Results carry what a Calcite card needs: title, owner, update date,
 * thumbnail and the item page on ArcGIS Online. An injectable client keeps
 * query building and result cleanup testable offline.
 */
import Portal from "@arcgis/core/portal/Portal.js";

/** ArcGIS Online, where the demo searches public WebScenes anonymously. */
export const ARCGIS_ONLINE_URL = "https://www.arcgis.com";
/** Maximum number of WebScene cards shown per search. */
export const WEBSCENE_SEARCH_RESULT_LIMIT = 10;
/** Query shown when the WebScene tab first opens. */
export const DEFAULT_WEBSCENE_QUERY = "3D city";

/** A WebScene search hit ready to render as a card. */
export interface WebSceneSearchResult {
  id: string;
  title: string;
  owner: string;
  modified: Date | null;
  snippet: string;
  thumbnailUrl: string | null;
  itemPageUrl: string;
}

/** Small injectable boundary that lets search behavior be tested without HTTP. */
export interface WebSceneSearchClient {
  queryItems(
    parameters: { query: string; num: number },
    options: { signal?: AbortSignal },
  ): Promise<Partial<WebSceneSearchResult>[]>;
}

let portal: Portal | null = null;

const DEFAULT_WEBSCENE_SEARCH_CLIENT: WebSceneSearchClient = {
  async queryItems(parameters, options) {
    portal ??= new Portal({ url: ARCGIS_ONLINE_URL });
    await portal.load({ signal: options.signal });
    const response = await portal.queryItems(parameters, options);
    return response.results.map((item) => ({
      id: item.id ?? undefined,
      title: item.title ?? undefined,
      owner: item.owner ?? undefined,
      modified: item.modified ?? null,
      snippet: item.snippet ?? undefined,
      thumbnailUrl: item.thumbnailUrl ? item.getThumbnailUrl(400) : null,
      itemPageUrl: item.itemPageUrl ?? undefined,
    }));
  },
};

/** Trims, collapses whitespace, drops quotes, and caps free-form input. */
function normalizedSearchText(value: string): string {
  return value.replace(/["\\]/g, " ").trim().replace(/\s+/g, " ").slice(0, 120);
}

/**
 * Builds the ArcGIS Online query restricting matches to public WebScenes.
 *
 * @param searchText Free-form words typed by the user.
 * @returns Portal query string, or `null` when nothing searchable remains.
 */
export function webSceneSearchQuery(searchText: string): string | null {
  const text = normalizedSearchText(searchText);
  return text ? `(${text}) AND type:"Web Scene" AND access:public` : null;
}

/**
 * Searches public WebScenes and returns cleaned, card-ready results.
 *
 * @param searchText Free-form words typed by the user.
 * @param options Abort signal and an optional client for tests.
 * @returns Up to {@link WEBSCENE_SEARCH_RESULT_LIMIT} results with an ID and title.
 * @throws When the text is empty after normalization.
 */
export async function searchPublicWebScenes(
  searchText: string,
  options: { signal?: AbortSignal; client?: WebSceneSearchClient } = {},
): Promise<WebSceneSearchResult[]> {
  const query = webSceneSearchQuery(searchText);
  if (!query) throw new Error("Enter words to search for public WebScenes.");
  const client = options.client ?? DEFAULT_WEBSCENE_SEARCH_CLIENT;
  const items = await client.queryItems(
    { query, num: WEBSCENE_SEARCH_RESULT_LIMIT },
    { signal: options.signal },
  );
  return items
    .filter((item): item is Partial<WebSceneSearchResult> & { id: string; title: string } =>
      typeof item.id === "string" && /^[a-f0-9]{32}$/i.test(item.id) && Boolean(item.title?.trim()))
    .slice(0, WEBSCENE_SEARCH_RESULT_LIMIT)
    .map((item) => ({
      id: item.id,
      title: item.title.trim(),
      owner: item.owner?.trim() || "ArcGIS Online",
      modified: item.modified instanceof Date && !Number.isNaN(item.modified.getTime()) ? item.modified : null,
      snippet: item.snippet?.trim() ?? "",
      thumbnailUrl: item.thumbnailUrl ?? null,
      itemPageUrl: item.itemPageUrl ?? `${ARCGIS_ONLINE_URL}/home/item.html?id=${item.id}`,
    }));
}
