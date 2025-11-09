import { loadAppConfig as loadAppConfigDefault } from "./dataSource.js";
import * as defaultNewSource from "./legacyAdapter.js";
import * as defaultLegacySource from "./legacyReader.js";

const defaultContext = {
  loadAppConfig: loadAppConfigDefault,
  newSource: defaultNewSource,
  legacySource: defaultLegacySource,
};

const context = { ...defaultContext };

export function __setDataRouterContextForTesting(overrides) {
  Object.assign(context, overrides);
}

export function __resetDataRouterContextForTesting() {
  Object.assign(context, defaultContext);
}

function wrapWithFallback(useNew) {
  const newSource = context.newSource;
  const legacySource = context.legacySource;
  if (!useNew) {
    return legacySource;
  }

  const state = { current: newSource.SOURCE_ID };

  const call = async (method, args, validator) => {
    const runLegacy = async () => {
      const legacyFn = legacySource[method];
      if (typeof legacyFn !== "function") {
        throw new Error(`Método legacy no disponible: ${String(method)}`);
      }
      return legacyFn(...args);
    };

    if (state.current === legacySource.SOURCE_ID) {
      return runLegacy();
    }

    try {
      const fn = newSource[method];
      if (typeof fn !== "function") {
        throw new Error(`Método no disponible en el adaptador: ${String(method)}`);
      }
      const result = await fn(...args);
      if (validator && !validator(result)) {
        throw new Error(`El adaptador devolvió un resultado no válido para ${String(method)}`);
      }
      return result;
    } catch (error) {
      console.warn(`[catalog] Falling back to legacy data source for ${String(method)}.`, error);
      state.current = legacySource.SOURCE_ID;
      return runLegacy();
    }
  };

  const dataSource = {};

  Object.defineProperty(dataSource, "SOURCE_ID", {
    enumerable: true,
    get() {
      return state.current;
    },
  });

  dataSource.getLegacyCategoriesShape = (...args) =>
    call("getLegacyCategoriesShape", args, (value) => Array.isArray(value));

  dataSource.getLegacyItemsShape = (...args) =>
    call("getLegacyItemsShape", args, (value) => Array.isArray(value));

  dataSource.getLegacyBrand = (...args) =>
    call("getLegacyBrand", args, (value) => typeof value === "string" && value.trim().length > 0);

  return dataSource;
}

export async function getDataSource() {
  try {
    const cfg = await context.loadAppConfig();
    const useNew = Boolean(cfg?.featureFlags?.newCatalog);
    return wrapWithFallback(useNew);
  } catch (error) {
    console.warn("[catalog] No se pudo cargar la configuración. Se usará el catálogo legacy.", error);
    return wrapWithFallback(false);
  }
}
