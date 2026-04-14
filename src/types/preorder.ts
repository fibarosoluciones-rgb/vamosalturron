export type PreorderStatus = "nuevo" | "contactado" | "en_gestion" | "cerrado";

export interface PreorderClient {
  name: string;
  phone: string;
  email: string;
  notes: string;
}

export interface PreorderItem {
  tariffId: string;
  code: string;
  name: string;
  company: string;
  price: number | null;
}

export interface PreorderCollaborator {
  username: string;
  name: string;
}

export interface Preorder {
  id: string;
  status: PreorderStatus;
  client: PreorderClient;
  items: PreorderItem[];
  collaborator: PreorderCollaborator | null;
  source: string;
  leadId: string;
  createdAt: unknown;
  updatedAt: unknown;
}
