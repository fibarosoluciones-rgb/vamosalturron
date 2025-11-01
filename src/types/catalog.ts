export type TimestampISO = string;

export interface Category {
  id: string;
  name: string;
  order: number;
  isActive: boolean;
  updatedAt?: TimestampISO;
}

export interface Item {
  id: string;
  categoryId: string;
  operator: string;
  name: string;
  price: number;
  features: Record<string, unknown>;
  isActive: boolean;
  updatedAt?: TimestampISO;
}

export interface AppConfigGeneral {
  brand: string;
  featureFlags?: Record<string, boolean>;
  updatedAt?: TimestampISO;
}
