export const source = "legacy" as const;

type LegacyDataBridge = {
  getLegacyCategoriesShape: () => Promise<unknown> | unknown;
  getLegacyItemsShape: (categoryId: string) => Promise<unknown> | unknown;
  getLegacyBrand: () => Promise<string> | string;
};

function resolveBridge(): LegacyDataBridge {
  if (typeof window !== "undefined" && window.__legacyDataSource) {
    return window.__legacyDataSource;
  }
  throw new Error("Legacy data source is not available");
}

export async function getLegacyCategoriesShape(): Promise<unknown> {
  const bridge = resolveBridge();
  return bridge.getLegacyCategoriesShape();
}

export async function getLegacyItemsShape(categoryId: string): Promise<unknown> {
  const bridge = resolveBridge();
  return bridge.getLegacyItemsShape(categoryId);
}

export async function getLegacyBrand(): Promise<string> {
  const bridge = resolveBridge();
  const value = await bridge.getLegacyBrand();
  return value ?? "FÍBARO";
}

declare global {
  interface Window {
    __legacyDataSource?: LegacyDataBridge;
  }
}
