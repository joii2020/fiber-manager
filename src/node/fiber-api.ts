import type { ManagedNode, NodeRpcSnapshot } from "../schemas/managed-node";
import type {
  AcceptChannelParams,
  ConnectPeerParams,
  DisconnectPeerParams,
  GraphChannelsParams,
  GraphNodesParams,
  ListChannelsParams,
  ListPaymentsParams,
  OpenChannelParams,
  RpcObject,
  ShutdownChannelParams
} from "./fiber-client";
import { FiberNativeClient, normalizeRpcList } from "./fiber-native";
import { FiberWebClient } from "./fiber-web";

const nativeClient = new FiberNativeClient();
const webClient = new FiberWebClient();
let isRefreshingNodes = false;

type ReadableSnapshotKey = "peers" | "channels" | "payments" | "graphNodes" | "graphChannels";

const readableNodeCalls: ReadonlyArray<{
  snapshotKey: ReadableSnapshotKey;
  errorKey: string;
  load(node: ManagedNode): Promise<unknown>;
}> = [
    {
      snapshotKey: "peers",
      errorKey: "list_peers",
      load: listPeers
    },
    {
      snapshotKey: "channels",
      errorKey: "list_channels",
      load: (node) => listChannels(node, { pubkey: null, include_closed: null, only_pending: null })
    },
    {
      snapshotKey: "payments",
      errorKey: "list_payments",
      load: (node) => listPayments(node, { status: null, limit: null, after: null })
    },
    {
      snapshotKey: "graphNodes",
      errorKey: "graph_nodes",
      load: (node) => graphNodes(node, { limit: null, after: null })
    },
    {
      snapshotKey: "graphChannels",
      errorKey: "graph_channels",
      load: (node) => graphChannels(node, { limit: null, after: null })
    }
  ];

export async function refreshNodes(nodes: ManagedNode[]): Promise<ManagedNode[]> {
  if (isRefreshingNodes) {
    return nodes;
  }

  isRefreshingNodes = true;
  console.log("Refresh All Nodes");
  try {
    return await Promise.all(nodes.map(refreshNode));
  } finally {
    isRefreshingNodes = false;
  }
}

export async function refreshNode(node: ManagedNode): Promise<ManagedNode> {
  console.log(`RefreshNode(${node.name})`);
  const startedAt = Date.now();
  try {
    const info = await nodeInfo(node);
    const snapshot: NodeRpcSnapshot = {
      refreshedAt: new Date().toISOString(),
      lastMethod: "node_info",
      lastStatus: "success",
      lastStartedAt: new Date(startedAt).toISOString(),
      lastFinishedAt: new Date().toISOString(),
      nodeInfo: info,
      errors: {}
    };

    for (const { snapshotKey, errorKey, load } of readableNodeCalls) {
      try {
        snapshot[snapshotKey] = normalizeRpcList(await load(node), snapshotKey);
        snapshot.lastMethod = errorKey;
        snapshot.lastStatus = "success";
        snapshot.lastFinishedAt = new Date().toISOString();
      } catch (err) {
        snapshot.errors![errorKey] = err instanceof Error ? err.message : `${errorKey} failed`;
        snapshot.lastMethod = errorKey;
        snapshot.lastStatus = "error";
        snapshot.lastFinishedAt = new Date().toISOString();
      }
    }

    if (Object.keys(snapshot.errors ?? {}).length === 0) {
      delete snapshot.errors;
    }

    return {
      ...node,
      status: "connected",
      latencyMs: Date.now() - startedAt,
      pubkey: readNodePubkey(info) ?? node.pubkey,
      latestBlock: readNumberField(info, ["latestBlock", "latest_block", "block_number", "tip_block_number"]),
      network: readStringField(info, ["network", "chain", "chain_name"]) ?? node.network,
      syncState: snapshot.errors ? `${Object.keys(snapshot.errors).length} RPCs unavailable` : "synced",
      rpc: snapshot,
      lastError: undefined
    };
  } catch (err) {
    const finishedAt = new Date().toISOString();
    const message = err instanceof Error ? err.message : "Network error";
    return {
      ...node,
      status: "disconnected",
      latencyMs: Date.now() - startedAt,
      rpc: {
        ...node.rpc,
        lastMethod: "node_info",
        lastStatus: "error",
        lastStartedAt: new Date(startedAt).toISOString(),
        lastFinishedAt: finishedAt,
        errors: {
          ...node.rpc?.errors,
          node_info: message
        }
      },
      lastError: message
    };
  }
}

