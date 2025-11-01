import type { AppConfigGeneral, Category, Item } from "../types/catalog.js";
import { getConfigGeneral, getCategories, getItems } from "../services/db/catalog.js";
import { getSchemaVersion } from "../services/db/meta.js";

const memory = {
  config: null as AppConfigGeneral | null,
  categories: null as Category[] | null,
};

export async function loadAppConfig(): Promise<AppConfigGeneral | null> {
  if (memory.config) {
    return memory.config;
  }
  const config = await getConfigGeneral();
  memory.config = config;
  return config;
}

export async function listCategories(): Promise<Category[]> {
  if (memory.categories) {
    return memory.categories;
  }
  const categories = await getCategories();
  memory.categories = categories;
  return categories;
}

type ListItemsResult = { items: Item[]; nextCursor?: unknown };

type ListItemsOptions = {
  categoryId?: string;
  limit?: number;
  cursor?: unknown;
};

export async function listItemsByCategory(
  categoryId: string,
  limit = 40,
  cursor?: ListItemsOptions["cursor"],
): Promise<ListItemsResult> {
  return getItems({ categoryId, limit, cursor });
}

export async function getDbSchemaVersion(): Promise<number> {
  return getSchemaVersion();
}
