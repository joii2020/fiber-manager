import { z } from "zod";

export const bridgeMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("fiber-manager:bridge-ready"),
    bridgeVersion: z.string().min(1)
  }),
  z.object({
    type: z.literal("fiber-manager:page-request"),
    requestId: z.string().min(1),
    method: z.string().min(1),
    params: z.unknown().optional()
  }),
  z.object({
    type: z.literal("fiber-manager:background-response"),
    requestId: z.string().min(1),
    result: z.unknown().optional(),
    error: z.string().optional()
  }),
  z.object({
    type: z.literal("fiber-manager:scan-wasm-pages"),
    mountPoint: z.string().min(1)
  }),
  z.object({
    type: z.literal("fiber-manager:scan-wasm-pages-response"),
    pages: z.array(
      z.object({
        tabId: z.number().int(),
        title: z.string(),
        url: z.string().url(),
        mountPoint: z.string(),
        hasValidMount: z.boolean(),
        hasFiberDatabase: z.boolean(),
        databaseNames: z.array(z.string())
      })
    ),
    error: z.string().optional()
  }),
  z.object({
    type: z.literal("fiber-manager:wasm-rpc-request"),
    requestId: z.string().min(1),
    targetPageUrl: z.string().url(),
    mountPoint: z.string().min(1),
    method: z.string().min(1),
    params: z.array(z.unknown()).optional()
  }),
  z.object({
    type: z.literal("fiber-manager:wasm-rpc-response"),
    requestId: z.string().min(1),
    result: z.unknown().optional(),
    error: z.string().optional()
  })
]);

export type BridgeMessage = z.infer<typeof bridgeMessageSchema>;