async function nodeInfo(node: ManagedNode): Promise<unknown> {
  switch (node.source) {
    case "fiber-rpc":
      return nativeClient.nodeInfo(node);
    case "fiber-wasm-page":
      return webClient.nodeInfo(node);
  }
}

export async function listPeers(node: ManagedNode): Promise<unknown> {
  console.log(`ListPeers(${node.name})`);
  switch (node.source) {
    case "fiber-rpc":
      return nativeClient.listPeers(node);
    case "fiber-wasm-page":
      return webClient.listPeers(node);
  }
}

export async function listChannels(node: ManagedNode, params?: ListChannelsParams): Promise<unknown> {
  console.log(`ListChannels(${node.name})`);
  switch (node.source) {
    case "fiber-rpc":
      return nativeClient.listChannels(node, params);
    case "fiber-wasm-page":
      return webClient.listChannels(node, params);
  }
}

export async function listPayments(node: ManagedNode, params?: ListPaymentsParams): Promise<unknown> {
  console.log(`ListPayments(${node.name})`);
  switch (node.source) {
    case "fiber-rpc":
      return nativeClient.listPayments(node, params);
    case "fiber-wasm-page":
      return webClient.listPayments(node, params);
  }
}

export async function graphNodes(node: ManagedNode, params?: GraphNodesParams): Promise<unknown> {
  console.log(`GraphNodes(${node.name})`);
  switch (node.source) {
    case "fiber-rpc":
      return nativeClient.graphNodes(node, params);
    case "fiber-wasm-page":
      return webClient.graphNodes(node, params);
  }
}

export async function graphChannels(node: ManagedNode, params?: GraphChannelsParams): Promise<unknown> {
  console.log(`GraphChannels(${node.name})`);
  switch (node.source) {
    case "fiber-rpc":
      return nativeClient.graphChannels(node, params);
    case "fiber-wasm-page":
      return webClient.graphChannels(node, params);
  }
}

export async function openChannel(node: ManagedNode, params: OpenChannelParams): Promise<unknown> {
  console.log(`OpenChannel(${node.name})`);
  switch (node.source) {
    case "fiber-rpc":
      return nativeClient.openChannel(node, params);
    case "fiber-wasm-page":
      return webClient.openChannel(node, params);
  }
}

export async function acceptChannel(node: ManagedNode, params: AcceptChannelParams): Promise<unknown> {
  console.log(`AcceptChannel(${node.name})`);
  switch (node.source) {
    case "fiber-rpc":
      return nativeClient.acceptChannel(node, params);
    case "fiber-wasm-page":
      return webClient.acceptChannel(node, params);
  }
}

export async function shutdownChannel(node: ManagedNode, params: ShutdownChannelParams): Promise<void> {
  console.log(`ShutdownChannel(${node.name})`);
  switch (node.source) {
    case "fiber-rpc":
      return nativeClient.shutdownChannel(node, params);
    case "fiber-wasm-page":
      return webClient.shutdownChannel(node, params);
  }
}

export async function connectPeer(node: ManagedNode, params: ConnectPeerParams): Promise<void> {
  console.log(`ConnectPeer(${node.name})`);
  switch (node.source) {
    case "fiber-rpc":
      return nativeClient.connectPeer(node, params);
    case "fiber-wasm-page":
      return webClient.connectPeer(node, params);
  }
}

