import { loadAppConfig } from "./dataSource";
import * as newSource from "./legacyAdapter";
import * as legacySource from "./legacyReader";

type DataSourceModule = {
  SOURCE_ID: string;
  getLegacyCategoriesShape: (...args: any[]) => Promise<any>;
  getLegacyItemsShape: (...args: any[]) => Promise<any>;
  getLegacyBrand: (...args: any[]) => Promise<any>;
};

function wrapWithFallback(useNew: boolean): DataSourceModule {
  if (!useNew) {
    return legacySource as unknown as DataSourceModule;
  }

  const state = { current: newSource.SOURCE_ID };

  const call = async <T>(method: keyof typeof newSource, args: unknown[], validator?: (value: T) => boolean): Promise<T> => {
    try {
      const fn = (newSource as Record<string, (...fnArgs: unknown[]) => Promise<T>>)[method as string];
      if (typeof fn !== "function") {
        throw new Error(`Método no disponible en el adaptador: ${String(method)}`);
      }
      const result = await fn(...args);
      if (validator && !validator(result as T)) {
        throw new Error(`El adaptador devolvió un resultado no válido para ${String(method)}`);
      }
      return result as T;
    } catch (error) {
      console.warn(`[catalog] Falling back to legacy data source for ${String(method)}.`, error);
      state.current = legacySource.SOURCE_ID;
      const legacyFn = (legacySource as Record<string, (...legacyArgs: unknown[]) => Promise<T>>)[method as string];
      if (typeof legacyFn !== "function") {
        throw error;
      }
      return legacyFn(...args);
    }
  };

  const dataSource: Partial<DataSourceModule> = {};

  Object.defineProperty(dataSource, "SOURCE_ID", {
    enumerable: true,
    get() {
      return state.current;
    },
  });

  dataSource.getLegacyCategoriesShape = (...args: unknown[]) =>
    call("getLegacyCategoriesShape", args, (value) => Array.isArray(value));

  dataSource.getLegacyItemsShape = (...args: unknown[]) =>
    call("getLegacyItemsShape", args, (value) => Array.isArray(value));

  dataSource.getLegacyBrand = (...args: unknown[]) =>
    call("getLegacyBrand", args, (value) => typeof value === "string" && value.trim().length > 0);

  return dataSource as DataSourceModule;
}

export async function getDataSource(): Promise<DataSourceModule> {
  try {
    const cfg = await loadAppConfig();
    const useNew = Boolean(cfg?.featureFlags?.newCatalog);
    return wrapWithFallback(useNew);
  } catch (error) {
    console.warn("[catalog] No se pudo cargar la configuración. Se usará el catálogo legacy.", error);
    return wrapWithFallback(false);
  }
}
