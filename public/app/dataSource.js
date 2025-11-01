import { getConfigGeneral, getCategories, getItems } from "../services/db/catalog.js";
import { getSchemaVersion } from "../services/db/meta.js";

const memory = {
  config: null,
  categories: null,
};

export async function loadAppConfig() {
  if (memory.config) {
    return memory.config;
  }
  const config = await getConfigGeneral();
  memory.config = config;
  return config;
}

export async function listCategories() {
  if (memory.categories) {
    return memory.categories;
  }
  const categories = await getCategories();
  memory.categories = categories;
  return categories;
}

export async function listItemsByCategory(categoryId, limit = 40, cursor) {
  return getItems({ categoryId, limit, cursor });
}

export async function getDbSchemaVersion() {
  return getSchemaVersion();
}
