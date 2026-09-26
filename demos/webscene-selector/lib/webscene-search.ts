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
export type WebSceneSearchSort = "most-viewed" | "recent" | "best-match";
export const DEFAULT_WEBSCENE_SORT: WebSceneSearchSort = "most-viewed";

/** A WebScene search hit ready to render as a card. */
export interface WebSceneSearchResult {
  id: string;
  title: string;
  owner: string;
  modified: Date | null;
  numViews: number | null;
  snippet: string;
  thumbnailUrl: string | null;
  itemPageUrl: string;
}

/** Small injectable boundary that lets search behavior be tested without HTTP. */
export interface WebSceneSearchClient {
  queryItems(
    parameters: {
      query: string;
      filter: string;
      num: number;
      sortField?: "num-views" | "modified";
      sortOrder?: "desc";
    },
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
      numViews: item.numViews ?? null,
      snippet: item.snippet ?? undefined,
      thumbnailUrl: item.thumbnailUrl ? item.getThumbnailUrl(400) : null,
      itemPageUrl: item.itemPageUrl ?? undefined,
    }));
  },
};

/** Keeps searchable words while dropping ArcGIS query operators and punctuation. */
function normalizedSearchText(value: string): string {
  return (value.slice(0, 120).match(/[\p{L}\p{N}]+/gu) ?? []).join(" ");
}

/**
 * Searches titles first so common words do not surface unrelated high-view items.
 *
 * @param searchText Free-form words typed by the user.
 * @returns Portal query string, or `null` when nothing searchable remains.
 */
export function webSceneSearchQuery(searchText: string): string | null {
  const text = normalizedSearchText(searchText);
  return text ? text.split(" ").map((word) => `title:${word}`).join(" AND ") : null;
}

const PUBLIC_WEBSCENE_FILTER = 'type:"Web Scene" AND access:public';

function searchParameters(query: string, sort: WebSceneSearchSort): Parameters<WebSceneSearchClient["queryItems"]>[0] {
  const ordering = sort === "most-viewed"
    ? { sortField: "num-views" as const, sortOrder: "desc" as const }
    : sort === "recent"
      ? { sortField: "modified" as const, sortOrder: "desc" as const }
      : {};
  return { query, filter: PUBLIC_WEBSCENE_FILTER, num: WEBSCENE_SEARCH_RESULT_LIMIT, ...ordering };
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
  options: { signal?: AbortSignal; client?: WebSceneSearchClient; sort?: WebSceneSearchSort } = {},
): Promise<WebSceneSearchResult[]> {
  const query = webSceneSearchQuery(searchText);
  if (!query) throw new Error("Enter words to search for public WebScenes.");
  const client = options.client ?? DEFAULT_WEBSCENE_SEARCH_CLIENT;
  const sort = options.sort ?? DEFAULT_WEBSCENE_SORT;
  let items = await client.queryItems(searchParameters(query, sort), { signal: options.signal });
  if (!items.length) {
    items = await client.queryItems(
      searchParameters(normalizedSearchText(searchText), sort),
      { signal: options.signal },
    );
  }
  return items
    .filter((item): item is Partial<WebSceneSearchResult> & { id: string; title: string } =>
      typeof item.id === "string" && /^[a-f0-9]{32}$/i.test(item.id) && Boolean(item.title?.trim()))
    .slice(0, WEBSCENE_SEARCH_RESULT_LIMIT)
    .map((item) => ({
      id: item.id,
      title: item.title.trim(),
      owner: item.owner?.trim() || "ArcGIS Online",
      modified: item.modified instanceof Date && !Number.isNaN(item.modified.getTime()) ? item.modified : null,
      numViews: typeof item.numViews === "number" && Number.isFinite(item.numViews) ? item.numViews : null,
      snippet: item.snippet?.trim() ?? "",
      thumbnailUrl: item.thumbnailUrl ?? null,
      itemPageUrl: item.itemPageUrl ?? `${ARCGIS_ONLINE_URL}/home/item.html?id=${item.id}`,
    }));
}
