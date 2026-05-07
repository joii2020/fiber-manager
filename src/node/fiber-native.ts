import type {
  AcceptChannelParams,
  ConnectPeerParams,
  DisconnectPeerParams,
  FiberNodeClient,
  FiberRpcNode,
  GraphChannelsParams,
  GraphNodesParams,
  ListChannelsParams,
  ListPaymentsParams,
  OpenChannelParams,
  RpcObject,
  ShutdownChannelParams
} from "./fiber-client";

type JsonRpcSuccess = {
  result?: unknown;
};

type JsonRpcError = {
  error?: {
    code?: number;
    message?: string;
  };
};

type JsonRpcResponse = JsonRpcSuccess & JsonRpcError;

export class FiberNativeClient implements FiberNodeClient<FiberRpcNode> {
  async nodeInfo(node: FiberRpcNode): Promise<unknown> {
    return callNodeRpc(node, "node_info");
  }

  async listPeers(node: FiberRpcNode): Promise<unknown> {
    return callNodeRpc(node, "list_peers");
  }

  async listChannels(node: FiberRpcNode, params: ListChannelsParams = defaultListChannelsParams): Promise<unknown> {
    return callNodeRpc(node, "list_channels", [params]);
  }

  async listPayments(node: FiberRpcNode, params: ListPaymentsParams = defaultListPaymentsParams): Promise<unknown> {
    return callNodeRpc(node, "list_payments", [params]);
  }

  async graphNodes(node: FiberRpcNode, params: GraphNodesParams = defaultGraphParams): Promise<unknown> {
    return callNodeRpc(node, "graph_nodes", [params]);
  }

  async graphChannels(node: FiberRpcNode, params: GraphChannelsParams = defaultGraphParams): Promise<unknown> {
    return callNodeRpc(node, "graph_channels", [params]);
  }

  async openChannel(node: FiberRpcNode, params: OpenChannelParams): Promise<unknown> {
    return callNodeRpc(node, "open_channel", [params]);
  }

  async acceptChannel(node: FiberRpcNode, params: AcceptChannelParams): Promise<unknown> {
    return callNodeRpc(node, "accept_channel", [params]);
  }

  async shutdownChannel(node: FiberRpcNode, params: ShutdownChannelParams): Promise<void> {
    await callNodeRpc(node, "shutdown_channel", [params]);
  }

  async connectPeer(node: FiberRpcNode, params: ConnectPeerParams): Promise<void> {
    await callNodeRpc(node, "connect_peer", [params]);
  }

  async disconnectPeer(node: FiberRpcNode, params: DisconnectPeerParams): Promise<void> {
    await callNodeRpc(node, "disconnect_peer", [params]);
  }

  async sendPayment(node: FiberRpcNode, params: RpcObject): Promise<unknown> {
    return callNodeRpc(node, "send_payment", [params]);
  }

  async newInvoice(node: FiberRpcNode, params: RpcObject): Promise<unknown> {
    return callNodeRpc(node, "new_invoice", [params]);
  }

  async getPayment(node: FiberRpcNode, params: RpcObject): Promise<unknown> {
    return callNodeRpc(node, "get_payment", [params]);
  }

  async parseInvoice(node: FiberRpcNode, params: RpcObject): Promise<unknown> {
    return callNodeRpc(node, "parse_invoice", [params]);
  }

  async getInvoice(node: FiberRpcNode, params: RpcObject): Promise<unknown> {
    return callNodeRpc(node, "get_invoice", [params]);
  }

  async cancelInvoice(node: FiberRpcNode, params: RpcObject): Promise<unknown> {
    return callNodeRpc(node, "cancel_invoice", [params]);
  }

  async settleInvoice(node: FiberRpcNode, params: RpcObject): Promise<unknown> {
    return callNodeRpc(node, "settle_invoice", [params]);
  }

  async sendBtc(node: FiberRpcNode, params: RpcObject): Promise<unknown> {
    return callNodeRpc(node, "send_btc", [params]);
  }

  async receiveBtc(node: FiberRpcNode, params: RpcObject): Promise<unknown> {
    return callNodeRpc(node, "receive_btc", [params]);
  }

  async getCchOrder(node: FiberRpcNode, params: RpcObject): Promise<unknown> {
    return callNodeRpc(node, "get_cch_order", [params]);
  }
}

const defaultListChannelsParams: ListChannelsParams = {
  pubkey: null,
  include_closed: null,
  only_pending: null
};

const defaultListPaymentsParams: ListPaymentsParams = {
  status: null,
  limit: null,
  after: null
};

const defaultGraphParams: GraphNodesParams & GraphChannelsParams = {
  limit: null,
  after: null
};

type CallFiberRpcOptions = {
  authToken?: string;
};

function callNodeRpc(node: FiberRpcNode, method: string, params: unknown[] = []): Promise<unknown> {
  return callFiberRpc(node.rpcEndpoint, method, params, { authToken: node.authToken });
}

export async function callFiberRpc(
  endpoint: string,
  method: string,
  params: unknown[] = [],
  options: CallFiberRpcOptions = {}
): Promise<unknown> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const authToken = options.authToken?.trim();
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: `${Date.now()}-${method}`,
      method,
      params
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = (await response.json()) as JsonRpcResponse;
  if (data.error) {
    const code = typeof data.error.code === "number" ? `${data.error.code}: ` : "";
    throw new Error(`RPC error ${code}${data.error.message ?? "unknown error"}`);
  }

  return data.result;
}

export function normalizeRpcList(result: unknown, preferredKey: string): unknown[] {
  if (Array.isArray(result)) {
    return result;
  }

  if (!isRecord(result)) {
    return [];
  }

  const candidates = [
    preferredKey,
    preferredKey.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`),
    "items",
    "data",
    "result",
    "nodes",
    "peers",
    "channels",
    "payments"
  ];

  for (const key of candidates) {
    const value = result[key];
    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
