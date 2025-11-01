const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

try {
  admin.app();
} catch (error) {
  admin.initializeApp();
}

const firestore = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

const MIGRATION_SCHEMA_VERSION = 2;
const ITEMS_BATCH_SIZE = 300;

function getNestedValue(source, path) {
  if (!source) {
    return undefined;
  }
  const parts = path.split(".");
  let current = source;
  for (const part of parts) {
    if (current == null || typeof current !== "object" || !(part in current)) {
      return undefined;
    }
    current = current[part];
  }
  return current;
}

function getFirstAvailable(source, keys, fallback) {
  for (const key of keys) {
    const value = key.includes(".") ? getNestedValue(source, key) : source?.[key];
    if (value !== undefined && value !== null) {
      return value;
    }
  }
  return fallback;
}

function normalizeToArray(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === "object") {
    return Object.entries(value).map(([key, entry]) => {
      if (entry && typeof entry === "object" && !Array.isArray(entry)) {
        return entry.id ? entry : { id: entry.id || key, ...entry };
      }
      return { id: key, value: entry };
    });
  }
  return [];
}

function slugify(input, fallback) {
  if (!input || typeof input !== "string") {
    return fallback;
  }
  const normalized = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return normalized || fallback;
}

function ensureUniqueId(preferredId, usedIds, prefix, index) {
  let baseId = preferredId || `${prefix}-${index + 1}`;
  baseId = slugify(baseId, `${prefix}-${index + 1}`);
  let finalId = baseId;
  let counter = 1;
  while (usedIds.has(finalId)) {
    finalId = `${baseId}-${counter}`;
    counter += 1;
  }
  usedIds.add(finalId);
  return finalId;
}

function coerceBoolean(value, fallback = true) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["false", "0", "no"].includes(normalized)) {
      return false;
    }
    if (["true", "1", "yes"].includes(normalized)) {
      return true;
    }
  }
  return fallback;
}

function coerceNumber(value, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace(/,/g, "."));
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function extractConfig(legacy) {
  const config = getFirstAvailable(legacy, ["config", "general", "settings", "appConfig", "configuration"], {});
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return {};
  }
  return config;
}

function extractCategories(legacy) {
  return getFirstAvailable(
    legacy,
    [
      "categories",
      "categorias",
      "catalog.categories",
      "catalog.categorias",
      "catalog.categoryList",
    ],
    [],
  );
}

function extractItems(legacy) {
  return getFirstAvailable(
    legacy,
    ["items", "catalog.items", "tarifas", "plans", "catalog.tarifas", "catalog.plans"],
    [],
  );
}

function extractFeatures(rawItem) {
  return (
    getFirstAvailable(rawItem, ["features", "caracteristicas", "attrs", "attributes", "benefits"], {}) ||
    {}
  );
}

function extractCategoryId(rawItem) {
  const value = getFirstAvailable(rawItem, ["categoryId", "category", "categoriaId", "categoria", "cat"], null);
  if (value && typeof value === "object") {
    return value.id || value.slug || value.key || value.uid || null;
  }
  return value || null;
}

function buildCategoryPayload(rawCategory, index, usedIds) {
  const preferredId = getFirstAvailable(rawCategory, ["id", "slug", "key", "uid", "code"], null);
  const name =
    getFirstAvailable(rawCategory, ["name", "nombre", "title", "label"], null) || `Category ${index + 1}`;
  const id = ensureUniqueId(preferredId || slugify(name, null), usedIds, "category", index);
  const orderRaw = getFirstAvailable(rawCategory, ["order", "orden", "position", "index"], index);
  const isActiveRaw = getFirstAvailable(rawCategory, ["isActive", "active", "enabled", "visible"], true);

  const payload = {
    id,
    name,
    order: typeof orderRaw === "number" && Number.isFinite(orderRaw) ? orderRaw : Number.parseInt(orderRaw, 10) || index,
    isActive: coerceBoolean(isActiveRaw, true),
    updatedAt: FieldValue.serverTimestamp(),
  };

  const description = getFirstAvailable(rawCategory, ["description", "descripcion", "details"], null);
  if (description) {
    payload.description = description;
  }
  const icon = getFirstAvailable(rawCategory, ["icon", "icono", "image"], null);
  if (icon) {
    payload.icon = icon;
  }
  const color = getFirstAvailable(rawCategory, ["color", "colour"], null);
  if (color) {
    payload.color = color;
  }

  return { id, payload };
}

function buildItemPayload(rawItem, index, usedIds) {
  const preferredId = getFirstAvailable(rawItem, ["id", "slug", "key", "uid", "code"], null);
  const name = getFirstAvailable(rawItem, ["name", "nombre", "title"], null) || `Item ${index + 1}`;
  const id = ensureUniqueId(preferredId || slugify(name, null), usedIds, "item", index);
  const categoryId = extractCategoryId(rawItem) || "uncategorized";
  const operator =
    getFirstAvailable(rawItem, ["operator", "operador", "provider", "proveedor"], "unknown");
  const price = coerceNumber(getFirstAvailable(rawItem, ["price", "precio", "amount", "cost"], 0), 0);
  const isActiveRaw = getFirstAvailable(rawItem, ["isActive", "active", "enabled", "visible"], true);
  const features = extractFeatures(rawItem);

  const payload = {
    id,
    categoryId,
    operator,
    name,
    price,
    features,
    isActive: coerceBoolean(isActiveRaw, true),
    updatedAt: FieldValue.serverTimestamp(),
  };

  const description = getFirstAvailable(rawItem, ["description", "descripcion", "details"], null);
  if (description) {
    payload.description = description;
  }
  const images = getFirstAvailable(rawItem, ["images", "imagenes", "gallery"], null);
  if (images) {
    payload.images = images;
  }
  const tags = getFirstAvailable(rawItem, ["tags", "etiquetas"], null);
  if (tags) {
    payload.tags = tags;
  }
  const metadata = getFirstAvailable(rawItem, ["metadata", "meta"], null);
  if (metadata) {
    payload.metadata = metadata;
  }

  return { id, payload };
}

