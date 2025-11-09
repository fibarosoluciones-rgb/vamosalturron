import {
  getConfigGeneral as fetchConfigGeneral,
  getCategories as fetchCategories,
  getItems as fetchItems,
} from "../services/db/catalog.js";
import { getSchemaVersion as fetchSchemaVersion } from "../services/db/meta.js";

const mem = {
  cfg: null,
  categories: null,
};

const defaultServices = {
  getConfigGeneral: fetchConfigGeneral,
  getCategories: fetchCategories,
  getItems: fetchItems,
  getSchemaVersion: fetchSchemaVersion,
};

const services = { ...defaultServices };

export function __setDataSourceServicesForTesting(overrides) {
  Object.assign(services, overrides);
  clearDataSourceCache();
}

export function __resetDataSourceServicesForTesting() {
  Object.assign(services, defaultServices);
  clearDataSourceCache();
}

export async function loadAppConfig() {
  if (mem.cfg) {
    return mem.cfg;
  }
  const cfg = await services.getConfigGeneral();
  mem.cfg = cfg;
  return cfg;
}

export async function listCategories() {
  if (mem.categories) {
    return mem.categories;
  }
  const categories = await services.getCategories();
  mem.categories = categories;
  return categories;
}

export async function listItemsByCategory(categoryId, limit = 40) {
  return services.getItems({ categoryId, limit });
}

export async function getDbSchemaVersion() {
  return services.getSchemaVersion();
}

export function clearDataSourceCache() {
  mem.cfg = null;
  mem.categories = null;
}
