import type {
  AcceptChannelParams,
  ConnectPeerParams,
  DisconnectPeerParams,
  FiberNodeClient,
  FiberWasmPageNode,
  GraphChannelsParams,
  GraphNodesParams,
  ListChannelsParams,
  ListPaymentsParams,
  OpenChannelParams,
  RpcObject,
  ShutdownChannelParams
} from "./fiber-client";
import { browser } from "wxt/browser";
import { bridgeMessageSchema } from "../schemas/messages";

const wasmRpcMethods = {
  nodeInfo: "node_info",
  listPeers: "list_peers",
  listChannels: "list_channels",
  listPayments: "list_payments",
  graphNodes: "graph_nodes",
  graphChannels: "graph_channels",
  openChannel: "open_channel",
  acceptChannel: "accept_channel",
  shutdownChannel: "shutdown_channel",
  connectPeer: "connect_peer",
  disconnectPeer: "disconnect_peer",
  sendPayment: "send_payment",
  newInvoice: "new_invoice",
  getPayment: "get_payment",
  parseInvoice: "parse_invoice",
  getInvoice: "get_invoice",
  cancelInvoice: "cancel_invoice",
  settleInvoice: "settle_invoice",
  sendBtc: "send_btc",
  receiveBtc: "receive_btc",
  getCchOrder: "get_cch_order"
} as const;

export class FiberWebClient implements FiberNodeClient<FiberWasmPageNode> {
  async nodeInfo(node: FiberWasmPageNode): Promise<unknown> {
    return callWasmRpc(node, wasmRpcMethods.nodeInfo);
  }

  async listPeers(node: FiberWasmPageNode): Promise<unknown> {
    return callWasmRpc(node, wasmRpcMethods.listPeers);
  }

  async listChannels(node: FiberWasmPageNode, params?: ListChannelsParams): Promise<unknown> {
    return callWasmRpc(node, wasmRpcMethods.listChannels, [params ?? defaultListChannelsParams]);
  }

  async listPayments(node: FiberWasmPageNode, params?: ListPaymentsParams): Promise<unknown> {
    return callWasmRpc(node, wasmRpcMethods.listPayments, [params ?? defaultListPaymentsParams]);
  }

  async graphNodes(node: FiberWasmPageNode, params?: GraphNodesParams): Promise<unknown> {
    return callWasmRpc(node, wasmRpcMethods.graphNodes, [params ?? defaultGraphParams]);
  }

  async graphChannels(node: FiberWasmPageNode, params?: GraphChannelsParams): Promise<unknown> {
    return callWasmRpc(node, wasmRpcMethods.graphChannels, [params ?? defaultGraphParams]);
  }

  async openChannel(node: FiberWasmPageNode, params: OpenChannelParams): Promise<unknown> {
    return callWasmRpc(node, wasmRpcMethods.openChannel, [params]);
  }

  async acceptChannel(node: FiberWasmPageNode, params: AcceptChannelParams): Promise<unknown> {
    return callWasmRpc(node, wasmRpcMethods.acceptChannel, [params]);
  }

  async shutdownChannel(node: FiberWasmPageNode, params: ShutdownChannelParams): Promise<void> {
    await callWasmRpc(node, wasmRpcMethods.shutdownChannel, [params]);
  }

  async connectPeer(node: FiberWasmPageNode, params: ConnectPeerParams): Promise<void> {
    await callWasmRpc(node, wasmRpcMethods.connectPeer, [params]);
  }

  async disconnectPeer(node: FiberWasmPageNode, params: DisconnectPeerParams): Promise<void> {
    await callWasmRpc(node, wasmRpcMethods.disconnectPeer, [params]);
  }

  async sendPayment(node: FiberWasmPageNode, params: RpcObject): Promise<unknown> {
    return callWasmRpc(node, wasmRpcMethods.sendPayment, [params]);
  }

  async newInvoice(node: FiberWasmPageNode, params: RpcObject): Promise<unknown> {
    return callWasmRpc(node, wasmRpcMethods.newInvoice, [params]);
  }

  async getPayment(node: FiberWasmPageNode, params: RpcObject): Promise<unknown> {
    return callWasmRpc(node, wasmRpcMethods.getPayment, [params]);
  }

  async parseInvoice(node: FiberWasmPageNode, params: RpcObject): Promise<unknown> {
    return callWasmRpc(node, wasmRpcMethods.parseInvoice, [params]);
  }

  async getInvoice(node: FiberWasmPageNode, params: RpcObject): Promise<unknown> {
    return callWasmRpc(node, wasmRpcMethods.getInvoice, [params]);
  }

  async cancelInvoice(node: FiberWasmPageNode, params: RpcObject): Promise<unknown> {
    return callWasmRpc(node, wasmRpcMethods.cancelInvoice, [params]);
  }

  async settleInvoice(node: FiberWasmPageNode, params: RpcObject): Promise<unknown> {
    return callWasmRpc(node, wasmRpcMethods.settleInvoice, [params]);
  }

  async sendBtc(node: FiberWasmPageNode, params: RpcObject): Promise<unknown> {
    return callWasmRpc(node, wasmRpcMethods.sendBtc, [params]);
  }

  async receiveBtc(node: FiberWasmPageNode, params: RpcObject): Promise<unknown> {
    return callWasmRpc(node, wasmRpcMethods.receiveBtc, [params]);
  }

  async getCchOrder(node: FiberWasmPageNode, params: RpcObject): Promise<unknown> {
    return callWasmRpc(node, wasmRpcMethods.getCchOrder, [params]);
  }
}

const defaultMountPoint = "window.fiber";

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

async function callWasmRpc(node: FiberWasmPageNode, method: string, params: unknown[] = []): Promise<unknown> {
  const requestId = `${Date.now()}-${method}-${Math.random().toString(16).slice(2)}`;
  const response = await browser.runtime.sendMessage({
    type: "fiber-manager:wasm-rpc-request",
    requestId,
    targetPageUrl: node.targetPageUrl,
    mountPoint: node.mountPoint ?? defaultMountPoint,
    method,
    params
  });

  const parsed = bridgeMessageSchema.safeParse(response);
  if (!parsed.success || parsed.data.type !== "fiber-manager:wasm-rpc-response") {
    throw new Error("Unexpected WASM RPC response");
  }
  if (parsed.data.requestId !== requestId) {
    throw new Error("Mismatched WASM RPC response");
  }
  if (parsed.data.error) {
    throw new Error(parsed.data.error);
  }

  return parsed.data.result;
}
