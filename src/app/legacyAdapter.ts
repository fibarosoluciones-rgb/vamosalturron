import type { Category, Item } from "../types/catalog.js";
import { listCategories, listItemsByCategory, loadAppConfig } from "./dataSource.js";

export const source = "new" as const;

type LegacyCategory = {
  id: string;
  name: string;
  order: number;
  active: boolean;
};

type LegacyItem = Record<string, unknown> & {
  id: string;
  codigo: string;
  nombre: string;
  precio: number;
  moneda: string;
  categoria?: string;
  categoryId?: string;
  operador?: string;
  operator?: string;
  "compañia"?: string;
  compania?: string;
  descripcion?: string;
  "descripción"?: string;
  permanencia?: string;
  destacada?: boolean;
  activo?: boolean;
  isActive?: boolean;
  lineas?: number | null;
  plataformas?: unknown;
  features?: Record<string, unknown>;
};

function mapCategory(category: Category): LegacyCategory {
  return {
    id: category.id,
    name: category.name,
    order: category.order ?? 0,
    active: Boolean(category.isActive),
  };
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normaliseLines(value: unknown): number | null {
  const parsed = parseNumber(value);
  return parsed === null ? null : parsed;
}

function ensureArray(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parts = value
      .split(/[,;\n]/)
      .map((entry) => entry.trim())
      .filter(Boolean);
    return parts;
  }
  return value ?? [];
}

function mapItem(item: Item): LegacyItem {
  const features = item.features ?? {};
  const price = parseNumber(item.price) ?? 0;
  const lines = normaliseLines((features as Record<string, unknown>).lineas ?? (features as Record<string, unknown>).lines);
  const description =
    (features as Record<string, unknown>)["descripción"] ??
    (features as Record<string, unknown>).descripcion ??
    (features as Record<string, unknown>).description ??
    "";
  const permanence =
    (features as Record<string, unknown>).permanencia ??
    (features as Record<string, unknown>).permanence ??
    "";
  const highlighted = Boolean(
    (features as Record<string, unknown>).destacada ??
      (features as Record<string, unknown>).featured ??
      false,
  );
  const platforms = ensureArray((features as Record<string, unknown>).plataformas ?? (features as Record<string, unknown>).platforms);

  const legacy: LegacyItem = {
    id: item.id,
    codigo: typeof (features as Record<string, unknown>).codigo === "string" && (features as Record<string, unknown>).codigo
      ? ((features as Record<string, unknown>).codigo as string)
      : item.id,
    nombre: item.name,
    precio: price,
    moneda: ((features as Record<string, unknown>).moneda as string) || "EUR",
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
    features: features,
  };

  const typeValue =
    (features as Record<string, unknown>).tipo ??
    (features as Record<string, unknown>).type ??
    null;
  if (typeof typeValue === "string" && typeValue) {
    legacy.tipo = typeValue;
    (legacy as Record<string, unknown>).type = typeValue;
  }

  const title =
    (features as Record<string, unknown>).title ??
    (features as Record<string, unknown>).nombrePublico ??
    item.name;
  if (typeof title === "string" && title) {
    (legacy as Record<string, unknown>).title = title;
  }

  return legacy;
}

export async function getLegacyCategoriesShape(): Promise<LegacyCategory[]> {
  const categories = await listCategories();
  return categories.map(mapCategory);
}

export async function getLegacyItemsShape(categoryId: string): Promise<LegacyItem[]> {
  const { items } = await listItemsByCategory(categoryId, 100);
  return items.map(mapItem);
}

export async function getLegacyBrand(): Promise<string> {
  const config = await loadAppConfig();
  return config?.brand || "FÍBARO";
}
