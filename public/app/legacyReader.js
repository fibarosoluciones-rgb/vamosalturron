export const source = "legacy";

function resolveBridge() {
  if (typeof window !== "undefined" && window.__legacyDataSource) {
    return window.__legacyDataSource;
  }
  throw new Error("Legacy data source is not available");
}

export async function getLegacyCategoriesShape() {
  const bridge = resolveBridge();
  return bridge.getLegacyCategoriesShape();
}

export async function getLegacyItemsShape(categoryId) {
  const bridge = resolveBridge();
  return bridge.getLegacyItemsShape(categoryId);
}

export async function getLegacyBrand() {
  const bridge = resolveBridge();
  const value = await bridge.getLegacyBrand();
  return value ?? "FÍBARO";
}
