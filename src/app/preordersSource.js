import {
  createPreorder as createPreorderRecord,
  listPreorders as listPreordersRecords,
} from "../services/db/preorders.js";

const defaultServices = {
  createPreorder: createPreorderRecord,
  listPreorders: listPreordersRecords,
};

const services = { ...defaultServices };

export function __setPreordersSourceServicesForTesting(overrides) {
  Object.assign(services, overrides);
}

export function __resetPreordersSourceServicesForTesting() {
  Object.assign(services, defaultServices);
}

export async function createPreorder(payload) {
  return services.createPreorder(payload);
}

export async function listPreorders(options = {}) {
  return services.listPreorders(options);
}