export async function disconnectPeer(node: ManagedNode, params: DisconnectPeerParams): Promise<void> {
  console.log(`DisconnectPeer(${node.name})`);
  switch (node.source) {
    case "fiber-rpc":
      return nativeClient.disconnectPeer(node, params);
    case "fiber-wasm-page":
      return webClient.disconnectPeer(node, params);
  }
}

export async function sendPayment(node: ManagedNode, params: RpcObject): Promise<unknown> {
  console.log(`SendPayment(${node.name})`);
  return paymentMutation(node, "sendPayment", params);
}

export async function newInvoice(node: ManagedNode, params: RpcObject): Promise<unknown> {
  console.log(`NewInvoice(${node.name})`);
  return paymentMutation(node, "newInvoice", params);
}

export async function getPayment(node: ManagedNode, params: RpcObject): Promise<unknown> {
  console.log(`GetPayment(${node.name})`);
  return paymentMutation(node, "getPayment", params);
}

export async function parseInvoice(node: ManagedNode, params: RpcObject): Promise<unknown> {
  console.log(`ParseInvoice(${node.name})`);
  return paymentMutation(node, "parseInvoice", params);
}

export async function getInvoice(node: ManagedNode, params: RpcObject): Promise<unknown> {
  console.log(`GetInvoice(${node.name})`);
  return paymentMutation(node, "getInvoice", params);
}

export async function cancelInvoice(node: ManagedNode, params: RpcObject): Promise<unknown> {
  console.log(`CancelInvoice(${node.name})`);
  return paymentMutation(node, "cancelInvoice", params);
}

export async function settleInvoice(node: ManagedNode, params: RpcObject): Promise<unknown> {
  console.log(`SettleInvoice(${node.name})`);
  return paymentMutation(node, "settleInvoice", params);
}

export async function sendBtc(node: ManagedNode, params: RpcObject): Promise<unknown> {
  console.log(`SendBtc(${node.name})`);
  return paymentMutation(node, "sendBtc", params);
}

export async function receiveBtc(node: ManagedNode, params: RpcObject): Promise<unknown> {
  console.log(`ReceiveBtc(${node.name})`);
  return paymentMutation(node, "receiveBtc", params);
}

export async function getCchOrder(node: ManagedNode, params: RpcObject): Promise<unknown> {
  console.log(`GetCchOrder(${node.name})`);
  return paymentMutation(node, "getCchOrder", params);
}

type PaymentMutationName =
  | "sendPayment"
  | "newInvoice"
  | "getPayment"
  | "parseInvoice"
  | "getInvoice"
  | "cancelInvoice"
  | "settleInvoice"
  | "sendBtc"
  | "receiveBtc"
  | "getCchOrder";

async function paymentMutation(node: ManagedNode, method: PaymentMutationName, params: RpcObject): Promise<unknown> {
  switch (node.source) {
    case "fiber-rpc":
      return nativeClient[method](node, params);
    case "fiber-wasm-page":
      return webClient[method](node, params);
  }
}

export { normalizeRpcList };

function readStringField(value: unknown, keys: string[]): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  for (const key of keys) {
    const field = value[key];
    if (typeof field === "string" && field.length > 0) {
      return field;
    }
  }

  return undefined;
}

function readNodePubkey(value: unknown): string | undefined {
  const direct = readStringField(value, ["pubkey", "public_key", "node_id"]);
  if (direct) {
    return direct;
  }

  if (!isRecord(value)) {
    return undefined;
  }

  for (const key of ["result", "node_info", "nodeInfo", "data"]) {
    const nested = readNodePubkey(value[key]);
    if (nested) {
      return nested;
    }
  }

  return undefined;
}

function readNumberField(value: unknown, keys: string[]): number | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  for (const key of keys) {
    const field = value[key];
    if (typeof field === "number" && Number.isFinite(field) && field >= 0) {
      return Math.floor(field);
    }
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
