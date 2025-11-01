import type { AppConfigGeneral, Category } from "@/types/catalog";
import { getConfigGeneral, getCategories, getItems } from "@/services/db/catalog";
import { getSchemaVersion } from "@/services/db/meta";

const mem: {
  cfg: AppConfigGeneral | null;
  categories: Category[] | null;
} = {
  cfg: null,
  categories: null,
};

export async function loadAppConfig(): Promise<AppConfigGeneral | null> {
  if (mem.cfg) {
    return mem.cfg;
  }
  const cfg = await getConfigGeneral();
  mem.cfg = cfg;
  return cfg;
}

export async function listCategories(): Promise<Category[]> {
  if (mem.categories) {
    return mem.categories;
  }
  const categories = await getCategories();
  mem.categories = categories;
  return categories;
}

export async function listItemsByCategory(categoryId: string, limit = 40) {
  return getItems({ categoryId, limit });
}

export async function getDbSchemaVersion() {
  return getSchemaVersion();
}

export function clearDataSourceCache() {
  mem.cfg = null;
  mem.categories = null;
}