function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

exports.migrateAppState = onRequest({ region: "europe-west1" }, async (req, res) => {
  if (req.method && !["GET", "POST"].includes(req.method.toUpperCase())) {
    res.set("Allow", "GET, POST");
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const dryRun = String(req.query?.dryRun ?? "false").toLowerCase() === "true";

  const authHeader = req.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing bearer token" });
    return;
  }

  const idToken = authHeader.substring("Bearer ".length).trim();
  let decodedToken;
  try {
    decodedToken = await admin.auth().verifyIdToken(idToken);
  } catch (error) {
    logger.warn("Failed to verify ID token", { error: error.message });
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  if (!decodedToken.admin) {
    res.status(403).json({ error: "Admin privileges required" });
    return;
  }

  const versionRef = firestore.doc("app/meta/version");
  const versionSnap = await versionRef.get();
  const currentSchema = versionSnap.exists ? Number(versionSnap.get("schema")) : undefined;
  if (currentSchema && currentSchema >= MIGRATION_SCHEMA_VERSION) {
    logger.info("Migration skipped: schema already up to date", { currentSchema });
    res.status(200).json({ ok: true, alreadyMigrated: true, schema: currentSchema });
    return;
  }

  const legacyRef = firestore.doc("app/state");
  const legacySnap = await legacyRef.get();
  if (!legacySnap.exists) {
    res.status(404).json({ error: "Legacy document app/state not found" });
    return;
  }

  const legacyData = legacySnap.data() || {};
  const config = extractConfig(legacyData);
  const rawCategories = normalizeToArray(extractCategories(legacyData));
  const rawItems = normalizeToArray(extractItems(legacyData));

  logger.info("Starting app/state migration", {
    dryRun,
    hasConfig: !!(config && Object.keys(config).length),
    categoryCount: rawCategories.length,
    itemCount: rawItems.length,
  });

  const stats = {
    configMigrated: false,
    categoriesProcessed: rawCategories.length,
    categoriesMigrated: 0,
    itemsProcessed: rawItems.length,
    itemsMigrated: 0,
  };

  if (config && Object.keys(config).length) {
    logger.info("Preparing configuration migration", { fields: Object.keys(config) });
    if (!dryRun) {
      await firestore.doc("app/config/general").set(
        {
          ...config,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
    stats.configMigrated = true;
  }

  const usedCategoryIds = new Set();
  for (let i = 0; i < rawCategories.length; i += 1) {
    const rawCategory = rawCategories[i];
    const { id, payload } = buildCategoryPayload(rawCategory || {}, i, usedCategoryIds);
    logger.debug("Processing category", { id, dryRun });
    if (!dryRun) {
      await firestore.doc(`catalog/categories/${id}`).set(payload, { merge: true });
    }
    stats.categoriesMigrated += 1;
  }

  const usedItemIds = new Set();
  if (rawItems.length) {
    const chunks = chunkArray(rawItems, ITEMS_BATCH_SIZE);
    logger.info("Migrating items in batches", { batches: chunks.length, batchSize: ITEMS_BATCH_SIZE });
    let writer;
    if (!dryRun) {
      writer = firestore.bulkWriter();
      writer.onWriteError((error) => {
        logger.error("Bulk writer error", {
          code: error.code,
          message: error.message,
          document: error.documentRef?.path,
          failedAttempts: error.failedAttempts,
        });
        if (error.failedAttempts < 3) {
          logger.info("Retrying bulk write", { document: error.documentRef?.path, attempt: error.failedAttempts + 1 });
          return true;
        }
        return false;
      });
    }

    for (let batchIndex = 0; batchIndex < chunks.length; batchIndex += 1) {
      const batch = chunks[batchIndex];
      logger.info("Processing item batch", { batchIndex: batchIndex + 1, batchSize: batch.length });
      for (let i = 0; i < batch.length; i += 1) {
        const rawItem = batch[i];
        const overallIndex = batchIndex * ITEMS_BATCH_SIZE + i;
        const { id, payload } = buildItemPayload(rawItem || {}, overallIndex, usedItemIds);
        logger.debug("Prepared item", { id, categoryId: payload.categoryId, dryRun });
        if (!dryRun && writer) {
          const ref = firestore.doc(`catalog/items/${id}`);
          writer.set(ref, payload, { merge: true });
        }
        stats.itemsMigrated += 1;
      }
    }

    if (!dryRun && writer) {
      await writer.close();
    }
  }

  if (!dryRun) {
    await versionRef.set(
      {
        schema: MIGRATION_SCHEMA_VERSION,
        migratedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    await legacyRef.set(
      {
        migrated: true,
        lastMigratedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  logger.info("Migration completed", { dryRun, stats });

  res.status(200).json({ ok: true, dryRun, ...stats });
});
