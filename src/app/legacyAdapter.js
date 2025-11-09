import { listCategories, listItemsByCategory, loadAppConfig } from "./dataSource.js";

export const SOURCE_ID = "new-catalog-adapter";

function mapCategory(category, index) {
  return {
    id: category.id,
    name: category.name,
    order: Number.isFinite(category.order) ? category.order : index,
    active: Boolean(category.isActive),
  };
}

function ensureRecord(value) {
  return value && typeof value === "object" ? value : {};
}

function mapItem(item, category) {
  const features = ensureRecord(item.features);
  const descripcion = typeof features.description === "string" ? features.description : "";
  const moneda = typeof features.currency === "string" ? features.currency : "EUR";
  const destacadaRaw =
    typeof features.featured === "boolean"
      ? features.featured
      : typeof features.destacada === "boolean"
        ? features.destacada
        : false;

  return {
    id: item.id,
    codigo: item.id,
    nombre: item.name,
    title: item.name,
    compania: item.operator,
    operator: item.operator,
    categoryId: item.categoryId,
    categoria: category?.id ?? item.categoryId,
    categoriaNombre: category?.name ?? "",
    familia: category?.name ?? "",
    precio: typeof item.price === "number" ? item.price : null,
    price: typeof item.price === "number" ? item.price : null,
    moneda,
    descripcion,
    description: descripcion,
    detalles: features,
    features,
    tags: features.tags,
    destacada: destacadaRaw,
    featured: destacadaRaw,
    isActive: Boolean(item.isActive),
    active: Boolean(item.isActive),
  };
}

export async function getLegacyCategoriesShape() {
  const categories = await listCategories();
  return categories.map(mapCategory);
}

export async function getLegacyItemsShape(categoryId) {
  const [{ items }, categories] = await Promise.all([
    listItemsByCategory(categoryId, 100),
    getLegacyCategoriesShape(),
  ]);

  const categoryMap = new Map(categories.map((category) => [category.id, category]));

  return items.map((item) => mapItem(item, categoryMap.get(item.categoryId) ?? null));
}

export async function getLegacyBrand() {
  const cfg = await loadAppConfig();
  const brand = cfg?.brand;
  return typeof brand === "string" && brand.trim() ? brand.trim() : "FIBARO";
}
