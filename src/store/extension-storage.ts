import { createNodeRegistry, type NodeRegistryState } from "../node/registry";
import { managedNodeSchema } from "../schemas/managed-node";

export type StorageArea = {
  get(keys?: string | string[] | Record<string, unknown> | null): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
};

const NODE_REGISTRY_KEY = "fiber-manager:node-registry";
const INVOICE_HISTORY_KEY = "fiber-manager:invoice-history";

export type StoredInvoiceHistoryItem = {
  id: string;
  createdAt: string;
  invoiceAddress: string;
  invoice: unknown;
};

export class ExtensionStorage {
  constructor(private readonly area: StorageArea = getDefaultStorageArea()) {}

  async loadNodeRegistry(): Promise<NodeRegistryState> {
    const data = await this.area.get(NODE_REGISTRY_KEY);
    const raw = data[NODE_REGISTRY_KEY];

    if (!raw || typeof raw !== "object") {
      return createNodeRegistry([]);
    }

    const maybeRegistry = raw as Partial<NodeRegistryState>;
    const nodes = Array.isArray(maybeRegistry.nodes)
      ? maybeRegistry.nodes.map((node) => {
          const parsed = managedNodeSchema.parse(node);
          return {
            ...parsed,
            status: "disconnected" as const,
            lastError: undefined,
            latencyMs: undefined,
            latestBlock: undefined,
            syncState: undefined,
            pubkey: undefined,
            rpc: undefined
          };
        })
      : [];

    return createNodeRegistry(nodes, typeof maybeRegistry.activeNodeId === "string" ? maybeRegistry.activeNodeId : null);
  }

  async saveNodeRegistry(registry: NodeRegistryState): Promise<void> {
    await this.area.set({
      [NODE_REGISTRY_KEY]: createNodeRegistry(registry.nodes, registry.activeNodeId)
    });
  }

  async loadInvoiceHistory(nodeId: string): Promise<StoredInvoiceHistoryItem[]> {
    const data = await this.area.get(INVOICE_HISTORY_KEY);
    const raw = data[INVOICE_HISTORY_KEY];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return [];
    }

    const nodeItems = (raw as Record<string, unknown>)[nodeId];
    if (!Array.isArray(nodeItems)) {
      return [];
    }

    return nodeItems.filter(isStoredInvoiceHistoryItem);
  }

  async saveInvoiceHistory(nodeId: string, items: StoredInvoiceHistoryItem[]): Promise<void> {
    const data = await this.area.get(INVOICE_HISTORY_KEY);
    const raw = data[INVOICE_HISTORY_KEY];
    const histories = raw && typeof raw === "object" && !Array.isArray(raw)
      ? { ...(raw as Record<string, unknown>) }
      : {};

    histories[nodeId] = items;
    await this.area.set({ [INVOICE_HISTORY_KEY]: histories });
  }
}

export function createExtensionStorage(area?: StorageArea): ExtensionStorage {
  return new ExtensionStorage(area);
}

function isStoredInvoiceHistoryItem(value: unknown): value is StoredInvoiceHistoryItem {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const item = value as Partial<StoredInvoiceHistoryItem>;
  return (
    typeof item.id === "string" &&
    typeof item.createdAt === "string" &&
    typeof item.invoiceAddress === "string" &&
    "invoice" in item
  );
}

function getDefaultStorageArea(): StorageArea {
  const runtime = globalThis as typeof globalThis & {
    browser?: { storage?: { local?: StorageArea } };
    chrome?: { storage?: { local?: chrome.storage.LocalStorageArea } };
  };

  if (runtime.browser?.storage?.local) {
    return runtime.browser.storage.local;
  }

  if (runtime.chrome?.storage?.local) {
    return {
      get: (keys) =>
        new Promise((resolve) => {
          runtime.chrome!.storage!.local!.get(keys as never, (items) => resolve(items as Record<string, unknown>));
        }),
      set: (items) =>
        new Promise((resolve) => {
          runtime.chrome!.storage!.local!.set(items, () => resolve());
        })
    };
  }

  throw new Error("Extension storage is unavailable outside a browser extension runtime.");
}
