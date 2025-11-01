import { loadAppConfig } from "./dataSource.js";
import * as newSource from "./legacyAdapter.js";
import * as legacySource from "./legacyReader.js";

type DataSourceModule = typeof newSource | typeof legacySource;

export async function getDataSource(): Promise<DataSourceModule> {
  try {
    const config = await loadAppConfig();
    const useNew = Boolean(config?.featureFlags?.newCatalog);
    return useNew ? newSource : legacySource;
  } catch (error) {
    console.warn("No se pudo cargar la configuración de la app, usando modo legacy", error);
    return legacySource;
  }
}
