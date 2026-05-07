import type { ManagedNode } from "../schemas/managed-node";

export type FiberRpcNode = Extract<ManagedNode, { source: "fiber-rpc" }>;
export type FiberWasmPageNode = Extract<ManagedNode, { source: "fiber-wasm-page" }>;

export interface FiberNodeClient<N extends ManagedNode = ManagedNode> {
  nodeInfo(node: N): Promise<unknown>;
  listPeers(node: N): Promise<unknown>;
  listChannels(node: N, params?: ListChannelsParams): Promise<unknown>;
  listPayments(node: N, params?: ListPaymentsParams): Promise<unknown>;
  graphNodes(node: N, params?: GraphNodesParams): Promise<unknown>;
  graphChannels(node: N, params?: GraphChannelsParams): Promise<unknown>;
  openChannel(node: N, params: OpenChannelParams): Promise<unknown>;
  acceptChannel(node: N, params: AcceptChannelParams): Promise<unknown>;
  shutdownChannel(node: N, params: ShutdownChannelParams): Promise<void>;
  connectPeer(node: N, params: ConnectPeerParams): Promise<void>;
  disconnectPeer(node: N, params: DisconnectPeerParams): Promise<void>;
  sendPayment(node: N, params: RpcObject): Promise<unknown>;
  newInvoice(node: N, params: RpcObject): Promise<unknown>;
  getPayment(node: N, params: RpcObject): Promise<unknown>;
  parseInvoice(node: N, params: RpcObject): Promise<unknown>;
  getInvoice(node: N, params: RpcObject): Promise<unknown>;
  cancelInvoice(node: N, params: RpcObject): Promise<unknown>;
  settleInvoice(node: N, params: RpcObject): Promise<unknown>;
  sendBtc(node: N, params: RpcObject): Promise<unknown>;
  receiveBtc(node: N, params: RpcObject): Promise<unknown>;
  getCchOrder(node: N, params: RpcObject): Promise<unknown>;
}

export type RpcObject = Record<string, unknown>;

export type Script = {
  code_hash: string;
  hash_type: "data" | "type" | "data1" | "data2";
  args: string;
};

export type OpenChannelParams = {
  pubkey: string;
  funding_amount: string;
  public?: boolean;
  one_way?: boolean;
  funding_udt_type_script?: Script;
  shutdown_script?: Script;
  commitment_delay_epoch?: string;
  commitment_fee_rate?: string;
  funding_fee_rate?: string;
  tlc_expiry_delta?: string;
  tlc_min_value?: string;
  tlc_fee_proportional_millionths?: string;
  max_tlc_value_in_flight?: string;
  max_tlc_number_in_flight?: string;
};

export type AcceptChannelParams = {
  temporary_channel_id: string;
  funding_amount: string;
  shutdown_script?: Script;
  max_tlc_value_in_flight?: string;
  max_tlc_number_in_flight?: string;
  tlc_min_value?: string;
  tlc_fee_proportional_millionths?: string;
  tlc_expiry_delta?: string;
};

export type ShutdownChannelParams = {
  channel_id: string;
  close_script?: Script;
  fee_rate?: string;
  force?: boolean;
};

export type ConnectPeerParams = {
  address?: string;
  pubkey?: string;
  save?: boolean;
  addr_type?: "tcp" | "ws" | "wss";
};

export type DisconnectPeerParams = {
  pubkey: string;
};

export type ListChannelsParams = {
  pubkey?: string | null;
  include_closed?: boolean | null;
  only_pending?: boolean | null;
};

export type ListPaymentsParams = {
  status?: string | null;
  limit?: string | number | null;
  after?: string | null;
};

export type GraphNodesParams = {
  limit?: string | number | null;
  after?: string | null;
};

export type GraphChannelsParams = {
  limit?: string | number | null;
  after?: string | null;
};
