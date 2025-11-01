import { listCategories, listItemsByCategory, loadAppConfig } from "./dataSource.js";

export const source = "new";

function mapCategory(category) {
  return {
    id: category.id,
    name: category.name,
    order: category.order ?? 0,
    active: Boolean(category.isActive),
  };
}

function parseNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normaliseLines(value) {
  const parsed = parseNumber(value);
  return parsed === null ? null : parsed;
}

function ensureArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === "string") {
    return value
      .split(/[,;\n]/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return value ?? [];
}

function mapItem(item) {
  const features = item.features ?? {};
  const price = parseNumber(item.price) ?? 0;
  const featureBag = /** @type {Record<string, unknown>} */ (features);
  const lines = normaliseLines(featureBag.lineas ?? featureBag.lines);
  const description =
    featureBag["descripción"] ?? featureBag.descripcion ?? featureBag.description ?? "";
  const permanence = featureBag.permanencia ?? featureBag.permanence ?? "";
  const highlighted = Boolean(featureBag.destacada ?? featureBag.featured ?? false);
  const platforms = ensureArray(featureBag.plataformas ?? featureBag.platforms);

  const legacy = {
    id: item.id,
    codigo: typeof featureBag.codigo === "string" && featureBag.codigo ? featureBag.codigo : item.id,
    nombre: item.name,
    precio: price,
    moneda: typeof featureBag.moneda === "string" && featureBag.moneda ? featureBag.moneda : "EUR",
    categoria: item.categoryId,
    categoryId: item.categoryId,
    operador: item.operator,
    operator: item.operator,
    "compañia": item.operator,
    compania: item.operator,
    descripcion: typeof description === "string" ? description : "",
    "descripción": typeof description === "string" ? description : "",
    permanencia: typeof permanence === "string" ? permanence : "",
    destacada: highlighted,
    activo: Boolean(item.isActive),
    isActive: Boolean(item.isActive),
    lineas: lines,
    plataformas: platforms,
    features,
  };

  const typeValue = featureBag.tipo ?? featureBag.type ?? null;
  if (typeof typeValue === "string" && typeValue) {
    legacy.tipo = typeValue;
    legacy.type = typeValue;
  }

  const title = featureBag.title ?? featureBag.nombrePublico ?? item.name;
  if (typeof title === "string" && title) {
    legacy.title = title;
  }

  return legacy;
}

export async function getLegacyCategoriesShape() {
  const categories = await listCategories();
  return categories.map(mapCategory);
}

export async function getLegacyItemsShape(categoryId) {
  const { items } = await listItemsByCategory(categoryId, 100);
  return items.map(mapItem);
}

export async function getLegacyBrand() {
  const config = await loadAppConfig();
  return (config && config.brand) || "FÍBARO";
}
